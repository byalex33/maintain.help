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
  username: string
): Promise<ClaimPermissionCheck> {
  const octokit = new Octokit({ auth: userAccessToken });
  try {
    const { data } = await octokit.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username,
    });
    const permission = data.permission ?? null;
    return { eligible: canClaimWithPermission(permission), permission };
  } catch {
    return { eligible: false, permission: null };
  }
}
