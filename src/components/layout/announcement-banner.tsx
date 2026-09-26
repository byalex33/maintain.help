"use client";

import { useState } from "react";
import { ANNOUNCEMENT_COOKIE, isAnnouncementUrl, type AnnouncementContent } from "@/lib/announcements";

export function AnnouncementBanner({ announcement, preview = false }: { announcement: AnnouncementContent; preview?: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  function dismiss() {
    if (!preview) {
      document.cookie = `${ANNOUNCEMENT_COOKIE}=${encodeURIComponent(announcement.revision)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      // Keep keyboard focus in the page when the focused close button becomes inert.
      document.querySelector<HTMLElement>("header a")?.focus({ preventScroll: true });
    }
    setDismissed(true);
  }

  return <div className="announcement-collapse" data-dismissed={dismissed} inert={dismissed} aria-hidden={dismissed || undefined}>
    <div className="min-h-0 overflow-hidden">
      <aside aria-label={preview ? "Announcement preview" : "Announcement"} className="announcement-bar">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 shrink-0"><path d="m13 3-8 10h6l-1 8 9-11h-6l1-7Z" /></svg>
          <p className="min-w-0 flex-1 py-3 text-sm leading-6 [overflow-wrap:anywhere]">
            {announcement.message}
            {announcement.linkLabel && announcement.linkUrl && isAnnouncementUrl(announcement.linkUrl) ? <>{" "}<a href={announcement.linkUrl} className="ml-2 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">{announcement.linkLabel}</a></> : null}
          </p>
          <button type="button" onClick={dismiss} aria-label={preview ? "Dismiss preview" : "Dismiss announcement"} className="flex size-11 shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-4px]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
      </aside>
    </div>
  </div>;
}
