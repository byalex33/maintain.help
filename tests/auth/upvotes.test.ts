import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), auth: vi.fn(), repository: vi.fn(), create: vi.fn(), remove: vi.fn(), revalidate: vi.fn(), maintainers: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/db", () => ({ db: {
  $transaction: mocks.transaction,
} }));

import { setRepositoryUpvoted } from "@/app/upvotes/actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "local-user" } });
  mocks.repository.mockResolvedValue([{ owner: "owner", name: "repo" }]);
  mocks.create.mockResolvedValue({ count: 1 });
  mocks.maintainers.mockResolvedValue([{ userId: "maintainer" }, { userId: "maintainer" }, { userId: null }]);
  mocks.transaction.mockImplementation(async (callback) => callback({
    $queryRaw: mocks.repository,
    repositoryUpvote: { createMany: mocks.create, deleteMany: mocks.remove },
    repositoryMaintainer: { findMany: mocks.maintainers },
    repositoryLikeNotification: { createMany: mocks.notify },
  }));
});

it("rejects anonymous votes and removals before accessing repositories", async () => {
  mocks.auth.mockResolvedValue(null);
  for (const desired of [true, false]) {
    expect(await setRepositoryUpvoted("repo", desired)).toHaveProperty("error", "Sign in to like repositories.");
  }
  expect(mocks.repository).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});

it("rejects malformed client arguments", async () => {
  for (const id of ["", null, 42]) {
    expect((await setRepositoryUpvoted(id as string, true)).error).toBeTruthy();
  }
  expect((await setRepositoryUpvoted("repo", "false" as unknown as boolean)).error).toBeTruthy();
  expect(mocks.repository).not.toHaveBeenCalled();
});

it("requires a public available listing", async () => {
  mocks.repository.mockResolvedValue([]);
  expect((await setRepositoryUpvoted("repo", true)).error).toBeTruthy();
  const [query, id] = mocks.repository.mock.calls[0];
  expect(id).toBe("repo");
  expect(query.join("?")).toContain(`"isIndexed" = true AND "availability" = 'AVAILABLE'`);
  expect(query.join("?")).toContain("FOR UPDATE");
  expect(mocks.create).not.toHaveBeenCalled();
});

it("uses the authenticated local identity and ignores duplicate insertions", async () => {
  await setRepositoryUpvoted("repo", true);
  await setRepositoryUpvoted("repo", true);
  expect(mocks.create).toHaveBeenCalledTimes(2);
  expect(mocks.create).toHaveBeenLastCalledWith({ data: [{ userId: "local-user", repositoryId: "repo" }], skipDuplicates: true });
  expect(mocks.remove).not.toHaveBeenCalled();
  for (const path of ["/owner/repo", "/", "/explore", "/saved", "/find-a-project"]) {
    expect(mocks.revalidate).toHaveBeenCalledWith(path);
  }
});

it("only removes the current user's vote and permits repeated removals", async () => {
  await setRepositoryUpvoted("repo", false);
  await setRepositoryUpvoted("repo", false);
  expect(mocks.remove).toHaveBeenCalledTimes(2);
  expect(mocks.remove).toHaveBeenLastCalledWith({ where: { userId: "local-user", repositoryId: "repo" } });
  expect(mocks.create).not.toHaveBeenCalled();
});

it("does not report success or invalidate pages when persistence fails", async () => {
  mocks.create.mockRejectedValue(new Error("Database unavailable"));
  await expect(setRepositoryUpvoted("repo", true)).rejects.toThrow("Database unavailable");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

it("notifies verified maintainers other than the actor with a deduplicated history", async () => {
  await setRepositoryUpvoted("repo", true);
  expect(mocks.maintainers).toHaveBeenCalledWith({
    where: { repositoryId: "repo", verifiedAt: { not: null }, userId: { not: "local-user" } }, select: { userId: true },
  });
  expect(mocks.notify).toHaveBeenCalledWith({ data: [{ recipientId: "maintainer", actorId: "local-user", repositoryId: "repo" }], skipDuplicates: true });
  mocks.notify.mockClear();
  mocks.create.mockResolvedValue({ count: 0 });
  await setRepositoryUpvoted("repo", true);
  await setRepositoryUpvoted("repo", false);
  expect(mocks.notify).not.toHaveBeenCalled();
});

it("allows a like without recipients and propagates notification failures to roll back the transaction", async () => {
  mocks.maintainers.mockResolvedValue([]);
  await setRepositoryUpvoted("repo", true);
  expect(mocks.notify).not.toHaveBeenCalled();
  mocks.maintainers.mockResolvedValue([{ userId: "maintainer" }]);
  mocks.notify.mockRejectedValue(new Error("Notification write failed"));
  mocks.revalidate.mockClear();
  await expect(setRepositoryUpvoted("repo", true)).rejects.toThrow("Notification write failed");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
