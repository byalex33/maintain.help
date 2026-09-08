import { beforeEach, describe, it, expect, vi } from "vitest";
import { canClaimWithPermission, checkClaimPermission } from "@/lib/github/permissions";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@octokit/rest", () => ({ Octokit: class { repos = { get: mocks.get }; } }));
beforeEach(() => vi.resetAllMocks());

it("recognizes the verified owner even when GitHub omits token permissions", async () => {
  mocks.get.mockResolvedValue({ data: { id: 123, owner: { id: 42 } } });
  expect(await checkClaimPermission("user-token", "renamed-owner", "repo", "42", BigInt(123)))
    .toEqual({ eligible: true, permission: "admin" });
  expect(mocks.get).toHaveBeenCalledWith({ owner: "renamed-owner", repo: "repo" });
});

it.each(["admin", "maintain", "push", "triage", "pull"])("checks GitHub's %s permission for non-owners", async (role) => {
  mocks.get.mockResolvedValue({ data: { id: 123, owner: { id: 99 }, permissions: { [role]: true } } });
  const result = await checkClaimPermission("user-token", "org", "repo", "42", BigInt(123));
  expect(result.eligible).toBe(role === "admin" || role === "maintain");
  expect(result.permission).toBe(role === "push" ? "write" : role === "pull" ? "read" : role);
});

it("does not grant ownership from a matching URL username or invent a denial when permissions are missing", async () => {
  mocks.get.mockResolvedValue({ data: { id: 123, owner: { id: 99 } } });
  expect(await checkClaimPermission("user-token", "42", "repo", "42", BigInt(123)))
    .toEqual({ eligible: false, permission: null });
});

it("fails closed on API errors without reporting permission as none", async () => {
  mocks.get.mockRejectedValue({ status: 403 });
  expect(await checkClaimPermission("user-token", "owner", "repo", "42", BigInt(123)))
    .toEqual({ eligible: false, permission: null });
});

it("rejects a reused repository name even when the caller owns the replacement", async () => {
  mocks.get.mockResolvedValue({ data: { id: 456, owner: { id: 42 }, permissions: { admin: true } } });
  expect(await checkClaimPermission("user-token", "owner", "repo", "42", BigInt(123)))
    .toEqual({ eligible: false, permission: null });
});

it("rejects a repository that has become private", async () => {
  mocks.get.mockResolvedValue({ data: { id: 123, private: true, owner: { id: 42 } } });
  expect(await checkClaimPermission("user-token", "owner", "repo", "42", BigInt(123)))
    .toEqual({ eligible: false, permission: null });
});

describe("canClaimWithPermission", () => {
  it("allows admin permission to claim", () => {
    expect(canClaimWithPermission("admin")).toBe(true);
  });

  it("allows maintain permission to claim", () => {
    expect(canClaimWithPermission("maintain")).toBe(true);
  });

  it("does not allow write-only permission to claim", () => {
    expect(canClaimWithPermission("write")).toBe(false);
  });

  it("does not allow read/triage permission to claim", () => {
    expect(canClaimWithPermission("read")).toBe(false);
    expect(canClaimWithPermission("triage")).toBe(false);
  });

  it("does not allow null/none permission to claim", () => {
    expect(canClaimWithPermission(null)).toBe(false);
    expect(canClaimWithPermission("none")).toBe(false);
  });
});
