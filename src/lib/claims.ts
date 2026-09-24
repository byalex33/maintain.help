/** A maintainer claim must be reconfirmed with GitHub within this window to keep overriding inference. */
export const CLAIM_VALIDITY_DAYS = 90;

const DAY = 24 * 60 * 60 * 1000;

/** Claims verified before this instant have expired. */
export function claimValidSince(now = new Date()): Date {
  return new Date(now.getTime() - CLAIM_VALIDITY_DAYS * DAY);
}

export function claimIsCurrent(verifiedAt: Date | null | undefined, now = new Date()): boolean {
  return Boolean(verifiedAt) && verifiedAt! >= claimValidSince(now);
}
