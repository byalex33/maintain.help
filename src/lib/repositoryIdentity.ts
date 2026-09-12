export function repositoryCanonicalKey(githubId: number | bigint) {
  return { githubId: BigInt(githubId) } as const;
}

export function repositoryNameFilter(owner: string, repo: string) {
  return { fullName: { equals: `${owner}/${repo}`, mode: "insensitive" as const } };
}
