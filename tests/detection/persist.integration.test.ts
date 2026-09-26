import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { persistRepositoryAnalysis } from "@/lib/detection/persist";
import { analyzeRepository } from "@/lib/detection/analyze";
import { makeRawRepository, makeContributor } from "../fixtures/rawRepository";

it.skipIf(!process.env.TEST_DATABASE_URL)("bulk refresh preserves claims, resets absent maintainers, and replaces inferred contributors", async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }) });
  const rollback = new Error("rollback contributor fixtures");
  const now = new Date("2026-09-12");
  try {
    await expect(db.$transaction(async (tx) => {
      const owner = `test-${randomUUID()}`;
      const repo = await tx.repository.create({ data: { owner, name: "repo", fullName: `${owner}/repo`, githubId: -BigInt(`0x${randomUUID().replaceAll("-", "").slice(0, 12)}`), url: `https://github.com/${owner}/repo`, topics: [], createdAtGithub: now } });
      const user = await tx.user.create({ data: {} });
      const claimed = await tx.repositoryMaintainer.create({ data: { repositoryId: repo.id, githubLogin: "alice", userId: user.id, role: "owner", verifiedAt: now, commitsLast365d: 99 } });
      await tx.repositoryMaintainer.createMany({ data: [
        { repositoryId: repo.id, githubLogin: "absent", verifiedAt: now, commitsLast365d: 99 },
        { repositoryId: repo.id, githubLogin: "old-inferred", commitsLast365d: 99 },
      ] });
      const raw = makeRawRepository({ contributorStats: [makeContributor("alice", [{ weeksAgo: 0, commits: 24 }], now),
        ...Array.from({ length: 100 }, (_, i) => makeContributor(`new-${i}`, [{ weeksAgo: 0, commits: i }], now)),
        makeContributor("dependabot[bot]", [{ weeksAgo: 0, commits: 10 }], now),
      ] });
      await persistRepositoryAnalysis(tx, repo.id, raw, analyzeRepository(raw, { now }), { now });
      const rows = await tx.repositoryMaintainer.findMany({ where: { repositoryId: repo.id } });
      expect(rows).toHaveLength(102);
      expect(rows.find((r) => r.githubLogin === "alice")).toMatchObject({ id: claimed.id, userId: user.id, role: "owner", verifiedAt: now, commitsLast365d: 24, isActive: true });
      expect(rows.find((r) => r.githubLogin === "absent")).toMatchObject({ verifiedAt: now, commitsLast365d: 0, isActive: false });
      expect(rows.find((r) => r.githubLogin === "new-0")).toMatchObject({ role: "maintainer", userId: null, verifiedAt: null, commitsLast365d: 0, isActive: false });
      expect(rows.find((r) => r.githubLogin === "new-99")).toMatchObject({ commitsLast365d: 99, isActive: true });
      throw rollback;
    }, { timeout: 10000 })).rejects.toBe(rollback);
  } finally { await db.$disconnect(); }
});
