import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth, getGitHubAccessToken } from "@/lib/auth";
import { checkClaimPermission } from "@/lib/github/permissions";
import { getRepositoryDetail } from "@/lib/queries/repositories";
import { ClaimForm } from "@/components/claim/claim-form";
import { submitMaintainerRequest } from "./actions";

export const metadata: Metadata = { title: "Claim repository" };

interface ClaimPageParams {
  owner: string;
  repo: string;
}

export default async function ClaimPage({ params }: { params: Promise<ClaimPageParams> }) {
  const { owner, repo } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/${owner}/${repo}/claim`)}`);
  }

  const repository = await getRepositoryDetail(owner, repo);
  if (!repository) notFound();
  if (repository.isLocked) return <div className="mx-auto max-w-lg px-4 py-12"><h1 className="text-xl font-semibold">Repository locked</h1><p className="mt-2 text-neutral-500">A moderator has paused changes to this listing.</p></div>;

  const username = session.user.githubLogin;
  const accessToken = username ? await getGitHubAccessToken(session.user.id) : null;
  const permission =
    username && accessToken ? await checkClaimPermission(accessToken, owner, repo, session.user.githubId) : { eligible: false, permission: null };

  const boundAction = submitMaintainerRequest.bind(null, owner, repo);
  const existingRequest = repository.maintainerRequests[0];

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Claim {repository.fullName}</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Once your GitHub access is verified, your input here overrides our inferred status.
      </p>

      {!permission.eligible ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {permission.permission === null ? (
            <>We couldn&rsquo;t verify your GitHub access. Please try again, or sign in again to reconnect GitHub.</>
          ) : (
            <>GitHub reports your permission on this repository as <strong>{permission.permission}</strong>.
              Claiming requires owner, admin or maintain access. Make sure you&rsquo;re signed in with the right GitHub account.</>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <ClaimForm
            action={boundAction}
            defaultStatus={existingRequest?.status}
            defaultMessage={existingRequest?.message ?? undefined}
            defaultSkills={existingRequest?.skillsWanted}
          />
        </div>
      )}
    </div>
  );
}
