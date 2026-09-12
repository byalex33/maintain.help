export function repositoryCanonicalKey(githubId: number | bigint) {
  return { githubId: BigInt(githubId) } as const;
}

export function repositoryNameFilter(owner: string, repo: string) {
  // PostgreSQL implements insensitive equals with ILIKE, so names must stay literal.
  const fullName = `${owner}/${repo}`.replace(/[\\%_]/g, "\\$&");
  return { fullName: { equals: fullName, mode: "insensitive" as const } };
}
