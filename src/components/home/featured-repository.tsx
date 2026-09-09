import Link from "next/link";
import { ArrowUp, ArrowUpRight, Code, GitFork, Sparkles, Star } from "lucide-react";
import type { RepositoryCard } from "@/lib/queries/repositories";
import { formatStars, HELP_CATEGORY_LABEL } from "@/lib/display";

export function FeaturedRepository({ repo }: { repo: RepositoryCard }) {
  return (
    <Link href={`/${repo.owner}/${repo.name}`} aria-labelledby="featured-repo-title" className="featured-repository group block min-w-0 p-6 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-violet-500 sm:p-8">
      <div aria-hidden="true" className="featured-grid" />
      <div className="relative space-y-7">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300">
            <Sparkles aria-hidden="true" className="size-3.5" />Featured project
          </span>
          <span className="flex size-10 items-center justify-center rounded-xl border border-neutral-200 bg-white/70 text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"><Code aria-hidden="true" className="size-5" /></span>
        </div>
        <div>
          <p className="mb-2 break-all font-mono text-xs text-neutral-500 dark:text-neutral-400">{repo.owner} /</p>
          <h3 id="featured-repo-title" className="break-words text-2xl font-semibold leading-tight tracking-tight text-neutral-950 sm:text-3xl dark:text-white">{repo.name}</h3>
          <p className="mt-4 line-clamp-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{repo.description ?? "Discover the project, explore its open issues, and find a way to contribute."}</p>
          {repo.helpCategories.length ? <div className="mt-4 flex flex-wrap gap-2">{repo.helpCategories.slice(0, 3).map(({ category }) => <span key={category} className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] text-neutral-600 dark:bg-white/5 dark:text-neutral-400">{HELP_CATEGORY_LABEL[category]}</span>)}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1.5"><ArrowUp aria-hidden="true" className="size-3.5" />{repo._count.upvotes} {repo._count.upvotes === 1 ? "upvote" : "upvotes"}</span>
          {repo.primaryLanguage ? <span className="flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full bg-violet-400" />{repo.primaryLanguage}</span> : null}
          <span className="flex items-center gap-1.5"><Star aria-hidden="true" className="size-3.5" />{formatStars(repo.stars)} stars</span>
          <span className="flex items-center gap-1.5"><GitFork aria-hidden="true" className="size-3.5" />{formatStars(repo.forks)} forks</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-5 dark:border-white/10">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">In the spotlight. Ready for your next contribution.</span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">Explore project<ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" /></span>
        </div>
      </div>
    </Link>
  );
}
