"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUBLIC_REPOSITORY } from "@/lib/queries/repositories";

export async function setRepositoryUpvoted(repositoryId: string, upvoted: boolean) {
  const session = await auth();
  if (!session?.user) return { error: "Sign in to upvote repositories." };
  if (typeof repositoryId !== "string" || !repositoryId || typeof upvoted !== "boolean") {
    return { error: "Invalid upvote request." };
  }
  const repository = await db.repository.findUnique({
    where: { id: repositoryId, ...PUBLIC_REPOSITORY },
    select: { owner: true, name: true },
  });
  if (!repository) return { error: "This repository is no longer available." };

  const key = { userId: session.user.id, repositoryId };
  // Explicit desired state and a unique key make retries safe.
  if (upvoted) await db.repositoryUpvote.createMany({ data: [key], skipDuplicates: true });
  else await db.repositoryUpvote.deleteMany({ where: key });

  revalidatePath(`/${repository.owner}/${repository.name}`);
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/find-a-project");
  revalidatePath("/saved");
  revalidatePath("/profile");
  return { error: null };
}
