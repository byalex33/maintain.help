import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, isAdminGitHubId } from "@/lib/auth";
import { db } from "@/lib/db";
import { AnnouncementEditor } from "@/components/admin/announcement-editor";

export const metadata: Metadata = { title: "Admin · Announcements", robots: { index: false, follow: false } };

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!isAdminGitHubId(session?.user.githubId)) notFound();
  const announcement = await db.announcement.findUnique({ where: { id: "site" }, select: { message: true, linkLabel: true, linkUrl: true, revision: true, published: true } });

  return <div className="mx-auto max-w-6xl space-y-8 bg-[#f6f4ee] px-4 py-10 [font-family:Arial,Helvetica,sans-serif] dark:bg-[#191918]">
    <div><h1 className="text-3xl font-semibold tracking-tight">Announcements</h1><p className="mt-2 text-sm text-muted-foreground">Share a short update at the top of every page.</p></div>
    <nav aria-label="Admin sections" className="flex flex-wrap gap-5 text-sm"><Link href="/admin" className="underline underline-offset-4">Repositories</Link><Link href="/admin/users" className="underline underline-offset-4">Users</Link><Link href="/admin/announcements" aria-current="page" className="font-semibold">Announcements</Link></nav>
    <p className="border-y border-border py-4 text-sm">{announcement?.published ? "Live. Visitors can see this announcement." : "Unpublished. No announcement is visible to visitors."}</p>
    <AnnouncementEditor announcement={announcement} />
  </div>;
}
