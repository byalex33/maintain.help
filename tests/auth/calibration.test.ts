import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), repositories: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth, isAdminLogin: mocks.admin }));
vi.mock("@/lib/db", () => ({ db: { repository: { findMany: mocks.repositories } } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("Not found"); } }));

import AdminPage from "@/app/admin/page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin", githubLogin: "admin" } });
  mocks.admin.mockReturnValue(true);
  mocks.repositories.mockResolvedValue([]);
});

it("keeps the redesigned panel admin-only", async () => {
  mocks.admin.mockReturnValue(false);
  await expect(AdminPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Not found");
  expect(mocks.repositories).not.toHaveBeenCalled();
});

it("filters open reports without creating a classification review queue", async () => {
  const html = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({ view: "reports" }) }));
  expect(html).toContain("No open reports");
  expect(html).not.toContain("Review queue");
  expect(mocks.repositories.mock.calls[0][0].where).toMatchObject({ isIndexed: true, feedback: { some: { resolvedAt: null } } });
});

it("links to repository management and includes recoverable deleted listings", async () => {
  mocks.repositories.mockResolvedValue([{
    id: "repo", owner: "owner", name: "project", fullName: "owner/project", stars: 123,
    description: "A repository", primaryLanguage: "TypeScript", isArchived: true,
    isFixture: false, isLocked: true, isIndexed: false, _count: { feedback: 2 },
  }]);
  const html = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({ view: "deleted" }) }));
  expect(html).toContain('href="/owner/project"');
  expect(html).toContain("Locked");
  expect(html).toContain("Deleted");
  expect(mocks.repositories.mock.calls[0][0].where).toEqual({ isIndexed: false });
});
