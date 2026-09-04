"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RepositoryFeedbackType } from "@/generated/prisma/enums";
import { feedbackIsTrusted } from "@/lib/feedback";

export async function submitRepositoryFeedback(owner: string, repo: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const type = formData.get("type");
  if (typeof type !== "string" || !Object.values(RepositoryFeedbackType).includes(type as RepositoryFeedbackType)) return;
  const repository = await db.repository.findUnique({ where: { fullName: `${owner}/${repo}` }, select: { id: true } });
  if (!repository) return;
  const maintainer = await db.repositoryMaintainer.findFirst({
    where: { repositoryId: repository.id, userId: session.user.id, verifiedAt: { not: null } },
    select: { verifiedAt: true },
  });
  const trusted = feedbackIsTrusted(maintainer?.verifiedAt);
  if (!trusted && type !== RepositoryFeedbackType.INACCURATE) return;
  await db.repositoryFeedback.create({ data: {
    repositoryId: repository.id,
    userId: session.user.id,
    type: type as RepositoryFeedbackType,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || null,
    trusted,
  } });
  revalidatePath(`/${owner}/${repo}`);
}
