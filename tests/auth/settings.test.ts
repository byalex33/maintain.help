import { beforeEach, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.stubGlobal("React", React);

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), appAuth: vi.fn(), has: vi.fn(), transaction: vi.fn(),
  repository: vi.fn(), requests: vi.fn(), maintainers: vi.fn(), user: vi.fn(), deleteUser: vi.fn(),
  updateUser: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: async () => ({ users: { deleteUser: mocks.deleteUser, updateUser: mocks.updateUser } }),
  reverificationError: (level: string) => ({ reverification: level }),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.appAuth }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@clerk/nextjs", () => ({
  useReverification: (action: unknown) => action,
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
}));

import { deleteAccount, updateProfile } from "@/app/settings/actions";
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

it("validates profile edits and updates only the authenticated user's name", async () => {
  const form = new FormData();
  form.set("name", "  Ada Lovelace  ");
  mocks.auth.mockResolvedValueOnce({ userId: null });
  expect(await updateProfile({}, form)).toHaveProperty("error");
  expect(mocks.updateUser).not.toHaveBeenCalled();
  for (const value of ["", "   ", "a".repeat(101)]) {
    form.set("name", value);
    expect(await updateProfile({}, form)).toHaveProperty("error");
  }
  expect(mocks.updateUser).not.toHaveBeenCalled();
  form.set("name", "  Ada Lovelace  ");
  expect(await updateProfile({}, form)).toEqual({ success: "Profile saved." });
  expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith("clerk-current-user", { firstName: "Ada Lovelace", lastName: "" });
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  mocks.updateUser.mockRejectedValueOnce(new Error("Provider unavailable"));
  expect(await updateProfile({}, form)).toHaveProperty("error");
  expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
});

it("renders native settings, a profile editor and protected account controls", async () => {
  mocks.appAuth.mockResolvedValue({ user: { name: "Ada Lovelace", githubLogin: "ada", image: null } });
  const html = renderToStaticMarkup(await SettingsPage());
  expect(html).toContain('aria-label="Settings sections"');
  expect(html).toContain('name="name"');
  expect(html).toContain('value="Ada Lovelace"');
  expect(html).toContain("Save changes");
  expect(html).toContain("Connected account");
  expect(html).toContain("https://github.com/settings/security");
  expect(html).toContain('pattern="DELETE"');
  expect(html).toContain("<details");
});
