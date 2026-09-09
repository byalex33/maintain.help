"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setRepositoryUpvoted } from "@/app/upvotes/actions";

export function UpvoteButton({ repositoryId, count, upvoted, signedIn, repositoryPath }: {
  repositoryId: string;
  count: number;
  upvoted: boolean;
  signedIn: boolean;
  repositoryPath: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) return <Button asChild variant="outline" className="w-full">
    <Link href={`/sign-in?callbackUrl=${encodeURIComponent(repositoryPath)}`}>
      <ArrowUp aria-hidden="true" />{count} {count === 1 ? "upvote" : "upvotes"} · Sign in to upvote
    </Link>
  </Button>;

  return <div className="space-y-2">
    <Button
      type="button"
      variant={upvoted ? "default" : "outline"}
      className="w-full"
      aria-pressed={upvoted}
      aria-label={`${upvoted ? "Remove upvote" : "Upvote repository"}, ${count} ${count === 1 ? "upvote" : "upvotes"}`}
      disabled={pending}
      onClick={() => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await setRepositoryUpvoted(repositoryId, !upvoted);
            setError(result.error);
          } catch {
            setError("Could not update your upvote. Please try again.");
          }
        });
      }}
    >
      <ArrowUp aria-hidden="true" />{pending ? "Updating…" : upvoted ? "Upvoted" : "Upvote"} · {count}
    </Button>
    {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
  </div>;
}
