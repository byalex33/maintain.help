import { beforeEach, expect, it, vi } from "vitest";
import { makeRawRepository } from "./fixtures/rawRepository";

const mocks = vi.hoisted(() => ({ first: vi.fn(), many: vi.fn(), release: vi.fn(), raw: vi.fn(), txRaw: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(), fetch: vi.fn(), persist: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { repositoryAnalysisLease: { deleteMany: mocks.release }, repository: { findFirst: mocks.first, updateMany: mocks.updateMany }, $queryRaw: mocks.raw, $transaction: mocks.transaction } }));
vi.mock("@/lib/github/fetchRepositoryData", () => ({ fetchRepositoryData: mocks.fetch }));
vi.mock("@/lib/detection/persist", () => ({ persistRepositoryAnalysis: mocks.persist }));

import { ingestRepository, RepositoryAnalysisBusyError } from "@/lib/ingest";
import { GitHubNotFoundError, GitHubPrivateRepositoryError } from "@/lib/github/client";

const listing = { id: "repo", githubId: BigInt(1), isIndexed: true, isLocked: false, lastAnalyzedAt: null, analysisFailureCount: 0, maintainerRequests: [] };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.first.mockResolvedValue(listing);
  mocks.many.mockResolvedValue([listing]);
  mocks.raw.mockResolvedValue([{ key: "acme/widget" }]);
  mocks.txRaw.mockResolvedValue([{ key: "acme/widget" }]);
  mocks.fetch.mockResolvedValue(makeRawRepository());
  mocks.upsert.mockImplementation(async ({ update }) => ({ id: "repo", ...update }));
  mocks.transaction.mockImplementation(async (callback) => callback({
    $queryRaw: mocks.txRaw,
    repository: { findMany: mocks.many, upsert: mocks.upsert, updateMany: mocks.updateMany },
  }));
});

it("reuses a recent successful analysis without spending GitHub quota", async () => {
  const fresh = { ...listing, lastAnalyzedAt: new Date() };
  mocks.first.mockResolvedValue(fresh);
  expect(await ingestRepository("acme", "widget")).toBe(fresh);
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.raw).not.toHaveBeenCalled();
});

it("stops duplicate new-repository requests before fetching GitHub", async () => {
  mocks.first.mockResolvedValue(null);
  mocks.raw.mockResolvedValue([]);
  await expect(ingestRepository("Acme", "Widget")).rejects.toBeInstanceOf(RepositoryAnalysisBusyError);
  expect(mocks.raw.mock.calls[0]).toContain("acme/widget");
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("records the authenticated submitter even when reusing a recent analysis", async () => {
  mocks.first.mockResolvedValue({ ...listing, lastAnalyzedAt: new Date(), submittedById: null });
  await ingestRepository("acme", "widget", { submittedById: "user" });
  expect(mocks.updateMany).toHaveBeenCalledWith({
    where: { id: "repo", submittedById: null, isIndexed: true, isLocked: false }, data: { submittedById: "user" },
  });
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("rechecks freshness after acquiring the lease", async () => {
  mocks.first.mockResolvedValueOnce(listing).mockResolvedValueOnce({ ...listing, lastAnalyzedAt: new Date() });
  await ingestRepository("acme", "widget");
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("reads the latest maintainer request after taking the row lock", async () => {
  mocks.many.mockResolvedValueOnce([{
    ...listing, maintainerRequests: [{ status: "NEED_MAINTAINER", message: "Please help" }],
  }]);
  const saved = await ingestRepository("acme", "widget");
  expect(saved).toMatchObject({ status: "SEEKING_MAINTAINERS", statusVerified: true, analysisFailureCount: 0 });
  expect(mocks.txRaw.mock.calls[1][0].join("")).toContain('FROM "Repository"');
  expect(mocks.txRaw.mock.invocationCallOrder[1]).toBeLessThan(mocks.many.mock.invocationCallOrder[0]);
});

it("does not let an expired worker persist over its replacement", async () => {
  mocks.txRaw.mockResolvedValueOnce([]);
  await expect(ingestRepository("acme", "widget")).rejects.toBeInstanceOf(RepositoryAnalysisBusyError);
  expect(mocks.upsert).not.toHaveBeenCalled();
  expect(mocks.updateMany).not.toHaveBeenCalled();
});

it.each([[0, 1], [1, 2], [8, 24]])("backs off failed analyses (%i failures → %i hours)", async (failures, hours) => {
  mocks.first.mockResolvedValue({ ...listing, analysisFailureCount: failures });
  mocks.fetch.mockRejectedValue(new GitHubNotFoundError("acme", "widget"));
  const before = Date.now();
  await expect(ingestRepository("acme", "widget")).rejects.toThrow("not found");
  const data = mocks.updateMany.mock.calls[0][0].data;
  expect(data).toMatchObject({ availability: "UNAVAILABLE", analysisFailureCount: { increment: 1 } });
  expect(data.nextAnalysisAt.getTime()).toBeGreaterThanOrEqual(before + hours * 3_600_000);
  expect(data.nextAnalysisAt.getTime()).toBeLessThanOrEqual(Date.now() + hours * 3_600_000);
});

it("honours the failed-analysis retry schedule for manual submissions too", async () => {
  mocks.first.mockResolvedValue({ ...listing, analysisError: "unavailable", nextAnalysisAt: new Date(Date.now() + 3_600_000) });
  await expect(ingestRepository("acme", "widget")).rejects.toBeInstanceOf(RepositoryAnalysisBusyError);
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("marks private listings unavailable for public display and never persists their contents", async () => {
  mocks.fetch.mockRejectedValue(new GitHubPrivateRepositoryError("acme", "widget"));
  await expect(ingestRepository("acme", "widget")).rejects.toThrow("private");
  expect(mocks.updateMany.mock.calls[0][0].data.availability).toBe("PRIVATE");
  expect(mocks.persist).not.toHaveBeenCalled();
});

it.each(["success", "failure", "moderation"])("releases only its own lease after %s", async (outcome) => {
  if (outcome === "failure") mocks.fetch.mockRejectedValue(new Error("GitHub unavailable"));
  if (outcome === "moderation") mocks.first.mockResolvedValueOnce(listing).mockResolvedValueOnce({ ...listing, isLocked: true });
  await ingestRepository("acme", "widget").catch(() => undefined);
  expect(mocks.release).toHaveBeenCalledExactlyOnceWith({ where: { key: "acme/widget", token: mocks.raw.mock.calls[0][2] } });
});

it("hides a replaced listing without transferring claims or writing replacement data", async () => {
  mocks.many.mockResolvedValue([{ ...listing, githubId: BigInt(999) }]);
  await expect(ingestRepository("acme", "widget")).rejects.toThrow("different GitHub repository");
  expect(mocks.updateMany).toHaveBeenCalledWith({
    where: { id: "repo", isIndexed: true, isLocked: false },
    data: expect.objectContaining({ isIndexed: false, availability: "UNAVAILABLE", nextAnalysisAt: null }),
  });
  expect(mocks.upsert).not.toHaveBeenCalled();
  expect(mocks.persist).not.toHaveBeenCalled();
});
