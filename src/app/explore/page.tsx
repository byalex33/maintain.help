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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Explore projects</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {result.total} {result.total === 1 ? "repository" : "repositories"} indexed
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <ExploreFilters languages={result.availableLanguages} />
        </aside>

        <div>
          {result.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              No repositories match these filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
