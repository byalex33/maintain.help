"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUBLIC_REPOSITORY } from "@/lib/queries/repositories";

export async function setRepositoryLiked(repositoryId: string, liked: boolean) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (typeof repositoryId !== "string" || !repositoryId || typeof liked !== "boolean") throw new Error("Invalid like");
  const repository = await db.repository.findUnique({
    where: { id: repositoryId, ...PUBLIC_REPOSITORY },
    select: { owner: true, name: true, maintainers: {
      where: { verifiedAt: { not: null }, userId: { not: session.user.id } },
      select: { userId: true },
    } },
  });
  if (!repository) return;
  const key = { userId: session.user.id, repositoryId };
  if (liked) {
    // Keep the like record on unlike so toggling cannot repeatedly notify maintainers.
    await db.$transaction(async (tx) => {
      const id = randomUUID();
      const created = await tx.repositoryLike.createMany({ data: [{ id, ...key }], skipDuplicates: true });
      if (created.count) {
        const recipients = [...new Set(repository.maintainers.flatMap(({ userId }) => userId ? [userId] : []))];
        if (recipients.length) await tx.repositoryLikeNotification.createMany({
          data: recipients.map((recipientId) => ({ recipientId, likeId: id })),
        });
      } else {
        await tx.repositoryLike.updateMany({ where: key, data: { liked: true } });
      }
    });
  } else {
    await db.repositoryLike.updateMany({ where: key, data: { liked: false } });
  }
  revalidatePath(`/${repository.owner}/${repository.name}`);
}

export async function markNotificationsRead(ids: string[]) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!Array.isArray(ids) || ids.length > 20 || ids.some((id) => typeof id !== "string")) throw new Error("Invalid notifications");
  await db.repositoryLikeNotification.updateMany({
    where: { id: { in: ids }, recipientId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
