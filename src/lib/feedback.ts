export function feedbackIsTrusted(verifiedAt: Date | null | undefined): boolean {
  return Boolean(verifiedAt);
}
