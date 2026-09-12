import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), token: vi.fn(), get: vi.fn(), paginate: vi.fn(), ingest: vi.fn(), exists: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth, getGitHubAccessToken: mocks.token }));
vi.mock("@octokit/rest", () => ({ Octokit: class {
  repos = { get: mocks.get, listForAuthenticatedUser: "list" };
  orgs = { listForAuthenticatedUser: "orgs" };
  paginate = mocks.paginate;
} }));
vi.mock("@/lib/queries/repositories", () => ({ repositoryExists: mocks.exists }));
vi.mock("@/lib/ingest", () => ({ ingestRepository: mocks.ingest, RepositoryModerationError: class extends Error {}, RepositoryAnalysisBusyError: class extends Error {} }));

import { getAddablePublicRepositories, getGitHubOrganizations } from "@/lib/github/ownedRepositories";
import { POST } from "@/app/api/repositories/analyze/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "local-id", githubId: "42", githubLogin: "alice" } });
  mocks.token.mockResolvedValue("user-token");
  mocks.ingest.mockResolvedValue({ owner: "alice", name: "project" });
});

function submit() {
  return POST(new NextRequest("http://localhost/api/repositories/analyze", {
    method: "POST", body: JSON.stringify({ url: "https://github.com/alice/project" }),
  }));
}

it("loads all authenticated organization memberships independently of repository permissions", async () => {
  mocks.paginate.mockResolvedValue([{ login: "empty-org", id: 1 }, { login: "private-membership", id: 2 }]);
  expect(await getGitHubOrganizations("user-token")).toEqual(["empty-org", "private-membership"]);
  expect(mocks.paginate).toHaveBeenCalledWith("orgs", { per_page: 100 });
});

it("paginates personal and managed organization repositories and sends only picker fields to the browser", async () => {
  mocks.paginate.mockResolvedValue([
    { id: 1, owner: { id: 42 }, private: false, full_name: "alice/project", description: null, html_url: "https://github.com/alice/project", extra: "omit" },
    { id: 2, owner: { id: 42 }, private: true },
    { id: 3, owner: { id: 99 }, private: false },
    { id: 4, owner: { id: 99 }, private: false, permissions: { maintain: true }, full_name: "org/project", description: null, html_url: "https://github.com/org/project" },
    { id: 5, owner: { id: 99 }, private: false, permissions: { pull: true, push: true } },
    { id: 6, owner: { id: 99 }, private: true, permissions: { admin: true } },
  ]);
  expect(await getAddablePublicRepositories("user-token", "42")).toEqual([
    { id: 1, fullName: "alice/project", description: null, url: "https://github.com/alice/project" },
    { id: 4, fullName: "org/project", description: null, url: "https://github.com/org/project" },
  ]);
  expect(mocks.paginate).toHaveBeenCalledWith("list", {
    visibility: "public", affiliation: "owner,collaborator,organization_member", sort: "updated", per_page: 100,
  });
});

it("requires sign-in and a current GitHub token before ingestion", async () => {
  mocks.auth.mockResolvedValueOnce(null);
  expect((await submit()).status).toBe(401);
  mocks.token.mockResolvedValueOnce(null);
  expect((await submit()).status).toBe(403);
  expect(mocks.ingest).not.toHaveBeenCalled();
});

it("rejects forged selections of private or other users' repositories", async () => {
  for (const repository of [
    { private: true, owner: { id: 42 } },
    { private: false, owner: { id: 99 } },
    { private: false, owner: { id: 99 }, permissions: { pull: true, push: true } },
    { private: true, owner: { id: 99 }, permissions: { admin: true, maintain: true } },
  ]) {
    mocks.get.mockResolvedValueOnce({ data: repository });
    expect((await submit()).status).toBe(403);
  }
  expect(mocks.ingest).not.toHaveBeenCalled();
});

it.each(["admin", "maintain"])("adds public organization repos with GitHub-confirmed %s access", async (permission) => {
  mocks.get.mockResolvedValue({ data: { id: 123, private: false, owner: { id: 99 }, permissions: { [permission]: true } } });
  expect((await submit()).status).toBe(200);
  expect(mocks.ingest).toHaveBeenCalledWith("alice", "project", { submittedById: "local-id", verifiedMaintainer: { githubId: 123, userId: "local-id", githubLogin: "alice" } });
});

it("adds an owned public repository using the authenticated local identity", async () => {
  mocks.get.mockResolvedValue({ data: { id: 123, private: false, owner: { id: 42 } } });
  expect((await submit()).status).toBe(200);
  expect(mocks.ingest).toHaveBeenCalledWith("alice", "project", { submittedById: "local-id", verifiedMaintainer: { githubId: 123, userId: "local-id", githubLogin: "alice" } });
});
