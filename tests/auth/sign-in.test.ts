import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ clerkAuth: vi.fn(), auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.clerkAuth }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@clerk/nextjs", () => ({
  SignIn: () => createElement("div", null, "GitHub login"),
  SignOutButton: ({ redirectUrl }: { redirectUrl: string }) => createElement("a", { href: redirectUrl }, "Sign out and retry"),
}));

import SignInPage from "@/app/sign-in/page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.clerkAuth.mockResolvedValue({ userId: "clerk-user" });
  mocks.auth.mockResolvedValue(null);
});

it("offers recovery instead of mounting Clerk SignIn for a rejected GitHub identity", async () => {
  const html = renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({ callbackUrl: "/saved" }) }));
  expect(html).toContain("Sign out and retry");
  expect(html).toContain("/sign-in?callbackUrl=%2Fsaved");
  expect(html).not.toContain("GitHub login");
});

it("shows login to visitors and sends valid sessions to their destination", async () => {
  mocks.clerkAuth.mockResolvedValue({ userId: null });
  expect(renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({}) }))).toContain("GitHub login");
  expect(mocks.auth).not.toHaveBeenCalled();
  mocks.clerkAuth.mockResolvedValue({ userId: "clerk-user" });
  mocks.auth.mockResolvedValue({ user: { id: "local-user" } });
  await expect(SignInPage({ searchParams: Promise.resolve({ callbackUrl: "/saved" }) })).rejects.toThrow("redirect:/saved");
});

it("keeps recovery redirects local", async () => {
  const html = renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({ callbackUrl: "//example.com" }) }));
  expect(html).toContain("/sign-in?callbackUrl=%2F");
  expect(html).not.toContain("example.com");
});
