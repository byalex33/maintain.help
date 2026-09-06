"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth, getGitHubAccessToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkClaimPermission } from "@/lib/github/permissions";
import { applyMaintainerOverride } from "@/lib/detection/status";
import { WantedHelpStatus } from "@/generated/prisma/enums";

export interface ClaimFormState {
  error: string | null;
}

export async function submitMaintainerRequest(
  owner: string,
  repo: string,
  _prevState: ClaimFormState,
  formData: FormData
): Promise<ClaimFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in to claim a repository." };
  }

  const username = session.user.githubLogin;
  if (!username) {
    return { error: "Could not determine your GitHub username. Please sign in again." };
  }

  const accessToken = await getGitHubAccessToken(session.user.id);
  if (!accessToken) {
    return { error: "Your GitHub session has expired. Please sign in again." };
  }

  const permission = await checkClaimPermission(accessToken, owner, repo, session.user.githubId);
  if (!permission.eligible) {
    return {
      error: permission.permission === null
        ? "We couldn't verify your GitHub access. Please try again, or sign in again to reconnect GitHub."
        : `GitHub reports your permission on ${owner}/${repo} as "${permission.permission}". Claiming requires owner, admin or maintain access.`,
    };
  }

  const repository = await db.repository.findUnique({ where: { fullName: `${owner}/${repo}` } });
  if (!repository || !repository.isIndexed || repository.isLocked) {
    return { error: "This repository is unavailable or locked by a moderator." };
  }

  const status = formData.get("status");
  if (typeof status !== "string" || !Object.values(WantedHelpStatus).includes(status as WantedHelpStatus)) {
    return { error: "Please choose a valid status." };
  }
  const message = ((formData.get("message") as string) || "").trim() || null;
  const skillsWanted = ((formData.get("skills") as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 15);

  const overridden = applyMaintainerOverride(
    {
      status: repository.status,
      confidence: repository.statusConfidence,
      verified: repository.statusVerified,
      reason: repository.statusReason ?? "",
    },
    { status: status as WantedHelpStatus, message }
  );

  try {
    await db.$transaction(async (tx) => {
      await tx.repository.update({
        where: { id: repository.id, isIndexed: true, isLocked: false },
        data: {
          status: overridden.status,
          statusConfidence: overridden.confidence,
          statusVerified: overridden.verified,
          statusReason: overridden.reason,
        },
      });

      await tx.repositoryStatus.create({
        data: {
          repositoryId: repository.id,
          status: overridden.status,
          confidence: overridden.confidence,
          verified: overridden.verified,
          reason: overridden.reason,
        },
      });

      await tx.maintainerRequest.updateMany({
        where: { repositoryId: repository.id, isActive: true },
        data: { isActive: false },
      });

      await tx.maintainerRequest.create({
        data: {
          repositoryId: repository.id,
          userId: session.user.id,
          status: status as WantedHelpStatus,
          message,
          skillsWanted,
          isActive: true,
        },
      });

      await tx.repositoryMaintainer.upsert({
        where: { repositoryId_githubLogin: { repositoryId: repository.id, githubLogin: username } },
        create: {
          repositoryId: repository.id,
          githubLogin: username,
          userId: session.user.id,
          role: "maintainer",
          isActive: true,
          verifiedAt: new Date(),
        },
        update: { userId: session.user.id, verifiedAt: new Date(), isActive: true },
      });

    });
  } catch {
    return { error: "The claim could not be saved. The repository may have been locked or removed. Please try again." };
  }

  revalidatePath(`/${owner}/${repo}`);
  redirect(`/${owner}/${repo}`);
}
