"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type CSSProperties } from "react";
import { Heart } from "lucide-react";
import { setRepositoryUpvoted } from "@/app/upvotes/actions";
import { cn } from "@/lib/utils";

// Adapted from Opensource UI Like Button; see THIRD_PARTY_NOTICES.md.
const PARTICLES = [[0, -22], [18, -14], [22, 4], [13, 20], [-13, 20], [-22, 4], [-18, -14]];

export function UpvoteButton({ repositoryId, repositoryPath, count, upvoted: liked, signedIn }: {
  repositoryId: string; repositoryPath: string; count: number; upvoted: boolean; signedIn: boolean;
}) {
  const fullName = repositoryPath.slice(1);
  const [optimistic, setOptimistic] = useOptimistic({ liked, count }, (current, next: boolean) => ({
    liked: next, count: current.count + Number(next) - Number(current.liked),
  }));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const className = cn(
    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium shadow-sm transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground disabled:cursor-wait disabled:opacity-70",
    optimistic.liked
      ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400"
      : "border-border bg-neutral-50 text-neutral-600 hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
  );
  const contents = <>
    <span className="relative flex size-5 items-center justify-center" aria-hidden="true">
      {optimistic.liked && burst > 0 && <span key={burst} className="pointer-events-none absolute inset-0 motion-reduce:hidden">
        {PARTICLES.map(([x, y], index) => <span key={index} className="like-particle absolute left-1/2 top-1/2 size-1 rounded-full bg-rose-400" style={{ "--x": `${x}px`, "--y": `${y}px` } as CSSProperties} />)}
      </span>}
      <Heart className={cn("relative size-4 transition-transform motion-reduce:transition-none", optimistic.liked && "scale-110 fill-current")} />
    </span>
    <span className="tabular-nums">{optimistic.count.toLocaleString("en-GB")}</span>
  </>;

  if (!signedIn) return <Link href={`/sign-in?callbackUrl=${encodeURIComponent(repositoryPath)}`} className={className} aria-label={`Sign in to like ${fullName}, ${count} ${count === 1 ? "like" : "likes"}`}>{contents}</Link>;

  return <div className="relative">
    <button type="button" className={className} aria-pressed={optimistic.liked} aria-label={`Like ${fullName}, ${optimistic.count} ${optimistic.count === 1 ? "like" : "likes"}`} disabled={pending} onClick={() => {
      const next = !optimistic.liked;
      setError(null);
      if (next) setBurst((value) => value + 1);
      startTransition(async () => {
        setOptimistic(next);
        try {
          const result = await setRepositoryUpvoted(repositoryId, next);
          if (result?.error) setError(result.error);
        } catch {
          setError("Couldn't update your like. Please try again.");
        }
      });
    }}>{contents}</button>
    {error && <p role="alert" className="mt-2 max-w-56 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}
