export function isGitHubProvider(provider: string): boolean {
  return provider === "github" || provider === "oauth_github";
}
