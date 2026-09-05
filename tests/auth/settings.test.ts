import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), appAuth: vi.fn(), has: vi.fn(), transaction: vi.fn(),
  repository: vi.fn(), requests: vi.fn(), maintainers: vi.fn(), user: vi.fn(), deleteUser: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: async () => ({ users: { deleteUser: mocks.deleteUser } }),
  reverificationError: (level: string) => ({ reverification: level }),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.appAuth }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));

import { deleteAccount } from "@/app/settings/actions";
import SettingsPage from "@/app/settings/page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId: "clerk-current-user", has: mocks.has });
  mocks.has.mockReturnValue(true);
  mocks.transaction.mockImplementation((fn) => fn({
    repository: { updateMany: mocks.repository },
    maintainerRequest: { deleteMany: mocks.requests },
    repositoryMaintainer: { updateMany: mocks.maintainers },
    user: { deleteMany: mocks.user },
  }));
});

it("protects settings and account deletion from signed-out visitors", async () => {
  mocks.appAuth.mockResolvedValue(null);
  await expect(SettingsPage()).rejects.toThrow("/sign-in?callbackUrl=%2Fsettings");
  mocks.auth.mockResolvedValue({ userId: null });
  expect(await deleteAccount("DELETE")).toHaveProperty("error");
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.deleteUser).not.toHaveBeenCalled();
});

it("requires exact confirmation and recent identity verification before any deletion", async () => {
  expect(await deleteAccount("delete")).toHaveProperty("error");
  mocks.has.mockReturnValue(false);
  expect(await deleteAccount("DELETE")).toEqual({ reverification: "strict" });
  expect(mocks.has).toHaveBeenCalledWith({ reverification: "strict" });
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.deleteUser).not.toHaveBeenCalled();
});

it("deletes only the current account and removes its active maintainer verification", async () => {
  expect(await deleteAccount("DELETE")).toEqual({ success: true });
  const user = { clerkId: "clerk-current-user" };
  expect(mocks.requests).toHaveBeenCalledWith({ where: { user } });
  expect(mocks.maintainers).toHaveBeenCalledWith({ where: { user }, data: { verifiedAt: null } });
  expect(mocks.repository).toHaveBeenCalledWith({
    where: { maintainerRequests: { some: { user, isActive: true } } },
    data: expect.objectContaining({ statusVerified: false, statusConfidence: "LOW", nextAnalysisAt: expect.any(Date) }),
  });
  expect(mocks.user).toHaveBeenCalledWith({ where: user });
  expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith("clerk-current-user");
  expect(mocks.deleteUser.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.user.mock.invocationCallOrder[0]);
});

it("leaves the sign-in account intact if local cleanup fails", async () => {
  mocks.transaction.mockRejectedValue(new Error("Database unavailable"));
  expect(await deleteAccount("DELETE")).toHaveProperty("error", expect.stringContaining("Nothing was deleted"));
  expect(mocks.deleteUser).not.toHaveBeenCalled();
});

it("reports partial deletion explicitly and allows retrying the provider deletion", async () => {
  mocks.deleteUser.mockRejectedValueOnce(new Error("Provider unavailable"));
  expect(await deleteAccount("DELETE")).toHaveProperty("error", expect.stringContaining("data was deleted"));
  expect(await deleteAccount("DELETE")).toEqual({ success: true });
  expect(mocks.deleteUser).toHaveBeenCalledTimes(2);
});
