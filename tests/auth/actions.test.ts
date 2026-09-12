import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), repository: vi.fn(), maintainer: vi.fn(), feedback: vi.fn(),
  save: vi.fn(), unsave: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect to sign-in"); } }));
vi.mock("@/lib/db", () => ({ db: {
  repository: { findUnique: mocks.repository, findFirst: mocks.repository },
  repositoryMaintainer: { findFirst: mocks.maintainer },
  repositoryFeedback: { create: mocks.feedback },
  savedRepository: { upsert: mocks.save, deleteMany: mocks.unsave },
} }));

import { submitRepositoryFeedback } from "@/app/[owner]/[repo]/feedback/actions";
import { setRepositorySaved } from "@/app/saved/actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "stable_local_id", githubLogin: "renamed-user" } });
  mocks.repository.mockResolvedValue({ id: "repo_id", owner: "owner", name: "repo" });
  mocks.maintainer.mockResolvedValue(null);
});

function feedback(type: string) {
  const form = new FormData();
  form.set("type", type);
  return submitRepositoryFeedback("owner", "repo", form);
}

describe("Clerk-backed user actions", () => {
  it("denies saves and feedback for visitors", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(setRepositorySaved("repo_id", true)).rejects.toThrow("sign-in");
    await feedback("INACCURATE");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.feedback).not.toHaveBeenCalled();
  });

  it("scopes both save and unsave to the authenticated local user", async () => {
    await setRepositorySaved("repo_id", true);
    await setRepositorySaved("repo_id", false);
    const key = { userId: "stable_local_id", repositoryId: "repo_id" };
    expect(mocks.save).toHaveBeenCalledWith({ where: { userId_repositoryId: key }, create: key, update: {} });
    expect(mocks.unsave).toHaveBeenCalledWith({ where: key });
  });

  it("accepts non-maintainer corrections only as untrusted feedback", async () => {
    await feedback("INACCURATE");
    expect(mocks.feedback).toHaveBeenCalledWith({ data: {
      repositoryId: "repo_id", userId: "stable_local_id", type: "INACCURATE", notes: null, trusted: false,
    } });
  });

  it("accepts reports from signed-in users and requires a reason", async () => {
    const form = new FormData();
    form.set("type", "REPORT");
    await submitRepositoryFeedback("owner", "repo", form);
    expect(mocks.feedback).not.toHaveBeenCalled();
    form.set("notes", "This listing contains spam.");
    await expect(submitRepositoryFeedback("owner", "repo", form)).rejects.toThrow("redirect");
    expect(mocks.feedback).toHaveBeenCalledWith({ data: { repositoryId: "repo_id", userId: "stable_local_id", type: "REPORT", notes: "This listing contains spam.", trusted: false } });
    expect(mocks.repository).toHaveBeenCalledWith({ where: { fullName: { equals: "owner/repo", mode: "insensitive" }, isIndexed: true }, select: { id: true, owner: true, name: true } });
  });

  it("does not grant maintainer actions merely from a reused GitHub username", async () => {
    await feedback("NEED_SUCCESSOR");
    expect(mocks.maintainer).toHaveBeenCalledWith({
      where: { repositoryId: "repo_id", userId: "stable_local_id", verifiedAt: { not: null } },
      select: { verifiedAt: true },
    });
    expect(mocks.feedback).not.toHaveBeenCalled();
  });

  it("trusts a verified maintainer using the preserved local identity", async () => {
    mocks.maintainer.mockResolvedValue({ verifiedAt: new Date() });
    await feedback("NEED_SUCCESSOR");
    expect(mocks.feedback.mock.calls[0][0].data).toMatchObject({ userId: "stable_local_id", trusted: true });
  });
});
