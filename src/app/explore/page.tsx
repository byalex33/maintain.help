import { PageIntro } from "@/components/layout/page-intro";
import type { Metadata } from "next";
import Link from "next/link";

import { RepoCard } from "@/components/repo/repo-card";
import { ExploreFilters } from "@/components/explore/filters";
import { Button } from "@/components/ui/button";
import { exploreRepositories, type ExploreSort } from "@/lib/queries/repositories";
import { HelpCategory, HelpStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse open-source projects looking for contributors, reviewers, maintainers, and more.",
};

const VALID_SORTS: ExploreSort[] = ["recommended", "stars", "recent", "most-help-needed", "newest"];

function parseSort(value: string | undefined): ExploreSort {
  return VALID_SORTS.includes(value as ExploreSort) ? (value as ExploreSort) : "recommended";
}

function parseInteger(value: string | undefined, max: number): number | undefined {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= max ? number : undefined;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const page = parseInteger(get("page"), Math.floor(2_147_483_647 / 24)) || 1;
  const sort = parseSort(get("sort"));

  const filters = {
    query: get("q"),
    language: get("language"),
    helpCategory: (get("category") as HelpCategory | undefined) && Object.values(HelpCategory).includes(get("category") as HelpCategory)
      ? (get("category") as HelpCategory)
      : undefined,
    status: (get("status") as HelpStatus | undefined) && Object.values(HelpStatus).includes(get("status") as HelpStatus)
      ? (get("status") as HelpStatus)
      : undefined,
    minStars: parseInteger(get("minStars"), 2_147_483_647),
    beginnerFriendly: get("beginnerFriendly") === "1",
    seekingMaintainers: get("seekingMaintainers") === "1",
    activelyAsking: get("activelyAsking") === "1",
  };

  const result = await exploreRepositories({ filters, sort, page });

  return (
    <div className="page-shell">
      <PageIntro eyebrow="The project directory" title="Find something worth building." description="Open-source projects, real requests for help. Find a place where your contribution matters."><p className="eyebrow">{result.total} {result.total === 1 ? "repository" : "repositories"} indexed</p></PageIntro>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="filter-panel">
          <ExploreFilters languages={result.availableLanguages} />
        </aside>

        <div>
          {result.items.length === 0 ? (
            <div className="empty-panel">
              No repositories match these filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {result.items.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          )}

          {result.totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(sp, page - 1)}>Previous</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              <span className="px-2 text-sm text-neutral-500">
                Page {result.page} of {result.totalPages}
              </span>
              {page < result.totalPages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(sp, page + 1)}>Next</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function pageHref(sp: Record<string, string | string[] | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "page") continue;
    if (typeof value === "string") params.set(key, value);
  }
  params.set("page", String(page));
  return `/explore?${params.toString()}`;
}
