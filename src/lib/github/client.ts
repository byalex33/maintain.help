import "server-only";
import { Octokit } from "@octokit/rest";

let cached: Octokit | null = null;

/**
 * Server-only Octokit instance. Never expose GITHUB_ANALYSIS_TOKEN to the client —
 * all authenticated GitHub calls must be made from server components, route handlers,
 * or background jobs.
 */
export function getOctokit(): Octokit {
  if (cached) return cached;
  const auth = process.env.GITHUB_ANALYSIS_TOKEN || undefined;
  cached = new Octokit({ auth });
  return cached;
}

export class GitHubNotFoundError extends Error {
  constructor(owner: string, repo: string) {
    super(`Repository ${owner}/${repo} not found on GitHub`);
    this.name = "GitHubNotFoundError";
  }
}

export class GitHubRateLimitError extends Error {
  constructor(public resetAt: Date | null) {
    super(`GitHub API rate limit exceeded${resetAt ? `, resets at ${resetAt.toISOString()}` : ""}`);
    this.name = "GitHubRateLimitError";
  }
}

type GitHubRequestError = {
  status: number;
  message?: string;
  response?: { headers?: Record<string, string>; data?: { message?: string } };
};

function requestError(err: unknown): GitHubRequestError | null {
  return typeof err === "object" && err !== null && "status" in err ? err as GitHubRequestError : null;
}

export function isGitHubRateLimitError(err: unknown): boolean {
  const error = requestError(err);
  if (!error) return false;
  const message = `${error.message ?? ""} ${error.response?.data?.message ?? ""}`;
  return error.status === 429 ||
    (error.status === 403 && (error.response?.headers?.["x-ratelimit-remaining"] === "0" || /rate limit/i.test(message)));
}

/**
 * Wraps a GitHub API call, translating common error shapes into typed errors
 * so callers (ingestion jobs, route handlers) can react appropriately.
 */
export async function withGitHubErrors<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const error = requestError(err);
      if (isGitHubRateLimitError(err)) {
        const resetHeader = error?.response?.headers?.["x-ratelimit-reset"];
        const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000) : null;
        throw new GitHubRateLimitError(resetAt);
      }
      if (!error || error.status < 500 || attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
}
