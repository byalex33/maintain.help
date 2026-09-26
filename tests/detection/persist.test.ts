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

  };
  const table = () => ({ deleteMany: vi.fn(), createMany: vi.fn(), create: vi.fn() });
  const execute = vi.fn(async (_query, repositoryId, payload) => {
    const [contributor] = JSON.parse(payload);
    expect(repositoryId).toBe("repo");
    Object.assign(verified, { commitsLast365d: contributor.commitsLast365d, isActive: contributor.commitsLast365d > 0 });
  });
  const db = { $executeRaw: execute, repositoryMaintainer: maintainer, repositoryHelpCategory: table(), repositoryEvidence: table(), gitHubIssue: table(), repositoryMetricSnapshot: table(), repositoryStatus: table() };
  const now = new Date("2026-09-08");
  const raw = makeRawRepository({ contributorStats: [makeContributor("alice", [{ weeksAgo: 0, commits: 12 }, { weeksAgo: 1, commits: 12 }], now)] });
  await persistRepositoryAnalysis(db as unknown as Parameters<typeof persistRepositoryAnalysis>[0], "repo", raw, analyzeRepository(raw, { now }), { now });
  expect(verified).toMatchObject({ userId: "user", role: "owner", verifiedAt: expect.any(Date), commitsLast365d: 24, isActive: true });
  expect(execute).toHaveBeenCalledOnce();
  expect(JSON.parse(execute.mock.calls[0][2])[0]).not.toHaveProperty("userId");
});


it("batches a full contributor sample into one database write", async () => {
  const execute = vi.fn();
  const table = () => ({ deleteMany: vi.fn(), updateMany: vi.fn(), createMany: vi.fn(), create: vi.fn() });
  const db = { $executeRaw: execute, repositoryMaintainer: table(), repositoryHelpCategory: table(), repositoryEvidence: table(), gitHubIssue: table(), repositoryMetricSnapshot: table(), repositoryStatus: table() };
  const now = new Date("2026-09-12");
  const raw = makeRawRepository({ contributorStats: [
    ...Array.from({ length: 100 }, (_, i) => makeContributor(`person-${i}`, [{ weeksAgo: 0, commits: i }], now)),
    makeContributor("dependabot[bot]", [{ weeksAgo: 0, commits: 500 }], now),
  ] });
  await persistRepositoryAnalysis(db as unknown as Parameters<typeof persistRepositoryAnalysis>[0], "repo", raw, analyzeRepository(raw, { now }), { now });
  expect(execute).toHaveBeenCalledOnce();
  const contributors = JSON.parse(execute.mock.calls[0][2]);
  expect(contributors).toHaveLength(100);
  expect(contributors[99]).toMatchObject({ githubLogin: "person-99", commitsLast365d: 99 });
});
