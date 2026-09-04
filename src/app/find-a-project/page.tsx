import type { Metadata } from "next";

import { RepoCard } from "@/components/repo/repo-card";
import { MatchFilters } from "@/components/find-a-project/match-filters";
import { matchProjectsForDeveloper, type Experience } from "@/lib/queries/repositories";
import { HelpCategory } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Find a project",
  description: "Match with open-source projects based on your languages, interests, and experience level.",
};

export default async function FindAProjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const languages = get("languages")?.split(",").filter(Boolean) ?? [];
  const categories = (get("categories")?.split(",").filter(Boolean) ?? []).filter((c): c is HelpCategory =>
    Object.values(HelpCategory).includes(c as HelpCategory)
  );
  const experienceParam = get("experience");
  const experience: Experience | null = ["beginner", "intermediate", "advanced"].includes(experienceParam ?? "")
    ? (experienceParam as Experience)
    : null;

  const hasAnySelection = languages.length > 0 || categories.length > 0 || Boolean(experience);
  const results = hasAnySelection
    ? await matchProjectsForDeveloper({ languages, helpCategories: categories, experience })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Find a project</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Tell us what you know and what kind of help you&rsquo;d like to give — we&rsquo;ll match you with projects.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <MatchFilters />
        </aside>

        <div>
          {!hasAnySelection ? (
            <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Select at least one language, help type, or experience level to see matches.
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              No projects match these criteria yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
