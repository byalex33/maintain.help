"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNotificationsRead } from "@/app/notifications/actions";

type Notification = { id: string; unread: boolean; createdAt: string; actor: string; repository: string; href: string };

export function Notifications({ items }: { items: Notification[] }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const unread = items.filter((item) => item.unread);
  const latest = unread[0];

  useEffect(() => {
    // ponytail: refresh the page once a minute; use a dedicated feed if traffic warrants it.
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [router]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function markRead(ids: string[]) {
    setError("");
    startTransition(async () => {
      try { await markNotificationsRead(ids); }
      catch { setError("Could not mark notifications as read. Please try again."); }
    });
  }

  return <>
    {/* Adapted from Opensource UI Notification and Deploy Notification; see THIRD_PARTY_NOTICES.md. */}
    <details ref={menu} className="relative">
      <summary aria-label={`Notifications, ${unread.length}${unread.length === 20 ? "+" : ""} unread`} className="relative flex size-9 cursor-pointer list-none items-center justify-center rounded-md border border-border bg-background hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        <Bell aria-hidden="true" className="size-4" />
        {unread.length > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{unread.length > 9 ? "9+" : unread.length}</span>}
      </summary>
      <section aria-label="Notifications" className="absolute -right-12 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2.5rem)] rounded-xl border border-border bg-muted p-2 shadow-lg md:right-0">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unread.length > 0 && <Button variant="ghost" size="sm" disabled={pending} onClick={() => markRead(unread.map((item) => item.id))}>Mark shown as read</Button>}
        </div>
        {error && <p role="alert" className="px-2 pb-2 text-xs text-destructive">{error}</p>}
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {items.map((item) => <li key={item.id} className={`rounded-lg border p-3 ${item.unread ? "border-border bg-background" : "border-transparent"}`}>
            <Link href={item.href} onClick={() => { if (menu.current) menu.current.open = false; }} className="block rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-offset-2">
              <span className="flex items-center gap-2 font-medium"><Heart aria-hidden="true" className="size-4 shrink-0 text-rose-500" />{item.unread ? "New repo like" : "Repo like"}</span>
              <span className="mt-1 block break-words text-xs text-muted-foreground">{item.actor} liked {item.repository}</span>
            </Link>
            <div className="mt-2 flex items-center justify-between gap-2">
              <time dateTime={item.createdAt} className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</time>
              {item.unread && <Button variant="ghost" size="sm" disabled={pending} onClick={() => markRead([item.id])} aria-label={`Mark like on ${item.repository} as read`}>Mark read</Button>}
            </div>
          </li>)}
        </ul>
        {!items.length && <p className="p-4 text-sm text-muted-foreground">No notifications yet. Likes on your verified repositories will appear here.</p>}
        {items.length === 20 && <p className="px-2 pt-2 text-xs text-muted-foreground">Showing 20 notifications, unread first.</p>}
      </section>
    </details>
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-4 bottom-4 z-40 md:left-4 md:right-auto md:w-96">
      {latest && latest.id !== dismissed && <div className="pointer-events-auto relative grid grid-cols-[2.375rem_minmax(0,1fr)] items-start gap-3 rounded-[1.25rem] border border-border bg-background/95 p-4 pr-12 shadow-lg backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
        <div className="flex size-9.5 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Heart aria-hidden="true" className="size-5" /></div>
        <div className="min-w-0 text-sm"><p className="font-semibold">Your repo got a like</p><Link href={latest.href} onClick={() => setDismissed(latest.id)} className="mt-1 block break-words rounded-sm text-muted-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">{latest.actor} liked {latest.repository}</Link></div>
        <Button variant="ghost" size="icon" aria-label="Dismiss like notification" onClick={() => setDismissed(latest.id)} className="absolute right-1 top-1"><X aria-hidden="true" className="size-4" /></Button>
      </div>}
    </div>
  </>;
}
