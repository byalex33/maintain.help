"use client";

import { useEffect, useId, useState } from "react";
import type { RepositoryActivityEvent } from "@/lib/repositoryActivity";
import styles from "./activity-timeline.module.css";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTime(date: string, now: number) {
  const seconds = Math.round((Date.parse(date) - now) / 1000);
  if (Math.abs(seconds) < 60) return relativeFormat.format(seconds, "second");
  if (Math.abs(seconds) < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (Math.abs(seconds) < 86400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  return relativeFormat.format(Math.round(seconds / 86400), "day");
}

function EventIcon({ kind }: { kind: RepositoryActivityEvent["kind"] }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {kind === "release" ? <><path d="M12 16V4m-4 4 4-4 4 4M5 16v4h14v-4" /></> : kind === "push" ? <><circle cx="12" cy="12" r="4" /><path d="M3 12h5m8 0h5" /></> : <><path d="M5 4h14v13H9l-4 4V4Z" /><path d="M9 8h6m-6 4h4" /></>}
  </svg>;
}

export function ActivityTimeline({ events, lastAnalyzedAt }: { events: RepositoryActivityEvent[]; lastAnalyzedAt: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const listId = useId();

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleEvents = expanded ? events : events.slice(0, 5);
  return (
    <section aria-label="Activity timeline" className="mt-6 border border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b border-neutral-300 px-5 py-4 dark:border-neutral-700">
        <h3 className="text-sm font-semibold">Activity timeline</h3>
        <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">Latest release and push, plus up to 20 recent classification records. Refreshed when this repository is analysed.</p>
        {lastAnalyzedAt ? <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Last analysed <time dateTime={lastAnalyzedAt}>{dateFormat.format(new Date(lastAnalyzedAt))} UTC</time></p> : null}
      </div>
      {events.length ? <ol id={listId} className="px-5 py-5">
        {visibleEvents.map((event) => <li key={event.id} className={`${styles.event} relative flex gap-3 pb-6 last:pb-0`}>
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"><EventIcon kind={event.kind} /></span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="min-w-0 break-words text-sm font-medium">{event.href ? <a href={event.href} target="_blank" rel="noopener noreferrer" className="underline decoration-neutral-400 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">{event.title}</a> : event.title}</p>
              <time dateTime={event.occurredAt} title={`${dateFormat.format(new Date(event.occurredAt))} UTC`} className="text-xs text-neutral-600 dark:text-neutral-400">{now === null ? `${dateFormat.format(new Date(event.occurredAt))} UTC` : relativeTime(event.occurredAt, now)}</time>
            </div>
            <p className="mt-1 break-words text-sm leading-6 text-neutral-600 dark:text-neutral-400">{event.description}</p>
          </div>
        </li>)}
      </ol> : <p className="px-5 py-6 text-sm text-neutral-600 dark:text-neutral-400">No activity milestones have been recorded yet.</p>}
      {events.length > 5 ? <div className="border-t border-neutral-300 px-5 py-3 dark:border-neutral-700"><button type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)} className="text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">{expanded ? "Show less" : `Show ${events.length - 5} more milestones`}</button></div> : null}
    </section>
  );
}
