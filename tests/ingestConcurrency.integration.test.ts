import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { describe, expect, it } from "vitest";

// Run explicitly with TEST_DATABASE_URL against a migrated disposable PostgreSQL database.
const connectionString = process.env.TEST_DATABASE_URL;
const poolOptions = { connectionString, max: 3, connectionTimeoutMillis: 3_000, query_timeout: 3_000, statement_timeout: 3_000 };

async function concurrentSessions(skip: () => void) {
  const pool = new Pool(poolOptions);
  let first: PoolClient | undefined;
  let second: PoolClient | undefined;
  try {
    first = await pool.connect();
    const version = (await first.query<{ version: string }>("SELECT version()")).rows[0].version;
    if (/wasm|pglite|emscripten/i.test(version)) {
      console.info("Skipping concurrent-session checks: embedded PostgreSQL/WASM does not provide native multi-session locking.");
      skip();
    }
    second = await pool.connect();
    return { pool, first, second };
  } catch (error) {
    first?.release(true);
    second?.release(true);
    await pool.end();
    throw error;
  }
}

async function expectBlocked(pool: Pool, waitingPid: number, lockingPid: number) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const { rows } = await pool.query<{ blockers: number[] }>("SELECT pg_blocking_pids($1) AS blockers", [waitingPid]);
    if (rows[0].blockers.includes(lockingPid)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("The competing query did not block on the expected PostgreSQL lock.");
}

async function pid(client: PoolClient) {
  return (await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0].pid;
}

function acquireLease(client: PoolClient, key: string, token: string) {
  return client.query<{ key: string }>(`
    INSERT INTO "RepositoryAnalysisLease" (key, token, "expiresAt")
    VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
    ON CONFLICT (key) DO UPDATE SET token = EXCLUDED.token, "expiresAt" = EXCLUDED."expiresAt"
    WHERE "RepositoryAnalysisLease"."expiresAt" <= NOW()
    RETURNING key
  `, [key, token]);
}

describe.skipIf(!connectionString)("PostgreSQL ingestion concurrency", () => {
  it("executes lease acquisition, cooldown and token renewal in a rollback-only transaction", async () => {
    const pool = new Pool({ ...poolOptions, max: 1 });
    let client: PoolClient | undefined;
    const key = `integration/${randomUUID()}`;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      expect((await acquireLease(client, key, "first")).rowCount).toBe(1);
      expect((await acquireLease(client, key, "duplicate")).rowCount).toBe(0);
      await client.query('UPDATE "RepositoryAnalysisLease" SET "expiresAt" = NOW() - INTERVAL \'1 second\' WHERE key = $1', [key]);
      expect((await acquireLease(client, key, "replacement")).rowCount).toBe(1);
      expect((await client.query('SELECT key FROM "RepositoryAnalysisLease" WHERE key = $1 AND token = $2 FOR UPDATE', [key, "first"])).rowCount).toBe(0);
      await client.query("ROLLBACK");
      expect((await client.query('SELECT key FROM "RepositoryAnalysisLease" WHERE key = $1', [key])).rowCount).toBe(0);
    } finally {
      client?.release(true);
      await pool.end();
    }
  }, 15_000);

  it("admits one competing worker and rejects an expired worker's token after renewal", async ({ skip }) => {
    const { pool, first, second } = await concurrentSessions(skip);
    const key = `integration/${randomUUID()}`;
    try {
      await first.query("BEGIN");
      expect((await acquireLease(first, key, "first")).rowCount).toBe(1);
      const secondPid = await pid(second);
      const competing = acquireLease(second, key, "second");
      await expectBlocked(pool, secondPid, await pid(first));
      await first.query("COMMIT");
      expect((await competing).rowCount).toBe(0);

      await first.query('UPDATE "RepositoryAnalysisLease" SET "expiresAt" = NOW() - INTERVAL \'1 second\' WHERE key = $1', [key]);
      expect((await acquireLease(second, key, "replacement")).rowCount).toBe(1);
      const expired = await first.query(`
        SELECT key FROM "RepositoryAnalysisLease"
        WHERE key = $1 AND token = $2 AND "expiresAt" > NOW() FOR UPDATE
      `, [key, "first"]);
      expect(expired.rowCount).toBe(0);
      expect((await second.query('SELECT token FROM "RepositoryAnalysisLease" WHERE key = $1', [key])).rows[0].token).toBe("replacement");
    } finally {
      first.release(true);
      second.release(true);
      try {
        await pool.query('DELETE FROM "RepositoryAnalysisLease" WHERE key = $1', [key]);
      } finally {
        await pool.end();
      }
    }
  }, 20_000);

  it("blocks a refresh until the claim commits, then reads the latest maintainer override", async ({ skip }) => {
    const { pool, first: claim, second: refresh } = await concurrentSessions(skip);
    const id = `integration-${randomUUID()}`;
    const githubId = -Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    try {
      await claim.query('INSERT INTO "User" (id, "updatedAt") VALUES ($1, NOW())', [id]);
      await claim.query(`
        INSERT INTO "Repository" (id, "githubId", owner, name, "fullName", url, topics, "createdAtGithub", "updatedAt")
        VALUES ($1, $2, 'integration', $1, $1, 'https://example.invalid', '{}', NOW(), NOW())
      `, [id, githubId]);
      await claim.query("BEGIN");
      await claim.query('SELECT id FROM "Repository" WHERE id = $1 FOR UPDATE', [id]);
      await claim.query(`
        INSERT INTO "MaintainerRequest" (id, "repositoryId", "userId", status, "skillsWanted", "updatedAt")
        VALUES ($1, $1, $1, 'NEED_MAINTAINER', '{}', NOW())
      `, [id]);
      // Before the claim commits, the stale reader cannot see its request.
      expect((await refresh.query('SELECT status FROM "MaintainerRequest" WHERE "repositoryId" = $1', [id])).rowCount).toBe(0);
      await refresh.query("BEGIN");
      const refreshPid = await pid(refresh);
      const waiting = refresh.query('SELECT id FROM "Repository" WHERE "githubId" = $1 FOR UPDATE', [githubId]);
      await expectBlocked(pool, refreshPid, await pid(claim));
      await claim.query("COMMIT");
      await waiting;
      const override = await refresh.query('SELECT status FROM "MaintainerRequest" WHERE "repositoryId" = $1 AND "isActive" = true', [id]);
      expect(override.rows).toEqual([{ status: "NEED_MAINTAINER" }]);
      await refresh.query("ROLLBACK");
    } finally {
      claim.release(true);
      refresh.release(true);
      try {
        await pool.query('DELETE FROM "Repository" WHERE id = $1', [id]);
        await pool.query('DELETE FROM "User" WHERE id = $1', [id]);
      } finally {
        await pool.end();
      }
    }
  }, 20_000);
});
