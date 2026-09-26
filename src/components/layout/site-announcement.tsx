import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ANNOUNCEMENT_COOKIE } from "@/lib/announcements";
import { AnnouncementBanner } from "./announcement-banner";

export async function SiteAnnouncement() {
  const cookieStore = await cookies();
  // The optional banner must not take down the site during a migration or database outage.
  const announcement = await db.announcement.findUnique({
    where: { id: "site", published: true },
    select: { message: true, linkLabel: true, linkUrl: true, revision: true },
  }).catch(() => {
    console.error("Unable to load the site announcement.");
    return null;
  });
  if (!announcement || cookieStore.get(ANNOUNCEMENT_COOKIE)?.value === announcement.revision) return null;
  return <AnnouncementBanner key={announcement.revision} announcement={announcement} />;
}
