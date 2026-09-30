"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const MODES = [
  { id: "contribute", label: "I want to contribute" },
  { id: "maintain", label: "I maintain a project" },
] as const;
type Mode = (typeof MODES)[number]["id"];

const SHARE_URL = `https://twitter.com/intent/tweet?${new URLSearchParams({
  text: "I'm building an open-source project and looking for people to build it with.\n\nMy project: [add your project link]\n\nFind your next contribution:",
  url: "https://maintain.help",
})}`;

export function HeroActions() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("contribute");
  const [query, setQuery] = useState("");
  const [repo, setRepo] = useState("");
  const contribute = mode === "contribute";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (contribute) {
      const q = query.trim();
      router.push(q ? `/explore?${new URLSearchParams({ q })}` : "/explore");
    } else {
      const r = repo.trim().replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "");
      router.push(r ? `/add?${new URLSearchParams({ repo: r })}` : "/add");
    }
  }

  return (
    <div className="mx-auto mt-12 flex w-full max-w-[640px] flex-col items-center gap-[18px] sm:mt-16">
      <div role="group" aria-label="Choose how you want to help" className="inline-flex gap-0.5 rounded-full bg-neutral-100 p-1 dark:bg-[#151515]">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-[18px]",
              mode === id
                ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900 dark:text-[#8a8a8a] dark:hover:text-neutral-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex w-full items-center gap-2 rounded-full bg-neutral-100 py-2 pr-2 pl-5 ring-1 ring-black/5 transition-shadow duration-300 sm:pl-6 dark:bg-[#151515] dark:ring-white/5",
          contribute ? "shadow-[0_30px_80px_-30px_rgba(37,99,235,.45)]" : "shadow-[0_30px_80px_-30px_rgba(217,119,6,.4)]",
        )}
      >
        {contribute ? (
          <>
            <Search aria-hidden="true" className="size-[18px] shrink-0 text-neutral-400 dark:text-[#6b6b6b]" />
            <input
              aria-label="Search projects, languages, or skills"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “TypeScript” or “documentation”"
              className="h-12 min-w-0 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-neutral-400 dark:placeholder:text-[#6b6b6b]"
            />
          </>
        ) : (
          <>
            <span aria-hidden="true" className="hidden shrink-0 font-mono text-[15px] text-neutral-400 sm:inline dark:text-[#6b6b6b]">github.com/</span>
            <input
              aria-label="GitHub repository (owner/repo)"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none placeholder:text-neutral-400 dark:placeholder:text-[#6b6b6b]"
            />
          </>
        )}
        <button
          type="submit"
          className={cn(
            "h-12 shrink-0 cursor-pointer rounded-full px-5 text-[15px] font-medium whitespace-nowrap transition-colors sm:px-[26px]",
            contribute ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-amber-400 text-neutral-900 hover:bg-amber-300",
          )}
        >
          {contribute ? "Explore projects" : "Add repository"}
        </button>
      </form>

      <p className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5 text-sm text-neutral-500 dark:text-[#6b6b6b]">
        <span>{contribute ? "Every listing shows the evidence behind it." : "Free. You verify, and you have the final say."}</span>
        {contribute ? null : (
          <>
            <span aria-hidden="true" className="text-neutral-300 dark:text-[#333]">·</span>
            <a
              href={SHARE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
            >
              <svg viewBox="0 0 24 24" className="size-[13px]" fill="currentColor" aria-hidden="true">
                <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.9-9L.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" />
              </svg>
              Share your project on X
            </a>
          </>
        )}
      </p>
    </div>
  );
}
