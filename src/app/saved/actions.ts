"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setSavedRepository } from "@/lib/savedRepositories";

export async function setRepositorySaved(repositoryId: string, saved: boolean) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  await setSavedRepository(db.savedRepository, session.user.id, repositoryId, saved);
  revalidatePath("/saved");
}
