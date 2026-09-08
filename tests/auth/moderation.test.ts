import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ many: vi.fn(), release: vi.fn(), raw: vi.fn(), auth: vi.fn(), admin: vi.fn(), find: vi.fn(), first: vi.fn(), update: vi.fn(), updateMany: vi.fn(), transaction: vi.fn(), resolve: vi.fn(), fetch: vi.fn(), token: vi.fn(), permission: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth, isAdminLogin: mocks.admin, getGitHubAccessToken: mocks.token }));
vi.mock("@/lib/github/permissions", () => ({ checkClaimPermission: mocks.permission }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { repositoryAnalysisLease: { deleteMany: mocks.release }, $queryRaw: mocks.raw, $transaction: mocks.transaction, repository: { findUnique: mocks.find, findFirst: mocks.first, update: mocks.update }, repositoryFeedback: { updateMany: mocks.resolve } } }));
vi.mock("@/lib/github/fetchRepositoryData", () => ({ fetchRepositoryData: mocks.fetch }));

import { moderateRepository, resolveReport } from "@/app/admin/actions";
import { ingestRepository } from "@/lib/ingest";
import { getRepositoryDetail } from "@/lib/queries/repositories";
import { submitMaintainerRequest } from "@/app/[owner]/[repo]/claim/actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { githubLogin: "admin" } });
  mocks.admin.mockReturnValue(true);
  mocks.find.mockResolvedValue({ fullName: "owner/repo" });
  mocks.raw.mockResolvedValue([{ key: "owner/repo" }]);
  mocks.transaction.mockImplementation(async (callback) => callback({ $queryRaw: mocks.raw, repository: { findMany: mocks.many, updateMany: mocks.updateMany, update: mocks.update } }));
});

function moderate(intent: string, confirmation = "") {
  const form = new FormData();
  form.set("intent", intent);
  form.set("confirmation", confirmation);
  return moderateRepository("repository", { error: null }, form);
}

it("denies moderation and resolving reports to non-admins", async () => {
  mocks.admin.mockReturnValue(false);
  expect(await moderate("delete", "owner/repo")).toHaveProperty("error", "Admin access is required.");
  expect(await moderate("feature")).toHaveProperty("error", "Admin access is required.");
  expect(mocks.transaction).not.toHaveBeenCalled();
  await resolveReport("repository", "report");
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.resolve).not.toHaveBeenCalled();
});

it("requires confirmation and hides deleted repositories without destroying them", async () => {
  await moderate("delete", "wrong/repo");
  expect(mocks.update).not.toHaveBeenCalled();
  expect(await moderate("delete", "owner/repo")).toEqual({ error: null });
  expect(mocks.update).toHaveBeenCalledWith({ where: { id: "repository" }, data: { isIndexed: false, isFeatured: false, nextAnalysisAt: null } });
});

it("replaces the homepage feature in a transaction and only selects visible listings", async () => {
  expect(await moderate("feature")).toEqual({ error: null });
  expect(mocks.transaction).toHaveBeenCalledOnce();
  expect(mocks.updateMany).toHaveBeenCalledWith({ where: { isFeatured: true }, data: { isFeatured: false } });
  expect(mocks.update).toHaveBeenCalledWith({ where: { id: "repository", isIndexed: true }, data: { isFeatured: true } });
  expect(mocks.updateMany.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
  await moderate("unfeature");
  expect(mocks.update).toHaveBeenLastCalledWith({ where: { id: "repository" }, data: { isFeatured: false } });
});

it("reports failed feature changes as retryable errors", async () => {
  mocks.transaction.mockRejectedValue(new Error("Removed repository"));
  expect(await moderate("feature")).toEqual({ error: "The change could not be saved. Please try again." });
});

it("locks, unlocks and restores listings explicitly", async () => {
  await moderate("lock");
  expect(mocks.update).toHaveBeenLastCalledWith({ where: { id: "repository" }, data: { isLocked: true, nextAnalysisAt: null } });
  await moderate("unlock");
  expect(mocks.update).toHaveBeenLastCalledWith({ where: { id: "repository" }, data: { isLocked: false, nextAnalysisAt: expect.any(Date) } });
  await moderate("restore");
  expect(mocks.update).toHaveBeenLastCalledWith({ where: { id: "repository" }, data: { isIndexed: true, nextAnalysisAt: expect.any(Date) } });
});

it.each([{ isIndexed: false, isLocked: false }, { isIndexed: true, isLocked: true }])("blocks imports before fetching GitHub for moderated listings (%j)", async (repository) => {
  mocks.first.mockResolvedValue(repository);
  await expect(ingestRepository("owner", "repo")).rejects.toThrow("deleted or locked");
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("also blocks a removed repository when GitHub returns a new name for its numeric ID", async () => {
  mocks.first.mockResolvedValue(null);
  mocks.many.mockResolvedValue([{ githubId: BigInt(123), isIndexed: false, isLocked: false }]);
  mocks.fetch.mockResolvedValue({ githubId: 123, fullName: "new-owner/repo" });
  await expect(ingestRepository("new-owner", "repo")).rejects.toThrow("deleted or locked");
  expect(mocks.many.mock.calls[0][0].where.OR).toContainEqual({ githubId: BigInt(123) });
});

it("rejects maintainer claims on a locked listing even with GitHub permissions", async () => {
  mocks.token.mockResolvedValue("token");
  mocks.permission.mockResolvedValue({ eligible: true });
  mocks.find.mockResolvedValue({ isIndexed: true, isLocked: true });
  const form = new FormData();
  form.set("status", "NEED_MAINTAINER");
  expect(await submitMaintainerRequest("owner", "repo", { error: null }, form)).toHaveProperty("error", expect.stringContaining("locked"));
  expect(mocks.update).not.toHaveBeenCalled();
});

it("hides deleted detail pages by default and scopes report resolution to its repository", async () => {
  await getRepositoryDetail("owner", "repo");
  expect(mocks.find.mock.calls[0][0].where).toEqual({ fullName: "owner/repo", isIndexed: true, availability: "AVAILABLE" });
  await getRepositoryDetail("owner", "repo", true);
  expect(mocks.find.mock.calls[1][0].where).toEqual({ fullName: "owner/repo" });
  await resolveReport("repository", "report");
  expect(mocks.resolve).toHaveBeenCalledWith({ where: { id: "report", repositoryId: "repository", resolvedAt: null }, data: { resolvedAt: expect.any(Date) } });
});
