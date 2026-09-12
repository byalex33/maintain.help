"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/explore${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-2 md:flex-row md:items-center">
      {/* Adapted from Opensource UI Search Input; see THIRD_PARTY_NOTICES.md. */}
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          ref={inputRef}
          type="search"
          aria-label="Search projects, languages, or skills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, languages, skills..."
          className="h-12 rounded-lg pr-12 pl-10 shadow-none focus-visible:border-foreground focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />
        {query.length > 0 ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-md border border-transparent text-neutral-500 hover:bg-muted hover:text-foreground focus-visible:border-foreground focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="h-12">
        Explore projects
      </Button>
    </form>
  );
}
