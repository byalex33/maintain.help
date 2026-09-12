import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), repository: vi.fn(), create: vi.fn(), update: vi.fn(), notify: vi.fn(), read: vi.fn(), list: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("Sign in"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => {
  const db = {
    repository: { findUnique: mocks.repository },
    repositoryLike: { createMany: mocks.create, updateMany: mocks.update },
    repositoryLikeNotification: { createMany: mocks.notify, updateMany: mocks.read, findMany: mocks.list },
  };
  return { db: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) } };
});

import { markNotificationsRead, setRepositoryLiked } from "@/app/notifications/actions";
import { getNotifications } from "@/lib/queries/notifications";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "actor" } });
  mocks.repository.mockResolvedValue({ owner: "owner", name: "repo", maintainers: [{ userId: "maintainer" }, { userId: "maintainer" }, { userId: null }] });
  mocks.create.mockResolvedValue({ count: 1 });
});

it("authenticates likes and read updates and rejects malformed input", async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(setRepositoryLiked("repo", true)).rejects.toThrow("Sign in");
  await expect(markNotificationsRead(["id"])).rejects.toThrow("Sign in");
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.read).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValue({ user: { id: "actor" } });
  await expect(setRepositoryLiked("repo", "yes" as unknown as boolean)).rejects.toThrow("Invalid like");
  await expect(markNotificationsRead(Array(21).fill("id"))).rejects.toThrow("Invalid notifications");
});

it("notifies each verified maintainer once and excludes the actor in the query", async () => {
  await setRepositoryLiked("repo", true);
  expect(mocks.repository.mock.calls[0][0]).toMatchObject({
    where: { id: "repo", isIndexed: true, availability: "AVAILABLE" },
    select: { maintainers: { where: { verifiedAt: { not: null }, userId: { not: "actor" } } } },
  });
  const id = mocks.create.mock.calls[0][0].data[0].id;
  expect(mocks.create).toHaveBeenCalledWith({ data: [{ id, userId: "actor", repositoryId: "repo" }], skipDuplicates: true });
  expect(mocks.notify).toHaveBeenCalledExactlyOnceWith({ data: [{ recipientId: "maintainer", likeId: id }] });
});

it("does not repeat notifications on duplicate likes, unlikes, or relikes", async () => {
  mocks.create.mockResolvedValue({ count: 0 });
  await setRepositoryLiked("repo", true);
  await setRepositoryLiked("repo", false);
  await setRepositoryLiked("repo", true);
  expect(mocks.notify).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenNthCalledWith(2, { where: { userId: "actor", repositoryId: "repo" }, data: { liked: false } });
});

it("ignores unavailable repositories and handles repositories without verified maintainers", async () => {
  mocks.repository.mockResolvedValue(null);
  await setRepositoryLiked("repo", true);
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.repository.mockResolvedValue({ owner: "owner", name: "repo", maintainers: [] });
  await setRepositoryLiked("repo", true);
  expect(mocks.create).toHaveBeenCalledOnce();
  expect(mocks.notify).not.toHaveBeenCalled();
});

it("marks only the authenticated recipient's selected notifications as read", async () => {
  await markNotificationsRead(["notification"]);
  expect(mocks.read).toHaveBeenCalledWith({
    where: { id: { in: ["notification"] }, recipientId: "actor", readAt: null }, data: { readAt: expect.any(Date) },
  });
});

it("only lists current likes on public repos still verified for this recipient", async () => {
  mocks.list.mockResolvedValue([{ id: "n", readAt: null, createdAt: new Date("2026-09-12"), like: {
    user: { githubLogin: "alex" }, repository: { owner: "owner", name: "repo", fullName: "owner/repo" },
  } }]);
  expect(await getNotifications("maintainer")).toEqual([{
    id: "n", unread: true, createdAt: "2026-09-12T00:00:00.000Z", actor: "alex", repository: "owner/repo", href: "/owner/repo",
  }]);
  expect(mocks.list.mock.calls[0][0]).toMatchObject({ where: { recipientId: "maintainer", like: {
    liked: true, repository: { isIndexed: true, availability: "AVAILABLE", maintainers: { some: { userId: "maintainer", verifiedAt: { not: null } } } },
  } }, take: 20 });
});
