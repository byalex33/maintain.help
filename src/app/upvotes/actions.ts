"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function setRepositoryUpvoted(repositoryId: string, upvoted: boolean) {
  const session = await auth();
  if (!session?.user) return { error: "Sign in to like repositories." };
  if (typeof repositoryId !== "string" || !repositoryId || typeof upvoted !== "boolean") {
    return { error: "Invalid like request." };
  }
  const repository = await db.$transaction(async (tx) => {
    // Hold eligibility stable until the vote commits. Moderation and ingestion
    // updates to this row must finish before this read or wait for the vote.
    const [eligible] = await tx.$queryRaw<{ owner: string; name: string }[]>`
      SELECT "owner", "name" FROM "Repository"
      WHERE "id" = ${repositoryId} AND "isIndexed" = true AND "availability" = 'AVAILABLE'
      FOR UPDATE
    `;
    if (!eligible) return null;

    const key = { userId: session.user.id, repositoryId };
    // Explicit desired state and a unique key make retries safe.
    if (upvoted) {
      const created = await tx.repositoryUpvote.createMany({ data: [key], skipDuplicates: true });
      if (created.count) {
        const maintainers = await tx.repositoryMaintainer.findMany({
          where: { repositoryId, verifiedAt: { not: null }, userId: { not: session.user.id } },
          select: { userId: true },
        });
        const recipients = [...new Set(maintainers.flatMap(({ userId }) => userId ? [userId] : []))];
        if (recipients.length) await tx.repositoryLikeNotification.createMany({
          data: recipients.map((recipientId) => ({ recipientId, actorId: session.user.id, repositoryId })),
          // Retain history on unlike; re-liking must not generate repeated alerts.
          skipDuplicates: true,
        });
      }
    } else await tx.repositoryUpvote.deleteMany({ where: key });
    return eligible;
  });
  if (!repository) return { error: "This repository is no longer available." };

  revalidatePath(`/${repository.owner}/${repository.name}`);
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/find-a-project");
  revalidatePath("/saved");
  revalidatePath("/profile");
  return { error: null };
}
