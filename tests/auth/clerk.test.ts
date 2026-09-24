import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clerkAuth: vi.fn(), getUser: vi.fn(), getTokens: vi.fn(),
  upsert: vi.fn(), update: vi.fn(), transaction: vi.fn(), findUnique: vi.fn(),
}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.clerkAuth,
  clerkClient: async () => ({ users: { getUser: mocks.getUser, getUserOauthAccessToken: mocks.getTokens } }),
}));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction, user: { findUnique: mocks.findUnique } } }));

import { auth, getGitHubAccessToken, isAdminGitHubId } from "@/lib/auth";

const account = {
  id: "eac_github", provider: "oauth_github", providerUserId: "12345",
  username: "maintainer", verification: { status: "verified" },
};
const profile = { fullName: "Maintainer", imageUrl: "https://example.com/avatar", externalAccounts: [account] };

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  mocks.clerkAuth.mockResolvedValue({ userId: "user_clerk" });
  mocks.getUser.mockResolvedValue(profile);
  mocks.upsert.mockResolvedValue({ id: "local_existing", clerkId: "user_clerk", name: "Maintainer", image: null });
  mocks.update.mockResolvedValue({ id: "local_existing", clerkId: "user_clerk", name: "Maintainer", image: null });
  mocks.transaction.mockImplementation((fn) => fn({ user: { upsert: mocks.upsert, update: mocks.update } }));
  mocks.getTokens.mockResolvedValue({ data: [{ externalAccountId: "eac_github", token: "test-token" }] });
  mocks.findUnique.mockResolvedValue(null);
});

describe("Clerk GitHub identity bridge", () => {
  it("does not touch Clerk profiles or the database for visitors", async () => {
    mocks.clerkAuth.mockResolvedValue({ userId: null });
    expect(await auth()).toBeNull();
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    [], [{ ...account, provider: "google" }],
    [{ ...account, verification: { status: "unverified" } }],
    [{ ...account, verification: null }],
    [{ ...account, providerUserId: "not-a-github-id" }],
    [{ ...account, username: null }], [account, { ...account, id: "eac_other" }],
  ].map((externalAccounts) => ({ externalAccounts })))("rejects missing, unverified or ambiguous GitHub identities (%#)", async ({ externalAccounts }) => {
    mocks.getUser.mockResolvedValue({ ...profile, externalAccounts });
    expect(await auth()).toBeNull();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("links a legacy local user by immutable GitHub ID and preserves its ID", async () => {
    mocks.upsert.mockResolvedValue({ id: "local_existing", clerkId: null });
    expect((await auth())?.user.id).toBe("local_existing");
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { githubId: "12345" },
      create: { clerkId: "user_clerk", githubId: "12345", githubLogin: "maintainer", name: "Maintainer", image: profile.imageUrl },
      update: { githubLogin: "maintainer", name: "Maintainer", image: profile.imageUrl },
    });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "local_existing" }, data: { clerkId: "user_clerk" } });
  });

  it("does not rebind a GitHub identity linked to another Clerk user", async () => {
    mocks.upsert.mockResolvedValue({ id: "local_existing", clerkId: "someone_else" });
    expect(await auth()).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not fetch tokens for a conflicting GitHub identity", async () => {
    mocks.upsert.mockResolvedValue({ id: "local_existing", clerkId: "someone_else" });
    expect(await getGitHubAccessToken("local_existing")).toBeNull();
    expect(mocks.getTokens).not.toHaveBeenCalled();
  });

  it("does not hide unexpected database failures as rejected sessions", async () => {
    const error = new Error("database unavailable");
    mocks.transaction.mockRejectedValue(error);
    await expect(auth()).rejects.toBe(error);
  });

  it("refreshes a renamed GitHub account without matching email or username", async () => {
    mocks.getUser.mockResolvedValue({ ...profile, externalAccounts: [{ ...account, provider: "github", username: "new-name" }] });
    expect((await auth())?.user.githubLogin).toBe("new-name");
    expect(mocks.upsert.mock.calls[0][0].where).toEqual({ githubId: "12345" });
  });

  it("does not expose provider tokens in the app session", async () => {
    expect(await auth()).toEqual({ user: { id: "local_existing", githubId: "12345", githubLogin: "maintainer", name: "Maintainer", image: null } });
    expect(mocks.getTokens).not.toHaveBeenCalled();
  });

  it("fetches only the current user's matching GitHub token", async () => {
    expect(await getGitHubAccessToken("local_existing")).toBe("test-token");
    expect(mocks.getTokens).toHaveBeenCalledWith("user_clerk", "github");
  });

  it("refuses tokens for another local user", async () => {
    expect(await getGitHubAccessToken("someone_else")).toBeNull();
    expect(mocks.getTokens).not.toHaveBeenCalled();
  });

  it("refuses a token belonging to a different external account", async () => {
    mocks.getTokens.mockResolvedValue({ data: [{ externalAccountId: "eac_wrong", token: "wrong-token" }] });
    expect(await getGitHubAccessToken("local_existing")).toBeNull();
  });

  it("fails closed when the provider token is revoked or unavailable", async () => {
    mocks.getTokens.mockRejectedValue(new Error("provider unavailable"));
    expect(await getGitHubAccessToken("local_existing")).toBeNull();
  });

  it("skips the write transaction when the linked profile is unchanged", async () => {
    const stored = { id: "local_existing", clerkId: "user_clerk", githubLogin: "maintainer", name: "Maintainer", image: profile.imageUrl };
    mocks.findUnique.mockResolvedValue(stored);
    expect((await auth())?.user.id).toBe("local_existing");
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { githubId: "12345" } });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["login", { githubLogin: "old-name" }], ["name", { name: "Old" }], ["image", { image: null }], ["Clerk link", { clerkId: null }],
  ])("writes when the stored %s differs", async (_field, change) => {
    mocks.findUnique.mockResolvedValue({ id: "local_existing", clerkId: "user_clerk", githubLogin: "maintainer", name: "Maintainer", image: profile.imageUrl, ...change });
    await auth();
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("rejects a GitHub identity linked to another Clerk user without writing", async () => {
    mocks.findUnique.mockResolvedValue({ id: "local_existing", clerkId: "someone_else", githubLogin: "maintainer", name: "Maintainer", image: null });
    expect(await auth()).toBeNull();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("grants admin by immutable GitHub ID only", () => {
    vi.stubEnv("ADMIN_GITHUB_IDS", " 111, 12345 ");
    expect(isAdminGitHubId("12345")).toBe(true);
    expect(isAdminGitHubId("999")).toBe(false);
    expect(isAdminGitHubId("1234")).toBe(false);
    expect(isAdminGitHubId(null)).toBe(false);
    expect(isAdminGitHubId("")).toBe(false);
  });

  it("does not grant admin to a reused username with a different GitHub ID", () => {
    vi.stubEnv("ADMIN_GITHUB_IDS", "12345");
    vi.stubEnv("ADMIN_GITHUB_LOGINS", "maintainer");
    expect(isAdminGitHubId("67890")).toBe(false);
    expect(isAdminGitHubId("maintainer")).toBe(false);
  });

  it("fails closed when no admin IDs are configured", () => {
    vi.stubEnv("ADMIN_GITHUB_IDS", "");
    expect(isAdminGitHubId("12345")).toBe(false);
  });
});
