import { expect, it, vi } from "vitest";
import { persistRepositoryAnalysis } from "@/lib/detection/persist";
import { analyzeRepository } from "@/lib/detection/analyze";
import { makeRawRepository, makeContributor } from "../fixtures/rawRepository";

it("retains claimed identity and verification while refreshing contribution statistics", async () => {
  const verified = { repositoryId: "repo", githubLogin: "alice", userId: "user", verifiedAt: new Date(), role: "owner", commitsLast365d: 99, isActive: true };
  const maintainer = {
    deleteMany: vi.fn(async ({ where }) => {
      expect(where).toEqual({ repositoryId: "repo", userId: null, verifiedAt: null });
    }),
    updateMany: vi.fn(async ({ data }) => Object.assign(verified, data)),
    createMany: vi.fn(),
  };
  const table = () => ({ deleteMany: vi.fn(), createMany: vi.fn(), create: vi.fn() });
  const execute = vi.fn(async (sql: TemplateStringsArray, payload: string, repositoryId: string) => {
    expect(repositoryId).toBe("repo");
    expect(sql.join("?")).not.toMatch(/userId|verifiedAt|role/);
    const stats = JSON.parse(payload).find((row: { githubLogin: string }) => row.githubLogin === verified.githubLogin);
    if (stats) Object.assign(verified, stats);
  });
  const db = { $executeRaw: execute, repositoryMaintainer: maintainer, repositoryHelpCategory: table(), repositoryEvidence: table(), gitHubIssue: table(), repositoryMetricSnapshot: table(), repositoryStatus: table() };
  const now = new Date("2026-09-08");
  const raw = makeRawRepository({ contributorStats: [makeContributor("alice", [{ weeksAgo: 0, commits: 12 }, { weeksAgo: 1, commits: 12 }], now)] });
  await persistRepositoryAnalysis(db as unknown as Parameters<typeof persistRepositoryAnalysis>[0], "repo", raw, analyzeRepository(raw, { now }), { now });
  expect(verified).toMatchObject({ userId: "user", role: "owner", verifiedAt: expect.any(Date), commitsLast365d: 24, isActive: true });
  expect(maintainer.createMany).toHaveBeenCalledWith({
    data: [{ repositoryId: "repo", githubLogin: "alice", role: "maintainer", commitsLast365d: 24, isActive: true }],
    skipDuplicates: true,
  });
  expect(execute).toHaveBeenCalledTimes(1);
});


it("batches contribution refreshes for large repositories", async () => {
  const table = () => ({ deleteMany: vi.fn(), createMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() });
  const db = { $executeRaw: vi.fn(), repositoryMaintainer: table(), repositoryHelpCategory: table(), repositoryEvidence: table(), gitHubIssue: table(), repositoryMetricSnapshot: table(), repositoryStatus: table() };
  const raw = makeRawRepository({ contributorStats: Array.from({ length: 1000 }, (_, i) => makeContributor(`user${i}`, [{ weeksAgo: 0, commits: 1 }])) });
  await persistRepositoryAnalysis(db as unknown as Parameters<typeof persistRepositoryAnalysis>[0], "repo", raw, analyzeRepository(raw));
  expect(db.repositoryMaintainer.createMany).toHaveBeenCalledTimes(1);
  expect(db.repositoryMaintainer.createMany.mock.calls[0][0].data).toHaveLength(1000);
  expect(db.$executeRaw).toHaveBeenCalledTimes(1);
});
