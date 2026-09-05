"use server";

import { revalidatePath } from "next/cache";
import { auth, isAdminLogin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function moderateRepository(repositoryId: string, _state: { error: string | null }, formData: FormData) {
  const session = await auth();
  if (!isAdminLogin(session?.user.githubLogin)) return { error: "Admin access is required." };
  const intent = formData.get("intent");
  if (!["lock", "unlock", "delete", "restore", "feature", "unfeature"].includes(String(intent))) return { error: "Unknown action." };
  const repository = await db.repository.findUnique({ where: { id: repositoryId }, select: { fullName: true } });
  if (!repository) return { error: "Repository not found." };
  if (intent === "delete" && formData.get("confirmation") !== repository.fullName) {
    return { error: `Type ${repository.fullName} to confirm deletion.` };
  }
  try {
    if (intent === "feature") {
      await db.$transaction(async (tx) => {
        await tx.repository.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } });
        await tx.repository.update({ where: { id: repositoryId, isIndexed: true }, data: { isFeatured: true } });
      });
    } else {
      await db.repository.update({
        where: { id: repositoryId },
        data: intent === "unfeature" ? { isFeatured: false }
          : intent === "delete" ? { isIndexed: false, isFeatured: false, nextAnalysisAt: null }
          : intent === "restore" ? { isIndexed: true, nextAnalysisAt: new Date() }
          : { isLocked: intent === "lock", nextAnalysisAt: intent === "lock" ? null : new Date() },
      });
    }
  } catch {
    return { error: "The change could not be saved. Please try again." };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function resolveReport(repositoryId: string, reportId: string) {
  const session = await auth();
  if (!isAdminLogin(session?.user.githubLogin)) return;
  await db.repositoryFeedback.updateMany({ where: { id: reportId, repositoryId, resolvedAt: null }, data: { resolvedAt: new Date() } });
  revalidatePath("/", "layout");
}
