import "server-only";
import { Octokit } from "@octokit/rest";

export function isOwnPublicRepository(
  repository: { private: boolean; owner: { id: number } | null },
  githubId: string,
) {
  return !repository.private && String(repository.owner?.id) === githubId;
}

export async function getOwnPublicRepositories(token: string, githubId: string) {
  const github = new Octokit({ auth: token });
  const repositories = await github.paginate(github.repos.listForAuthenticatedUser, {
    visibility: "public", affiliation: "owner", sort: "updated", per_page: 100,
  });
  return repositories.filter((repository) => isOwnPublicRepository(repository, githubId))
    .map((repository) => ({
      id: repository.id,
      fullName: repository.full_name,
      description: repository.description,
      url: repository.html_url,
    }));
}
