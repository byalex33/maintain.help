import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("Sign in"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { repositoryLikeNotification: { updateMany: mocks.read, findMany: mocks.list } } }));
import { markNotificationsRead } from "@/app/notifications/actions";
import { getNotifications } from "@/lib/queries/notifications";

beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "recipient" } }); });

it("authenticates and scopes read updates to the recipient and supplied ids", async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(markNotificationsRead(["id"])).rejects.toThrow("Sign in");
  expect(mocks.read).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValue({ user: { id: "recipient" } });
  await expect(markNotificationsRead(Array(21).fill("id"))).rejects.toThrow("Invalid notifications");
  await markNotificationsRead(["id"]);
  expect(mocks.read).toHaveBeenCalledWith({ where: { id: { in: ["id"] }, recipientId: "recipient", readAt: null }, data: { readAt: expect.any(Date) } });
});

it("lists only public repos still verified for this recipient and serializes display data", async () => {
  mocks.list.mockResolvedValue([{ id: "n", readAt: null, createdAt: new Date("2026-09-12"), actor: { githubLogin: "alex" }, repository: { owner: "owner", name: "repo", fullName: "owner/repo" } }]);
  expect(await getNotifications("recipient")).toEqual([{ id: "n", unread: true, createdAt: "2026-09-12T00:00:00.000Z", actor: "alex", repository: "owner/repo", href: "/owner/repo" }]);
  expect(mocks.list.mock.calls[0][0]).toMatchObject({ where: { recipientId: "recipient", repository: {
    isIndexed: true, availability: "AVAILABLE", maintainers: { some: { userId: "recipient", verifiedAt: { not: null } } },
  } }, take: 20 });
});
