"use client";

import { useActionState, useState } from "react";
import { saveAnnouncement } from "@/app/admin/announcements/actions";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import type { AnnouncementContent } from "@/lib/announcements";

const fieldClass = "w-full border border-border bg-transparent px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";

export function AnnouncementEditor({ announcement }: { announcement: (AnnouncementContent & { published: boolean }) | null }) {
  const [message, setMessage] = useState(announcement?.message ?? "");
  const [linkLabel, setLinkLabel] = useState(announcement?.linkLabel ?? "");
  const [linkUrl, setLinkUrl] = useState(announcement?.linkUrl ?? "");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [state, action, pending] = useActionState(saveAnnouncement, { error: null, success: null });

  return <div className="space-y-10">
    <form action={action} className="max-w-2xl space-y-6">
      <fieldset disabled={pending} className="space-y-6 disabled:opacity-60">
        <legend className="sr-only">Announcement content</legend>
        <div className="space-y-2">
          <label htmlFor="announcement-message" className="block text-sm font-medium">Message</label>
          <textarea id="announcement-message" name="message" maxLength={240} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} aria-describedby="announcement-message-help" className={fieldClass} />
          <p id="announcement-message-help" className="text-xs text-muted-foreground">{message.length}/240 characters. Keep it short enough to read at a glance.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2"><label htmlFor="announcement-label" className="block text-sm font-medium">Link label <span className="font-normal text-muted-foreground">(optional)</span></label><input id="announcement-label" name="linkLabel" maxLength={60} value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} className={fieldClass} /></div>
          <div className="space-y-2"><label htmlFor="announcement-url" className="block text-sm font-medium">Link URL <span className="font-normal text-muted-foreground">(optional)</span></label><input id="announcement-url" name="linkUrl" maxLength={2048} value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} aria-describedby="announcement-url-help" className={fieldClass} /></div>
        </div>
        <p id="announcement-url-help" className="text-xs text-muted-foreground">Use an HTTPS address or a local path such as /explore. Add a label and URL together.</p>
        <div className="flex flex-wrap gap-3">
          <button type="submit" name="intent" value="publish" className="border border-foreground bg-foreground px-5 py-2.5 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-4">{pending ? "Saving..." : announcement?.published ? "Publish changes" : "Publish announcement"}</button>
          {announcement?.published ? <button type="submit" name="intent" value="unpublish" formNoValidate className="border border-border px-5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-4">Unpublish</button> : null}
        </div>
      </fieldset>
      <p className="text-xs leading-6 text-muted-foreground">Publishing shows this announcement across the site, including to visitors who dismissed the previous version. Unpublishing hides it and keeps the last published message.</p>
      {state.error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-sm">{state.success}</p> : null}
    </form>
    <section aria-labelledby="announcement-preview-title" className="space-y-4 border-t border-border pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="announcement-preview-title" className="text-lg font-semibold">Live preview</h2><button type="button" onClick={() => setPreviewVersion((version) => version + 1)} className="text-sm underline underline-offset-4 focus-visible:outline-2">Reset preview</button></div>
      <p className="text-sm text-muted-foreground">Try dismissing the banner. Editing or resetting the preview brings it back.</p>
      <div className="border border-border">
        <AnnouncementBanner key={`${previewVersion}:${message}:${linkLabel}:${linkUrl}`} preview announcement={{ message: message || "Your announcement will appear here.", linkLabel, linkUrl, revision: "preview" }} />
        <div className="border-t border-border px-5 py-5 text-sm font-semibold">maintain.help</div>
        <div className="border-t border-border px-5 py-8 text-sm text-muted-foreground">The page moves up when the banner closes.</div>
      </div>
    </section>
  </div>;
}
