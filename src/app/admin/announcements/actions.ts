"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { auth, isAdminGitHubId } from "@/lib/auth";
import { db } from "@/lib/db";
import { announcementSchema, type AnnouncementState } from "@/lib/announcements";

export async function saveAnnouncement(_state: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const session = await auth();
  if (!isAdminGitHubId(session?.user.githubId)) return { error: "Admin access is required.", success: null };
  const intent = formData.get("intent");
  if (intent !== "publish" && intent !== "unpublish") return { error: "Unknown action.", success: null };

  try {
    if (intent === "unpublish") {
      await db.announcement.updateMany({ where: { id: "site" }, data: { published: false } });
    } else {
      const parsed = announcementSchema.safeParse({
        message: formData.get("message"),
        linkLabel: formData.get("linkLabel"),
        linkUrl: formData.get("linkUrl"),
      });
      if (!parsed.success) return { error: parsed.error.issues[0].message, success: null };
      const data = {
        message: parsed.data.message,
        linkLabel: parsed.data.linkLabel || null,
        linkUrl: parsed.data.linkUrl || null,
        published: true,
        revision: randomUUID(),
      };
      await db.announcement.upsert({ where: { id: "site" }, create: { id: "site", ...data }, update: data });
    }
  } catch {
    return { error: "The announcement could not be saved. Please try again.", success: null };
  }
  updateTag("site-announcement");
  revalidatePath("/", "layout");
  return { error: null, success: intent === "publish" ? "Announcement published." : "Announcement unpublished. Your message is kept for later." };
}
