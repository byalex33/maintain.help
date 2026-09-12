import { expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
vi.mock("@clerk/nextjs/server", () => ({ clerkMiddleware: () => () => {} }));
import { config } from "@/proxy";

it.each(["/owner/project.js", "/owner/project.css", "/owner/project.png/claim", "/owner/project.git", "/sign-in", "/api/example"])("runs authentication middleware on application route %s", (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
});
it.each(["/_next/static/chunk.js", "/favicon.ico", "/icon.svg", "/robots.txt", "/file.svg"])("skips static resource %s", (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
});
