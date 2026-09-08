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
    upsert: vi.fn(async ({ update }) => Object.assign(verified, update)),
  };
  const table = () => ({ deleteMany: vi.fn(), createMany: vi.fn(), create: vi.fn() });
  const db = { repositoryMaintainer: maintainer, repositoryHelpCategory: table(), repositoryEvidence: table(), gitHubIssue: table(), repositoryMetricSnapshot: table(), repositoryStatus: table() };
  const now = new Date("2026-09-08");
  const raw = makeRawRepository({ contributorStats: [makeContributor("alice", [{ weeksAgo: 0, commits: 12 }, { weeksAgo: 1, commits: 12 }], now)] });
  await persistRepositoryAnalysis(db as unknown as Parameters<typeof persistRepositoryAnalysis>[0], "repo", raw, analyzeRepository(raw, { now }), { now });
  expect(verified).toMatchObject({ userId: "user", role: "owner", verifiedAt: expect.any(Date), commitsLast365d: 24, isActive: true });
  expect(maintainer.upsert.mock.calls[0][0].update).not.toHaveProperty("userId");
});
