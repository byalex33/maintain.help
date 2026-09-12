"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RepositoryFeedbackType } from "@/generated/prisma/enums";
import { feedbackIsTrusted } from "@/lib/feedback";
import { repositoryNameFilter } from "@/lib/repositoryIdentity";

export async function submitRepositoryFeedback(owner: string, repo: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const type = formData.get("type");
  if (typeof type !== "string" || !Object.values(RepositoryFeedbackType).includes(type as RepositoryFeedbackType)) return;
  const rawNotes = formData.get("notes");
  if (rawNotes !== null && typeof rawNotes !== "string") return;
  const notes = (rawNotes ?? "").trim().slice(0, 2000);
  if (type === RepositoryFeedbackType.REPORT && !notes) return;
  const repository = await db.repository.findFirst({ where: { ...repositoryNameFilter(owner, repo), isIndexed: true }, select: { id: true, owner: true, name: true } });
  if (!repository) return;
  const maintainer = await db.repositoryMaintainer.findFirst({
    where: { repositoryId: repository.id, userId: session.user.id, verifiedAt: { not: null } },
    select: { verifiedAt: true },
  });
  const trusted = feedbackIsTrusted(maintainer?.verifiedAt);
  if (!trusted && type !== RepositoryFeedbackType.INACCURATE && type !== RepositoryFeedbackType.REPORT) return;
  await db.repositoryFeedback.create({ data: {
    repositoryId: repository.id,
    userId: session.user.id,
    type: type as RepositoryFeedbackType,
    notes: notes || null,
    trusted,
  } });
  revalidatePath(`/${repository.owner}/${repository.name}`);
  revalidatePath("/admin");
  if (type === RepositoryFeedbackType.REPORT) redirect(`/${repository.owner}/${repository.name}?report=sent#report`);
}
