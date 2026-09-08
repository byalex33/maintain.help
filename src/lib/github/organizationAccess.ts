/** Only prompt for consent when GitHub confirms the token lacks organization scope. */
export function organizationAccessRequired(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("status" in error) || error.status !== 403) return false;
  const response = "response" in error ? error.response : null;
  if (!response || typeof response !== "object" || !("headers" in response)) return false;
  const headers = response.headers as Record<string, unknown> | undefined;
  if (!headers || headers["x-ratelimit-remaining"] === "0" || headers["retry-after"] !== undefined) return false;
  const scopes = headers["x-oauth-scopes"];
  return typeof scopes === "string" && !scopes.split(/[\s,]+/).some((scope) =>
    ["read:org", "write:org", "admin:org"].includes(scope));
}

export async function connectGitHubOrganizationsAutomatically(
  accountId: string,
  storage: Pick<Storage, "getItem" | "setItem">,
  connect: () => Promise<void>,
) {
  const key = `github-organization-consent:${accountId}`;
  try {
    if (storage.getItem(key)) return;
    // Mark before redirecting, including when consent is declined or fails.
    storage.setItem(key, "attempted");
  } catch {
    return;
  }
  await connect();
}
