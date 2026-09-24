import { expect, it } from "vitest";
import { CLAIM_VALIDITY_DAYS, claimIsCurrent, claimValidSince } from "@/lib/claims";
import { feedbackIsTrusted } from "@/lib/feedback";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-09-24T12:00:00Z");

it("keeps claims current only within the validity window", () => {
  expect(claimValidSince(now)).toEqual(new Date(now.getTime() - CLAIM_VALIDITY_DAYS * DAY));
  expect(claimIsCurrent(new Date(now.getTime() - (CLAIM_VALIDITY_DAYS - 1) * DAY), now)).toBe(true);
  expect(claimIsCurrent(claimValidSince(now), now)).toBe(true);
  expect(claimIsCurrent(new Date(now.getTime() - (CLAIM_VALIDITY_DAYS + 1) * DAY), now)).toBe(false);
  expect(claimIsCurrent(null, now)).toBe(false);
});

it("trusts feedback only from a maintainer with a current claim", () => {
  expect(feedbackIsTrusted(new Date(now.getTime() - DAY), now)).toBe(true);
  expect(feedbackIsTrusted(new Date(now.getTime() - (CLAIM_VALIDITY_DAYS + 1) * DAY), now)).toBe(false);
  expect(feedbackIsTrusted(undefined, now)).toBe(false);
});
