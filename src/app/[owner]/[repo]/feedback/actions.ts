"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RepositoryFeedbackType } from "@/generated/prisma/enums";
import { FEEDBACK_DAILY_LIMIT, feedbackIsTrusted } from "@/lib/feedback";
import { repositoryNameFilter } from "@/lib/repositoryIdentity";

const DAY = 24 * 60 * 60 * 1000;

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
  const anchor = type === RepositoryFeedbackType.REPORT ? "report" : "feedback";
  const path = `/${repository.owner}/${repository.name}`;
  const [duplicate, recent] = await Promise.all([
    db.repositoryFeedback.findFirst({
      where: { repositoryId: repository.id, userId: session.user.id, type: type as RepositoryFeedbackType, resolvedAt: null },
      select: { id: true },
    }),
    db.repositoryFeedback.count({ where: { userId: session.user.id, createdAt: { gte: new Date(Date.now() - DAY) } } }),
  ]);
  if (duplicate) redirect(`${path}?${anchor}=duplicate#${anchor}`);
  if (recent >= FEEDBACK_DAILY_LIMIT) redirect(`${path}?${anchor}=limit#${anchor}`);
  await db.repositoryFeedback.create({ data: {
    repositoryId: repository.id,
    userId: session.user.id,
    type: type as RepositoryFeedbackType,
    notes: notes || null,
    trusted,
  } });
  revalidatePath(path);
  revalidatePath("/admin");
  redirect(`${path}?${anchor}=sent#${anchor}`);
}
