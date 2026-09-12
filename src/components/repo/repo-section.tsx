import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RepoCard } from "@/components/repo/repo-card";
import type { RepositoryCard } from "@/lib/queries/repositories";

export function RepoSection({
  title,
  description,
  repos,
  exploreHref,
  featured,
}: {
  title: string;
  description?: string;
  repos: RepositoryCard[];
  exploreHref: string;
  featured?: RepositoryCard | null;
}) {
  const cards = featured ? [featured, ...repos.filter((repo) => repo.id !== featured.id)] : repos;
  if (cards.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        <Link
          href={exploreHref}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((repo) => (
          <RepoCard key={repo.id} repo={repo} featured={repo.id === featured?.id} />
        ))}
      </div>
    </section>
  );
}
