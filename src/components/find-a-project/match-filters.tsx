"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { HELP_CATEGORY_LABEL } from "@/lib/display";
import { HelpCategory } from "@/generated/prisma/enums";

const LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
  "Java",
  "C#",
  "C++",
  "Ruby",
  "Swift",
  "PHP",
];

const EXPERIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function MatchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const languages = searchParams.get("languages")?.split(",").filter(Boolean) ?? [];
  const categories = searchParams.get("categories")?.split(",").filter(Boolean) ?? [];
  const experience = searchParams.get("experience") ?? "";

  function updateList(key: string, value: string, current: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    const next = toggleInList(current, value);
    if (next.length > 0) params.set(key, next.join(","));
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setExperience(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== experience) params.set("experience", value);
    else params.delete("experience");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Label className="mb-2 text-xs text-neutral-500">Languages</Label>
        <div className="flex flex-col gap-2">
          {LANGUAGES.map((lang) => (
            <label key={lang} className="flex items-center gap-2 text-sm">
              <Checkbox checked={languages.includes(lang)} onCheckedChange={() => updateList("languages", lang, languages)} />
              {lang}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 text-xs text-neutral-500">Help type</Label>
        <div className="flex flex-col gap-2">
          {Object.values(HelpCategory).map((cat) => (
            <label key={cat} className="flex items-center gap-2 text-sm">
              <Checkbox checked={categories.includes(cat)} onCheckedChange={() => updateList("categories", cat, categories)} />
              {HELP_CATEGORY_LABEL[cat]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 text-xs text-neutral-500">Experience</Label>
        <div className="flex flex-col gap-2">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={experience === opt.value} onCheckedChange={() => setExperience(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
