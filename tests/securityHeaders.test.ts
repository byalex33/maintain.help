import { expect, it } from "vitest";
import nextConfig from "../next.config";

it("forbids framing and sets baseline security headers on every route", async () => {
  const rules = await nextConfig.headers!();
  const rule = rules.find((entry) => entry.source === "/:path*");
  expect(rule?.headers).toEqual(expect.arrayContaining([
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
  ]));
});
