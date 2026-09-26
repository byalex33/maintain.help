import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { ANNOUNCEMENT_COOKIE } from "@/lib/announcements";
import { AnnouncementBanner } from "./announcement-banner";

// Cache only public content, never the visitor's dismissal cookie or a query failure.
// Cache Components are not enabled in this app, so use the supported Data Cache API.
const getAnnouncement = unstable_cache(() => db.announcement.findUnique({
    where: { id: "site", published: true },
    select: { message: true, linkLabel: true, linkUrl: true, revision: true },
  }), ["site-announcement"], { tags: ["site-announcement"], revalidate: 300 });

export async function SiteAnnouncement() {
  const cookieStore = await cookies();
  // The optional banner must not take down the site during a migration or database outage.
  const announcement = await getAnnouncement().catch(() => {
    console.error("Unable to load the site announcement.");
    return null;
  });
  if (!announcement || cookieStore.get(ANNOUNCEMENT_COOKIE)?.value === announcement.revision) return null;
  return <AnnouncementBanner key={announcement.revision} announcement={announcement} />;
}
