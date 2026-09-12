import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth, isAdminLogin: () => false }));
vi.mock("@clerk/nextjs", () => ({ SignOutButton: ({ children }: { children: ReactNode }) => children }));
import { SiteHeader } from "@/components/layout/header";

it("makes the signed-in profile reachable from navigation and the account menu", async () => {
  mocks.auth.mockResolvedValue({ user: { githubLogin: "alex", image: null } });
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html.match(/href="\/profile"/g)).toHaveLength(2);
  expect(html).toContain("Saved repositories");
  mocks.auth.mockResolvedValue(null);
  const visitorHtml = renderToStaticMarkup(await SiteHeader());
  expect(visitorHtml).not.toContain('href="/profile"');
  expect(visitorHtml).toContain('href="/sign-in"');
});
