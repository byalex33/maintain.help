import { z } from "zod";

export const ANNOUNCEMENT_COOKIE = "maintain-announcement-dismissed";

/** Accept local absolute paths and HTTPS links, never script or protocol-relative URLs. */
export function isAnnouncementUrl(value: string): boolean {
  if (!value || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const announcementSchema = z.object({
  message: z.string().trim().min(1, "Write a message before publishing.").max(240, "Keep the message to 240 characters."),
  linkLabel: z.string().trim().max(60, "Keep the link label to 60 characters."),
  linkUrl: z.string().trim().max(2048, "The link is too long."),
}).superRefine(({ linkLabel, linkUrl }, ctx) => {
  if (Boolean(linkLabel) !== Boolean(linkUrl)) {
    ctx.addIssue({ code: "custom", message: "Add both a link label and a URL, or leave both blank." });
  }
  if (linkUrl && !isAnnouncementUrl(linkUrl)) {
    ctx.addIssue({ code: "custom", message: "Use an HTTPS URL or a local path starting with a single /." });
  }
});

export type AnnouncementContent = {
  message: string;
  linkLabel: string | null;
  linkUrl: string | null;
  revision: string;
};

export type AnnouncementState = { error: string | null; success: string | null };
