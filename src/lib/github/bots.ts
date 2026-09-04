const KNOWN_BOTS = new Set([
  "dependabot",
  "dependabot-preview",
  "renovate",
  "renovate-bot",
  "github-actions",
  "semantic-release-bot",
  "greenkeeper",
  "snyk-bot",
  "codecov",
]);

/** Conservative: GitHub's account type wins; otherwise only known automation names are excluded. */
export function isBotAccount(login: string, accountType?: string | null): boolean {
  if (accountType?.toLowerCase() === "bot") return true;
  return KNOWN_BOTS.has(login.toLowerCase().replace(/\[bot\]$/, ""));
}
