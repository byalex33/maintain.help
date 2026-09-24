import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), repository: vi.fn(), maintainer: vi.fn(), feedback: vi.fn(),
  save: vi.fn(), unsave: vi.fn(), revalidate: vi.fn(), existing: vi.fn(), recent: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/db", () => ({ db: {
  repository: { findUnique: mocks.repository, findFirst: mocks.repository },
  repositoryMaintainer: { findFirst: mocks.maintainer },
  repositoryFeedback: { create: mocks.feedback, findFirst: mocks.existing, count: mocks.recent },
  savedRepository: { upsert: mocks.save, deleteMany: mocks.unsave },
} }));

import { submitRepositoryFeedback } from "@/app/[owner]/[repo]/feedback/actions";
import { setRepositorySaved } from "@/app/saved/actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "stable_local_id", githubLogin: "renamed-user" } });
  mocks.repository.mockResolvedValue({ id: "repo_id", owner: "owner", name: "repo" });
  mocks.maintainer.mockResolvedValue(null);
  mocks.existing.mockResolvedValue(null);
  mocks.recent.mockResolvedValue(0);
});

function feedback(type: string) {
  const form = new FormData();
  form.set("type", type);
  return submitRepositoryFeedback("owner", "repo", form).catch((error: Error) => error.message);
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
    expect(await feedback("INACCURATE")).toBe("redirect:/owner/repo?feedback=sent#feedback");
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
    await expect(submitRepositoryFeedback("owner", "repo", form)).rejects.toThrow("redirect:/owner/repo?report=sent#report");
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

  it("rejects a second unresolved submission of the same type for the same repository", async () => {
    mocks.existing.mockResolvedValue({ id: "open_feedback" });
    expect(await feedback("INACCURATE")).toBe("redirect:/owner/repo?feedback=duplicate#feedback");
    expect(mocks.existing).toHaveBeenCalledWith({
      where: { repositoryId: "repo_id", userId: "stable_local_id", type: "INACCURATE", resolvedAt: null },
      select: { id: true },
    });
    expect(mocks.feedback).not.toHaveBeenCalled();
  });

  it("caps each user's submissions in a rolling day", async () => {
    mocks.recent.mockResolvedValue(10);
    const form = new FormData();
    form.set("type", "REPORT");
    form.set("notes", "Spam");
    await expect(submitRepositoryFeedback("owner", "repo", form)).rejects.toThrow("redirect:/owner/repo?report=limit#report");
    const since: Date = mocks.recent.mock.calls[0][0].where.createdAt.gte;
    expect(mocks.recent.mock.calls[0][0].where.userId).toBe("stable_local_id");
    expect(Date.now() - since.getTime()).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
    expect(mocks.feedback).not.toHaveBeenCalled();
    mocks.recent.mockResolvedValue(9);
    await expect(submitRepositoryFeedback("owner", "repo", form)).rejects.toThrow("report=sent");
    expect(mocks.feedback).toHaveBeenCalledTimes(1);
  });

  it("stops trusting a maintainer whose claim has expired", async () => {
    mocks.maintainer.mockResolvedValue({ verifiedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) });
    await feedback("NEED_SUCCESSOR");
    expect(mocks.feedback).not.toHaveBeenCalled();
    await feedback("INACCURATE");
    expect(mocks.feedback.mock.calls[0][0].data).toMatchObject({ trusted: false });
  });

  it("trusts a verified maintainer using the preserved local identity", async () => {
    mocks.maintainer.mockResolvedValue({ verifiedAt: new Date() });
    await feedback("NEED_SUCCESSOR");
    expect(mocks.feedback.mock.calls[0][0].data).toMatchObject({ userId: "stable_local_id", trusted: true });
  });
});
