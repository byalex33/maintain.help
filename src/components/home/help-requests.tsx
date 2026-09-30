"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export interface HelpRequestRow {
  id: string;
  owner: string;
  name: string;
  description: string | null;
  status: string;
  statusLabel: string;
  categories: string;
  language: string | null;
  stars: string;
  featured: boolean;
}

const TABS = [
  { id: "all", label: "All" },
  { id: "SEEKING_MAINTAINERS", label: "Seeking maintainers" },
  { id: "ACTIVELY_ASKING", label: "Asking for help" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const STATUS_TEXT: Record<string, string> = {
  SEEKING_MAINTAINERS: "text-amber-600 dark:text-amber-400",
  ACTIVELY_ASKING: "text-blue-600 dark:text-blue-400",
  LIKELY_NEEDS_HELP: "text-violet-600 dark:text-violet-400",
};

export function HelpRequests({ all, seeking, asking }: { all: HelpRequestRow[]; seeking: HelpRequestRow[]; asking: HelpRequestRow[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const rows = tab === "all" ? all : tab === "SEEKING_MAINTAINERS" ? seeking : asking;

  return (
    <section aria-labelledby="help-requests-heading" className="mx-auto max-w-6xl px-4 pt-32 sm:px-8 sm:pt-[200px]">
      <div className="mb-14 flex flex-wrap items-baseline justify-between gap-6">
        <h2 id="help-requests-heading" className="text-[clamp(32px,4vw,48px)] leading-[1.05] font-medium tracking-[-0.045em]">Asking for help right now</h2>
        <div role="group" aria-label="Filter by status" className="flex gap-7 text-[15px]">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "cursor-pointer pb-1.5 transition-colors",
                tab === id
                  ? "text-neutral-950 shadow-[inset_0_-1px_0_currentColor] dark:text-neutral-50"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-[#6b6b6b] dark:hover:text-neutral-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-x-12 gap-y-14">
          {rows.map((row) => (
            <Link key={row.id} href={`/${row.owner}/${row.name}`} className="flex min-w-0 flex-col gap-3.5 transition-opacity hover:opacity-75">
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                <span className={cn("inline-flex items-center gap-2", STATUS_TEXT[row.status] ?? "text-neutral-500")}>
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {row.statusLabel}
                </span>
                {row.featured ? (
                  <span className="inline-flex items-center gap-1.5 text-violet-600 dark:text-violet-300">
                    <Sparkles aria-hidden="true" className="size-3.5" />Featured
                  </span>
                ) : null}
              </span>
              <div className="text-2xl leading-tight font-medium tracking-[-0.03em] break-words">
                <span className="text-neutral-400 dark:text-[#6b6b6b]">{row.owner}/</span>{row.name}
              </div>
              {row.description ? (
                <p className="line-clamp-3 text-base leading-[1.55] font-light text-pretty text-neutral-600 dark:text-[#8a8a8a]">{row.description}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-4 text-[13px] text-neutral-500 dark:text-[#6b6b6b]">
                {row.categories ? <span className="text-neutral-800 dark:text-neutral-300">{row.categories}</span> : null}
                {row.language ? <span>{row.language}</span> : null}
                <span>{row.stars} stars</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-neutral-500 dark:text-[#8a8a8a]">Nothing here right now.</p>
      )}

      <Link
        href={tab === "all" ? "/explore" : `/explore?status=${tab}`}
        className="mt-[72px] inline-flex items-center gap-2 text-[15px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
      >
        Explore all projects<ArrowRight aria-hidden="true" className="size-[15px]" />
      </Link>
    </section>
  );
}
