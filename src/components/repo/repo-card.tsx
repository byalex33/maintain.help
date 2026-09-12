import Link from "next/link";
import { Star, GitFork } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/repo/status-badge";
import { HELP_CATEGORY_LABEL, formatStars } from "@/lib/display";
import { topSignals, type RepositoryCard } from "@/lib/queries/repositories";
import { RepoLike } from "./repo-like";

export function RepoCard({ repo }: { repo: RepositoryCard }) {
  const signals = topSignals(repo.evidence, 3);
  const categories = repo.helpCategories.slice(0, 3);

  return (
    <div className="relative h-full">
      <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-500 dark:text-neutral-400">{repo.owner}</p>
            <h3 className="truncate text-base font-semibold"><Link href={`/${repo.owner}/${repo.name}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-foreground" aria-label={`View ${repo.owner}/${repo.name}`}>{repo.name}</Link></h3>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
            <Star className="size-3.5" />
            {formatStars(repo.stars)}
          </div>
        </div>

        {repo.description ? (
          <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{repo.description}</p>
        ) : null}

        <StatusBadge status={repo.status} />

        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Badge key={c.category} variant="secondary">
                {HELP_CATEGORY_LABEL[c.category]}
              </Badge>
            ))}
          </div>
        ) : null}

        {signals.length > 0 ? (
          <ul className="mt-auto space-y-1 border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            {signals.map((s, i) => (
              <li key={i} className="line-clamp-1">
                {s}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
          <div className="relative z-10"><RepoLike repositoryId={repo.id} repositoryPath={`/${repo.owner}/${repo.name}`} count={repo._count.upvotes} /></div>
          {repo.primaryLanguage ? <span>{repo.primaryLanguage}</span> : null}
          <span className="flex items-center gap-1">
            <GitFork className="size-3" />
            {formatStars(repo.forks)}
          </span>
        </div>
      </Card>
    </div>
  );
}
