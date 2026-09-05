import "server-only";
import { Octokit } from "@octokit/rest";

export function canAddPublicRepository(
  repository: { private: boolean; owner: { id: number } | null; permissions?: { admin?: boolean; maintain?: boolean } },
  githubId: string,
) {
  return !repository.private && (
    String(repository.owner?.id) === githubId ||
    repository.permissions?.admin === true || repository.permissions?.maintain === true
  );
}

export async function getAddablePublicRepositories(token: string, githubId: string) {
  const github = new Octokit({ auth: token });
  const repositories = await github.paginate(github.repos.listForAuthenticatedUser, {
    visibility: "public", affiliation: "owner,collaborator,organization_member", sort: "updated", per_page: 100,
  });
  return repositories.filter((repository) => canAddPublicRepository(repository, githubId))
    .map((repository) => ({
      id: repository.id,
      fullName: repository.full_name,
      description: repository.description,
      url: repository.html_url,
    }));
}
