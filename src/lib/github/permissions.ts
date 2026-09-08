import "server-only";
import { Octokit } from "@octokit/rest";

/**
 * GitHub collaborator permission levels that are sufficient to claim a
 * repository as a maintainer. "write" is deliberately excluded — a regular
 * contributor can push branches/open PRs but is not necessarily a maintainer;
 * requiring "admin" or "maintain" keeps claiming meaningful.
 */
const CLAIM_ELIGIBLE_PERMISSIONS = new Set(["admin", "maintain"]);

export function canClaimWithPermission(permission: string | null | undefined): boolean {
  if (!permission) return false;
  return CLAIM_ELIGIBLE_PERMISSIONS.has(permission);
}

export interface ClaimPermissionCheck {
  eligible: boolean;
  permission: string | null;
}

/**
 * Asks GitHub, on behalf of the signed-in user's own token, what their
 * permission level is on a repository. Must run server-side with the
 * user's OAuth access token — never trust a client-supplied permission claim.
 */
export async function checkClaimPermission(
  userAccessToken: string,
  owner: string,
  repo: string,
  githubId: string,
  repositoryGithubId: bigint
): Promise<ClaimPermissionCheck> {
  const octokit = new Octokit({ auth: userAccessToken });
  try {
    const { data } = await octokit.repos.get({
      owner,
      repo,
    });
    if (data.private || String(data.id) !== String(repositoryGithubId)) {
      return { eligible: false, permission: null };
    }
    // Match the verified, stable identity used when adding a repository.
    const permission = String(data.owner.id) === githubId || data.permissions?.admin
      ? "admin"
      : data.permissions?.maintain ? "maintain"
      : data.permissions?.push ? "write"
      : data.permissions?.triage ? "triage"
      : data.permissions?.pull ? "read"
      : data.permissions ? "none" : null;
    return { eligible: canClaimWithPermission(permission), permission };
  } catch {
    return { eligible: false, permission: null };
  }
}
