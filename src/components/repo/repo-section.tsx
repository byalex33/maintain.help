import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RepoCard } from "@/components/repo/repo-card";
import type { RepositoryCard } from "@/lib/queries/repositories";

export function RepoSection({
  title,
  description,
  repos,
  exploreHref,
}: {
  title: string;
  description?: string;
  repos: RepositoryCard[];
  exploreHref: string;
}) {
  if (repos.length === 0) return null;

  return (
    <section className="py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p> : null}
        </div>
        <Link
          href={exploreHref}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {repos.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </div>
    </section>
  );
}
