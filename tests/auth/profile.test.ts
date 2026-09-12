import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/components/repo/repo-like", () => ({ RepoLike: () => null }));
vi.mock("@/lib/db", () => ({ db: { user: { findUniqueOrThrow: mocks.user } } }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));

import ProfilePage from "@/app/profile/page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "local-user", githubLogin: "alex", name: "Alex", image: null } });
  mocks.user.mockResolvedValue({
    createdAt: new Date("2026-09-01T00:00:00Z"),
    _count: { savedRepositories: 0 },
    savedRepositories: [],
    submittedRepositories: [],
  });
});

it("redirects visitors back through sign-in without reading profile data", async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(ProfilePage()).rejects.toThrow("/sign-in?callbackUrl=%2Fprofile");
  expect(mocks.user).not.toHaveBeenCalled();
});

it("loads only the authenticated user's profile and renders useful empty states", async () => {
  const html = renderToStaticMarkup(await ProfilePage());
  expect(mocks.user.mock.calls[0][0].where).toEqual({ id: "local-user" });
  expect(html).toContain("Alex</h2>");
  expect(html).toContain("September 2026");
  expect(html).toContain('href="https://github.com/alex"');
  expect(html).toContain("Keep your next contribution close");
  expect(html).toContain('href="/find-a-project"');
  expect(html).toContain('href="/add"');
});

it("renders saved and submitted repository links and the full saved count", async () => {
  const repository = {
    id: "repo-1", owner: "maintainers", name: "project", fullName: "maintainers/project",
    description: "A project that needs help", stars: 10, forks: 1, _count: { upvotes: 3 },
    status: "ACTIVELY_ASKING", evidence: [], helpCategories: [], primaryLanguage: "TypeScript",
  };
  mocks.user.mockResolvedValue({
    createdAt: new Date("2026-09-01T00:00:00Z"),
    _count: { savedRepositories: 12 },
    savedRepositories: [{ repository }],
    submittedRepositories: [{ ...repository, id: "repo-2", name: "another-project" }],
  });
  const html = renderToStaticMarkup(await ProfilePage());
  expect(html).toContain('href="/maintainers/project"');
  expect(html).toContain('href="/maintainers/another-project"');
  expect(html).toContain('href="/saved"');
  expect(html).toContain(">12</dd>");
  expect(html).not.toContain("Keep your next contribution close");
});
