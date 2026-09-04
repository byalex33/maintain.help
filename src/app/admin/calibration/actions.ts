"use server";

import { revalidatePath } from "next/cache";
import { auth, isAdminLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClassificationVerdict, HelpStatus } from "@/generated/prisma/enums";

export async function submitClassificationReview(repositoryId: string, formData: FormData) {
  const session = await auth();
  if (!isAdminLogin(session?.user.githubLogin)) return;
  const verdict = formData.get("verdict");
  const expectedStatus = formData.get("expectedStatus");
  if (typeof verdict !== "string" || !Object.values(ClassificationVerdict).includes(verdict as ClassificationVerdict)) return;
  const expected = typeof expectedStatus === "string" && Object.values(HelpStatus).includes(expectedStatus as HelpStatus) ? expectedStatus as HelpStatus : null;
  await db.repositoryClassificationReview.create({ data: {
    repositoryId,
    reviewerUserId: session!.user.id,
    verdict: verdict as ClassificationVerdict,
    expectedStatus: expected,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || null,
    falsePositive: verdict === ClassificationVerdict.FALSE_POSITIVE,
    falseNegative: verdict === ClassificationVerdict.FALSE_NEGATIVE,
  } });
  revalidatePath("/admin/calibration");
}
