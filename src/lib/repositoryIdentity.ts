export function repositoryCanonicalKey(githubId: number | bigint) {
  return { githubId: BigInt(githubId) } as const;
}
