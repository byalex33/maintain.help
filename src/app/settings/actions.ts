"use server";

import { auth, clerkClient, reverificationError } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProfile(_previous: { error?: string; success?: string }, formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in before updating your profile." };
  const value = formData.get("name");
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
    return { error: "Enter a display name between 1 and 100 characters." };
  }
  try {
    const client = await clerkClient();
    // auth() synchronizes this name into our local profile on the next render.
    await client.users.updateUser(userId, { firstName: value.trim(), lastName: "" });
  } catch {
    return { error: "Your profile could not be saved. Please try again." };
  }
  revalidatePath("/", "layout");
  return { success: "Profile saved." };
}

export async function deleteAccount(confirmation: string) {
  const { userId, has } = await auth();
  if (!userId) return { error: "Sign in before deleting your account." };
  if (confirmation !== "DELETE") return { error: "Type DELETE to confirm account deletion." };
  if (!has({ reverification: "strict" })) return reverificationError("strict");

  const client = await clerkClient();
  try {
    await db.$transaction(async (tx) => {
      const user = { clerkId: userId };
      await tx.repository.updateMany({
        where: { maintainerRequests: { some: { user, isActive: true } } },
        data: { statusVerified: false, statusConfidence: "LOW", statusReason: "Maintainer request removed. Awaiting reanalysis.", nextAnalysisAt: new Date() },
      });
      await tx.maintainerRequest.deleteMany({ where: { user } });
      await tx.repositoryMaintainer.updateMany({ where: { user }, data: { verifiedAt: null } });
      // Cascades remove saves, feedback, and legacy sessions; public repositories remain.
      await tx.user.deleteMany({ where: user });
    });
  } catch {
    return { error: "We couldn’t delete your account data. Nothing was deleted. Please try again." };
  }

  try {
    // ponytail: two stores cannot commit atomically; a provider failure is explicit and retryable.
    await client.users.deleteUser(userId);
  } catch {
    return { error: "Your maintain.help data was deleted, but your sign-in account could not be removed. Please retry Delete Account to finish." };
  }
  return { success: true };
}
