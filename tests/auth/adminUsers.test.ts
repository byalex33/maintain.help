import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), count: vi.fn(), users: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth, isAdminLogin: mocks.admin }));
vi.mock("@/lib/db", () => ({ db: { user: { count: mocks.count, findMany: mocks.users } } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("Not found"); } }));

import AdminUsersPage from "@/app/admin/users/page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { githubLogin: "admin" } });
  mocks.admin.mockReturnValue(true);
  mocks.count.mockResolvedValue(0);
  mocks.users.mockResolvedValue([]);
});

it("blocks anonymous and non-admin visitors before reading users", async () => {
  mocks.admin.mockReturnValue(false);
  for (const session of [null, { user: { githubLogin: "visitor" } }]) {
    mocks.auth.mockResolvedValue(session);
    await expect(AdminUsersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Not found");
  }
  expect(mocks.count).not.toHaveBeenCalled();
  expect(mocks.users).not.toHaveBeenCalled();
});

it("renders user details and paginates search results without fetching credentials", async () => {
  mocks.count.mockResolvedValue(101);
  mocks.users.mockResolvedValue([{ id: "user", name: "Alex", githubLogin: "alex", email: null, createdAt: new Date("2026-09-05T12:00:00Z") }]);
  const html = renderToStaticMarkup(await AdminUsersPage({ searchParams: Promise.resolve({ q: " Alex ", page: "2" }) }));
  expect(html).toContain("Alex");
  expect(html).toContain("2026-09-05");
  expect(html).toContain('href="/admin/users?q=Alex&amp;page=3"');
  expect(html).toContain('href="/admin/users?q=Alex&amp;page=1"');
  expect(mocks.users).toHaveBeenCalledWith({
    where: { OR: ["name", "githubLogin", "email"].map((field) => ({ [field]: { contains: "Alex", mode: "insensitive" } })) },
    select: { id: true, name: true, githubLogin: true, email: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: 50, take: 50,
  });
});

it("handles empty lists and invalid or out-of-range pages", async () => {
  for (const page of ["NaN", "-1", "1.5", "99999999999999999999999", "200"]) {
    const html = renderToStaticMarkup(await AdminUsersPage({ searchParams: Promise.resolve({ page }) }));
    expect(html).toContain("No users yet.");
    expect(mocks.users).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 0 }));
  }
});
