import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ClaimBanner } from "@/components/repo/claim-banner";

it("lets automatic claimants manage status without asking them to claim again", () => {
  const html = renderToStaticMarkup(ClaimBanner({ owner: "alice", repo: "project", activeRequest: null, isSignedIn: true, isVerifiedMaintainer: true }));
  expect(html).toContain("You are a verified maintainer");
  expect(html).toContain("Manage help status");
  expect(html).not.toContain("Claim this repository");
  expect(html).not.toContain("Verified by repository maintainer");
});

it("keeps the claim entry point for people without a verified relationship", () => {
  const html = renderToStaticMarkup(ClaimBanner({ owner: "alice", repo: "project", activeRequest: null, isSignedIn: true }));
  expect(html).toContain("Claim this repository");
  expect(html).not.toContain("Manage help status");
});
