"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { markNotificationsRead } from "@/app/notifications/actions";
import { AnnouncementBanner } from "@/components/ui/announcement-banner";
import { NotificationBell } from "@/components/ui/notification-bell";

export type LikeNotification = { id: string; unread: boolean; createdAt: string; actor: string; repository: string; href: string };

const DISMISSED_KEY = "maintain-help:dismissed-like-banner";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function Notifications({ items }: { items: LikeNotification[] }) {
  const router = useRouter();
  // Optimistic reads: the badge and dots clear before the server confirms.
  const [read, setRead] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    // ponytail: refresh the page once a minute; use a dedicated feed if traffic warrants it.
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [router]);

  function markRead(ids: string[]) {
    setError("");
    setRead((current) => new Set([...current, ...ids]));
    startTransition(async () => {
      try {
        await markNotificationsRead(ids);
      } catch {
        setRead((current) => new Set([...current].filter((id) => !ids.includes(id))));
        setError("Could not mark notifications as read. Please try again.");
      }
    });
  }

  return <NotificationBell
    notifications={items.map((item) => ({
      id: item.id,
      unread: item.unread && !read.has(item.id),
      content: <Link href={item.href} className="block rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-offset-2">
        <span className="flex items-center gap-1.5 font-medium"><Heart aria-hidden="true" className="size-3.5 shrink-0 text-rose-500" />{item.actor} liked {item.repository}</span>
        <time dateTime={item.createdAt} className="mt-0.5 block text-xs text-muted-foreground">{formatDate(item.createdAt)}</time>
      </Link>,
    }))}
    onRead={markRead}
    describe={(notification) => {
      const item = items.find(({ id }) => id === notification.id);
      return item ? `New notification: ${item.actor} liked ${item.repository}` : "New notification";
    }}
    header={<div className="px-3 pb-1.5 pt-2">
      <h2 className="text-[13px] font-medium text-muted-foreground">Notifications</h2>
      {error ? <p role="alert" className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>}
    empty={<p className="px-3 pb-3 pt-1 text-sm text-muted-foreground">No notifications yet. Likes on your verified repositories will appear here.</p>}
    footer={items.length === 20 ? <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">Showing 20 notifications, unread first.</p> : null}
  />;
}

/** Announces the newest unread like above the header until dismissed or read. */
export function LikeBanner({ latest }: { latest: LikeNotification | null }) {
  // Unknown on the server and first client render, so a remembered dismissal
  // never mismatches hydration and the entrance still plays.
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setDismissed(sessionStorage.getItem(DISMISSED_KEY)); } catch { setDismissed(null); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Keep the last notification rendered while the banner folds away.
  const [shown, setShown] = useState(latest);
  if (latest && latest.id !== shown?.id) setShown(latest);

  const open = dismissed !== undefined && latest !== null && latest.id !== dismissed;
  const dismiss = () => {
    if (!latest) return;
    setDismissed(latest.id);
    try { sessionStorage.setItem(DISMISSED_KEY, latest.id); } catch {
      // Private windows can refuse storage; the banner just won't remember.
    }
  };

  if (!shown) return null;
  return <AnnouncementBanner
    open={open}
    onDismiss={dismiss}
    label="New repository like"
    icon={<Heart className="size-4 fill-current text-rose-400" />}
    action={<Link href={shown.href} onClick={dismiss} className="shrink-0 rounded-sm font-medium underline decoration-background/40 underline-offset-[3px] outline-hidden transition-[text-decoration-color] duration-150 ease-out hover:decoration-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">View</Link>}
  >
    <span className="font-medium">{shown.actor}</span> liked {shown.repository}
  </AnnouncementBanner>;
}
