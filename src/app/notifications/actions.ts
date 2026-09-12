"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
