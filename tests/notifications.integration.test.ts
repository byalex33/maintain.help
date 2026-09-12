import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { expect, it } from "vitest";

it.skipIf(!process.env.TEST_DATABASE_URL)("applies the notification migration and enforces per-recipient deduplication", async () => {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const schema = `notification_test_${randomUUID().replaceAll("-", "")}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    await client.query('CREATE TABLE "User" (id TEXT PRIMARY KEY); CREATE TABLE "Repository" (id TEXT PRIMARY KEY)');
    await client.query(readFileSync("prisma/migrations/20260912120000_repository_like_notifications/migration.sql", "utf8"));
    const index = await client.query('SELECT indexdef FROM pg_indexes WHERE schemaname = $1 AND indexname = $2', [schema, "RepositoryLikeNotification_recipientId_readAt_createdAt_id_idx"]);
    expect(index.rows[0].indexdef).toContain('(\"recipientId\", \"readAt\" NULLS FIRST, \"createdAt\" DESC, id DESC)');
    await client.query('INSERT INTO "User" VALUES ($1), ($2)', ["actor", "recipient"]);
    await client.query('INSERT INTO "Repository" VALUES ($1)', ["repo"]);
    const insert = 'INSERT INTO "RepositoryLikeNotification" (id, "actorId", "recipientId", "repositoryId") VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING';
    expect((await client.query(insert, ["n", "actor", "recipient", "repo"])).rowCount).toBe(1);
    expect((await client.query(insert, ["duplicate", "actor", "recipient", "repo"])).rowCount).toBe(0);
    expect((await client.query('UPDATE "RepositoryLikeNotification" SET "readAt" = NOW() WHERE "recipientId" = $1', ["actor"])).rowCount).toBe(0);
    expect((await client.query('UPDATE "RepositoryLikeNotification" SET "readAt" = NOW() WHERE "recipientId" = $1', ["recipient"])).rowCount).toBe(1);
    // A re-like cannot recreate an already-read notification.
    expect((await client.query(insert, ["relike", "actor", "recipient", "repo"])).rowCount).toBe(0);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
