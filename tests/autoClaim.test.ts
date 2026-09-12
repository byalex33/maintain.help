import { beforeEach, expect, it, vi } from "vitest";
import { makeRawRepository } from "./fixtures/rawRepository";

const mocks = vi.hoisted(() => ({ find: vi.fn(), many: vi.fn(), query: vi.fn(), save: vi.fn(), claim: vi.fn(), reconcile: vi.fn(), fetch: vi.fn(), persist: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  repository: { findFirst: mocks.find, updateMany: vi.fn() },
  $queryRaw: mocks.query,
  repositoryAnalysisLease: { deleteMany: vi.fn() },
  $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({
    $queryRaw: mocks.query,
    repository: { findMany: mocks.many, upsert: mocks.save, updateMany: vi.fn() }, repositoryMaintainer: { upsert: mocks.claim, updateMany: mocks.reconcile },
  }),
} }));
vi.mock("@/lib/github/fetchRepositoryData", () => ({ fetchRepositoryData: mocks.fetch }));
vi.mock("@/lib/detection/persist", () => ({ persistRepositoryAnalysis: mocks.persist }));
import { ingestRepository } from "@/lib/ingest";

const raw = makeRawRepository();
const verifiedMaintainer = { githubId: raw.githubId, userId: "user", githubLogin: "alice" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.find.mockResolvedValue(null);
  mocks.many.mockResolvedValue([]);
  mocks.query.mockResolvedValue([{ key: "lease" }]);
  mocks.fetch.mockResolvedValue(raw);
  mocks.save.mockResolvedValue({ id: "repo" });
});

it("claims new and existing repositories in the ingestion transaction without inventing a maintainer statement", async () => {
  for (const existing of [null, { id: "repo", githubId: BigInt(raw.githubId), isIndexed: true, isLocked: false, maintainerRequests: [] }, { id: "repo", githubId: BigInt(raw.githubId), isIndexed: true, isLocked: false, maintainerRequests: [], lastAnalyzedAt: new Date() }]) {
    mocks.find.mockResolvedValue(existing);
    mocks.many.mockResolvedValue(existing ? [existing] : []);
    await ingestRepository(raw.owner, raw.name, { submittedById: "user", verifiedMaintainer });
    expect(mocks.claim).toHaveBeenLastCalledWith({
      where: { repositoryId_githubLogin: { repositoryId: "repo", githubLogin: "alice" } },
      create: { repositoryId: "repo", githubLogin: "alice", userId: "user", role: "maintainer", verifiedAt: expect.any(Date), isActive: true },
      update: { userId: "user", verifiedAt: expect.any(Date) },
    });
    expect(mocks.save.mock.lastCall?.[0].create.statusVerified).toBe(false);
  }
});

it("does not claim repositories during discovery or scheduled analysis", async () => {
  await ingestRepository(raw.owner, raw.name);
  expect(mocks.claim).not.toHaveBeenCalled();
});

it("rejects a repository replaced between permission verification and analysis", async () => {
  await expect(ingestRepository(raw.owner, raw.name, { verifiedMaintainer: { ...verifiedMaintainer, githubId: raw.githubId + 1 } })).rejects.toThrow("repository changed");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.claim).not.toHaveBeenCalled();
});

it("does not claim moderated repositories", async () => {
  mocks.find.mockResolvedValue({ isIndexed: true, isLocked: true });
  await expect(ingestRepository(raw.owner, raw.name, { verifiedMaintainer })).rejects.toThrow("moderator");
  expect(mocks.claim).not.toHaveBeenCalled();
});

it("does not report a successful add if saving the claim fails", async () => {
  mocks.claim.mockRejectedValue(new Error("database failure"));
  await expect(ingestRepository(raw.owner, raw.name, { verifiedMaintainer })).rejects.toThrow("database failure");
});


it("reconciles renamed claimants using the stable local user ID", async () => {
  const old = { repositoryId: "repo", userId: "user" as string | null, githubLogin: "old-login", verifiedAt: new Date() as Date | null };
  mocks.reconcile.mockImplementation(async ({ where, data }) => {
    expect(where).toEqual({ repositoryId: "repo", userId: "user", githubLogin: { not: "alice" } });
    Object.assign(old, data);
  });
  await ingestRepository(raw.owner, raw.name, { verifiedMaintainer });
  expect(old).toMatchObject({ userId: null, verifiedAt: null });
  expect(mocks.reconcile.mock.invocationCallOrder[0]).toBeLessThan(mocks.claim.mock.invocationCallOrder[0]);
  expect(mocks.claim.mock.lastCall?.[0].update.userId).toBe("user");
});
