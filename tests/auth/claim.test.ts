import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), token: vi.fn(), permission: vi.fn(), find: vi.fn(), lock: vi.fn(),
  update: vi.fn(), history: vi.fn(), deactivate: vi.fn(), create: vi.fn(), maintainer: vi.fn(),
  categories: vi.fn(), clearCategories: vi.fn(), createCategories: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth, getGitHubAccessToken: mocks.token }));
vi.mock("@/lib/github/permissions", () => ({ checkClaimPermission: mocks.permission }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));
vi.mock("@/lib/db", () => ({ db: {
  repository: { findFirst: mocks.find },
  $transaction: async (callback: (tx: unknown) => unknown) => callback({
    $queryRaw: mocks.lock,
    repository: { update: mocks.update }, repositoryStatus: { create: mocks.history },
    maintainerRequest: { updateMany: mocks.deactivate, create: mocks.create },
    repositoryMaintainer: { upsert: mocks.maintainer },
    repositoryHelpCategory: { findMany: mocks.categories, deleteMany: mocks.clearCategories, createMany: mocks.createCategories },
  }),
} }));

import { submitMaintainerRequest } from "@/app/[owner]/[repo]/claim/actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user", githubId: "42", githubLogin: "owner" } });
  mocks.token.mockResolvedValue("user-token");
  mocks.permission.mockResolvedValue({ eligible: true, permission: "admin" });
  mocks.find.mockResolvedValue({ id: "repository", owner: "owner", name: "repo", githubId: BigInt(123), isIndexed: true, isLocked: false, status: "HEALTHY", statusConfidence: "LOW", statusVerified: false });
  mocks.categories.mockResolvedValue([{ category: "CODE", verified: false }]);
});

function submit(field?: string, value?: string | Blob, status = "NEED_DOCUMENTATION_HELP") {
  const form = new FormData();
  form.set("status", status);
  if (field && value !== undefined) form.set(field, value);
  return submitMaintainerRequest("owner", "repo", { error: null }, form);
}

it("checks the indexed GitHub ID and serializes a successful claim before publishing its categories", async () => {
  await expect(submit("message", " Documentation please ")).rejects.toThrow("redirect");
  expect(mocks.permission).toHaveBeenCalledWith("user-token", "owner", "repo", "42", BigInt(123));
  expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
  expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user", message: "Documentation please", status: "NEED_DOCUMENTATION_HELP" }) });
  expect(mocks.createCategories).toHaveBeenCalledWith({ data: [{ repositoryId: "repository", category: "DOCUMENTATION", verified: true }] });
});

it("clears categories immediately when a maintainer stops looking", async () => {
  await expect(submit(undefined, undefined, "NOT_LOOKING")).rejects.toThrow("redirect");
  expect(mocks.clearCategories).toHaveBeenCalled();
  expect(mocks.createCategories).not.toHaveBeenCalled();
});

it("keeps only the latest request active when a maintainer updates their claim", async () => {
  const requests: { status: string; isActive: boolean }[] = [];
  mocks.deactivate.mockImplementation(({ where, data }) => {
    expect(where).toEqual({ repositoryId: "repository", isActive: true });
    for (const request of requests.filter((request) => request.isActive)) Object.assign(request, data);
  });
  mocks.create.mockImplementation(({ data }) => requests.push(data));
  await expect(submit()).rejects.toThrow("redirect");
  await expect(submit(undefined, undefined, "NOT_LOOKING")).rejects.toThrow("redirect");
  expect(requests.map(({ status, isActive }) => ({ status, isActive }))).toEqual([
    { status: "NEED_DOCUMENTATION_HELP", isActive: false },
    { status: "NOT_LOOKING", isActive: true },
  ]);
});

it.each([
  ["status", "INVALID"], ["message", new Blob(["upload"])], ["skills", new Blob(["upload"])],
  ["message", "x".repeat(2001)], ["skills", "x".repeat(1001)],
  ["skills", "x".repeat(51)], ["skills", Array(16).fill("skill").join(",")],
] as const)("rejects invalid %s without writing", async (field, value) => {
  expect((await submit(field, value)).error).toBeTruthy();
  expect(mocks.update).not.toHaveBeenCalled();
});

it("rejects mismatched GitHub permission checks without writing", async () => {
  mocks.permission.mockResolvedValue({ eligible: false, permission: null });
  expect((await submit()).error).toBeTruthy();
  expect(mocks.lock).not.toHaveBeenCalled();
});
