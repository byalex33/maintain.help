import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bookmark, Plus, UserRound } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUBLIC_REPOSITORY, repositoryCardSelect } from "@/lib/queries/repositories";
import { RepoCard } from "@/components/repo/repo-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=%2Fprofile");

  const profile = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      createdAt: true,
      _count: { select: { savedRepositories: { where: { repository: PUBLIC_REPOSITORY } } } },
      savedRepositories: {
        where: { repository: PUBLIC_REPOSITORY },
        select: { repository: { select: repositoryCardSelect } },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      submittedRepositories: {
        where: PUBLIC_REPOSITORY,
        select: repositoryCardSelect,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  const { user } = session;

  return (
    <div className="page-shell space-y-12">
      <header className="border-b border-border pb-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="eyebrow">Your profile</h1>
          <Button asChild variant="ghost" size="sm"><Link href="/settings">Account settings</Link></Button>
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted sm:size-20">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" width={80} height={80} className="size-full object-cover" />
              ) : <UserRound aria-hidden="true" className="size-8 text-neutral-500" />}
            </div>
            <div className="min-w-0">
              <h2 className="display-title break-words">{user.name ?? user.githubLogin}</h2>
              <p className="mt-1 break-all text-sm text-muted-foreground">@{user.githubLogin}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Joined {profile.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="self-start sm:self-auto">
            <a href={`https://github.com/${encodeURIComponent(user.githubLogin)}`} target="_blank" rel="noopener noreferrer">
              GitHub profile
              <ArrowUpRight aria-hidden="true" className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        </div>
        <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">Saved repositories</dt>
            <dd className="order-first font-semibold tabular-nums">{profile._count.savedRepositories}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">Submitted repositories</dt>
            <dd className="order-first font-semibold tabular-nums">{profile.submittedRepositories.length}</dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="saved-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="saved-heading" className="section-title">Saved repositories</h2>
          <Button asChild variant="ghost" size="sm"><Link href="/saved">View all saved <ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>
        </div>
        {profile.savedRepositories.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {profile.savedRepositories.map(({ repository }) => <RepoCard key={repository.id} repo={repository} />)}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-5 rounded-xl bg-muted/60 p-6 sm:flex-row sm:items-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background">
              <Bookmark aria-hidden="true" className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Keep your next contribution close</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Save a project you&rsquo;d like to help with. It will appear here.</p>
            </div>
            <Button asChild><Link href="/find-a-project">Find a project</Link></Button>
          </div>
        )}
      </section>

      <section aria-labelledby="submitted-heading" className="border-t border-border pt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="submitted-heading" className="section-title">Submitted repositories</h2>
          <Button asChild variant="ghost" size="sm"><Link href="/add"><Plus aria-hidden="true" className="size-4" /> Add repository</Link></Button>
        </div>
        {profile.submittedRepositories.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {profile.submittedRepositories.map((repository) => <RepoCard key={repository.id} repo={repository} />)}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No submissions yet. Know a project that could use a hand? Add it here.
          </p>
        )}
      </section>
    </div>
  );
}
