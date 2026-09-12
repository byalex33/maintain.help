import { PageIntro } from "@/components/layout/page-intro";
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
    <div className="page-shell">
      <PageIntro eyebrow="Made for your skills" title="Your next project is out there." description="Choose your languages, interests, and experience. Find open source you can make your own." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="filter-panel">
          <MatchFilters />
        </aside>

        <div>
          {!hasAnySelection ? (
            <div className="empty-panel">
              <span aria-hidden="true" className="mb-5 flex size-14 items-center justify-center rounded-full border border-border text-3xl text-foreground">↗</span>
              <h2 className="section-title text-foreground">Start with what you enjoy.</h2>
              <p className="mt-3 max-w-sm">Select at least one language, help type, or experience level to see matches.</p>
              <p className="mt-5 text-xs">Code, documentation, design, testing. There&apos;s more than one way to help.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-panel">
              No projects match these criteria yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
