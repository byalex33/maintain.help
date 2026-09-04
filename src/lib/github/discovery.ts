import "server-only";

import { getOctokit, withGitHubErrors, GitHubRateLimitError } from "./client";
import { ingestRepository } from "../ingest";

export async function discoverAndIngest(query: string, limit = 10) {
  const { data } = await withGitHubErrors(() => getOctokit().search.repos({ q: query, per_page: Math.min(limit, 25) }));
  const results = [];
  for (const item of data.items) {
    if (!item.owner) continue;
    try {
      const repository = await ingestRepository(item.owner.login, item.name);
      results.push({ fullName: repository.fullName, ok: true, status: repository.status });
    } catch (error) {
      results.push({ fullName: item.full_name, ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      if (error instanceof GitHubRateLimitError) break;
    }
  }
  return results;
}
