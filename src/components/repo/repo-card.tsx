import Link from "next/link";
import { ArrowUpRight, BookOpen, Star, GitFork } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/repo/status-badge";
import { HELP_CATEGORY_LABEL, formatStars } from "@/lib/display";
import { topSignals, type RepositoryCard } from "@/lib/queries/repositories";

export function RepoCard({ repo }: { repo: RepositoryCard }) {
  const signals = topSignals(repo.evidence, 3);
  const categories = repo.helpCategories.slice(0, 3);

  return (
    <Link href={`/${repo.owner}/${repo.name}`} className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
      {/* Adapted from Opensource UI GitHub Repo; see THIRD_PARTY_NOTICES.md. */}
      <Card className="flex h-full flex-col gap-4 rounded-xl p-5 transition-colors group-hover:border-neutral-400 dark:group-hover:border-neutral-600">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <BookOpen aria-hidden="true" className="mt-1 size-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
            <div className="min-w-0">
              <p className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">{repo.owner} /</p>
              <h3 className="mt-1 truncate text-base font-semibold">{repo.name}</h3>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">Public</span>
        </div>

        {repo.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{repo.description}</p>
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

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {repo.primaryLanguage ? <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-current" />{repo.primaryLanguage}</span> : null}
          <span className="flex items-center gap-1" aria-label={`${repo.forks} forks`}>
            <GitFork aria-hidden="true" className="size-3.5" />
            {formatStars(repo.forks)} forks
          </span>
          <span className="ml-auto flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-1 font-medium text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300" aria-label={`${repo.stars} stars`}>
            <Star aria-hidden="true" className="size-3.5" />{formatStars(repo.stars)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs font-medium">
          View project
          <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
        </div>
      </Card>
    </Link>
  );
}
