import { claimIsCurrent } from "./claims";

/** Only a maintainer whose claim is still within its validity window gives trusted feedback. */
export function feedbackIsTrusted(verifiedAt: Date | null | undefined, now = new Date()): boolean {
  return claimIsCurrent(verifiedAt, now);
}

/** Per-user submissions allowed in a rolling 24-hour window, across all repositories. */
export const FEEDBACK_DAILY_LIMIT = 10;
