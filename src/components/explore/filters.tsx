"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HELP_CATEGORY_LABEL } from "@/lib/display";
import { HelpCategory, HelpStatus } from "@/generated/prisma/enums";

const STATUS_OPTIONS: { value: HelpStatus; label: string }[] = [
  { value: HelpStatus.ACTIVELY_ASKING, label: "Actively asking for help" },
  { value: HelpStatus.SEEKING_MAINTAINERS, label: "Seeking maintainers" },
  { value: HelpStatus.LIKELY_NEEDS_HELP, label: "Likely needs help" },
  { value: HelpStatus.MAINTENANCE_MODE, label: "Maintenance mode" },
  { value: HelpStatus.HEALTHY, label: "Healthy" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "upvotes", label: "Most liked" },
  { value: "stars", label: "Most stars" },
  { value: "recent", label: "Recently updated" },
  { value: "most-help-needed", label: "Most help needed" },
  { value: "newest", label: "Newest discovered" },
];

export function ExploreFilters({ languages }: { languages: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if ((params.get(key) || null) === value) return;
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const toggle = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(key) === "1") params.delete(key);
      else params.set(key, "1");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label htmlFor="explore-search" className="mb-1.5 text-xs text-neutral-500">Search</Label>
        <Input
          key={searchParams.get("q") ?? ""}
          id="explore-search"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="name, owner, language..."
          onKeyDown={(e) => {
            if (e.key === "Enter") set("q", (e.target as HTMLInputElement).value || null);
          }}
          onBlur={(e) => set("q", e.target.value || null)}
        />
      </div>

      <div>
        <Label htmlFor="explore-sort" className="mb-1.5 text-xs text-neutral-500">Sort</Label>
        <Select value={searchParams.get("sort") ?? "recommended"} onValueChange={(v) => set("sort", v)}>
          <SelectTrigger id="explore-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="explore-status" className="mb-1.5 text-xs text-neutral-500">Status</Label>
        <Select
          value={searchParams.get("status") ?? "any"}
          onValueChange={(v) => set("status", v === "any" ? null : v)}
        >
          <SelectTrigger id="explore-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any status</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="explore-category" className="mb-1.5 text-xs text-neutral-500">Help type</Label>
        <Select
          value={searchParams.get("category") ?? "any"}
          onValueChange={(v) => set("category", v === "any" ? null : v)}
        >
          <SelectTrigger id="explore-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any help type</SelectItem>
            {Object.values(HelpCategory).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {HELP_CATEGORY_LABEL[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="explore-language" className="mb-1.5 text-xs text-neutral-500">Language</Label>
        <Select
          value={searchParams.get("language") ?? "any"}
          onValueChange={(v) => set("language", v === "any" ? null : v)}
        >
          <SelectTrigger id="explore-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any language</SelectItem>
            {languages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="explore-stars" className="mb-1.5 text-xs text-neutral-500">Minimum stars</Label>
        <Select
          value={searchParams.get("minStars") ?? "any"}
          onValueChange={(v) => set("minStars", v === "any" ? null : v)}
        >
          <SelectTrigger id="explore-stars">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="100">100+</SelectItem>
            <SelectItem value="1000">1,000+</SelectItem>
            <SelectItem value="10000">10,000+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-900">
        <p className="text-xs text-neutral-500">Status selections match any selected status.</p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={searchParams.get("beginnerFriendly") === "1"} onCheckedChange={() => toggle("beginnerFriendly")} />
          Beginner friendly
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={searchParams.get("seekingMaintainers") === "1"} onCheckedChange={() => toggle("seekingMaintainers")} />
          Seeking maintainers
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={searchParams.get("activelyAsking") === "1"} onCheckedChange={() => toggle("activelyAsking")} />
          Actively asking for help
        </label>
      </div>
    </div>
  );
}
