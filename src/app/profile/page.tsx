import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bookmark, CalendarDays, Plus, UserRound } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUBLIC_REPOSITORY, repositoryCardSelect } from "@/lib/queries/repositories";
import { RepoCard } from "@/components/repo/repo-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Your corner of open source. Pick up where you left off.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="h-20 bg-blue-50 dark:bg-blue-950/30" />
        <div className="flex flex-col gap-6 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="relative -mt-10 mb-4 flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-neutral-100 dark:border-neutral-950 dark:bg-neutral-800">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" width={80} height={80} className="size-full object-cover" />
              ) : <UserRound aria-hidden="true" className="size-8 text-neutral-500" />}
            </div>
            <h2 className="break-words text-xl font-semibold">{user.name ?? user.githubLogin}</h2>
            <p className="mt-1 break-all text-sm text-neutral-500 dark:text-neutral-400">@{user.githubLogin}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <CalendarDays aria-hidden="true" className="size-4" />
              Joined {profile.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
            </p>
          </div>
          <Button asChild variant="outline" className="self-start sm:self-auto">
            <a href={`https://github.com/${encodeURIComponent(user.githubLogin)}`} target="_blank" rel="noopener noreferrer">
              GitHub profile
              <ArrowUpRight aria-hidden="true" className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div>
            <dt className="text-sm text-neutral-500 dark:text-neutral-400">Saved repositories</dt>
            <dd className="mt-1 text-2xl font-semibold">{profile._count.savedRepositories}</dd>
          </div>
          <div>
            <dt className="text-sm text-neutral-500 dark:text-neutral-400">Submitted repositories</dt>
            <dd className="mt-1 text-2xl font-semibold">{profile.submittedRepositories.length}</dd>
          </div>
        </dl>
      </Card>

      <section aria-labelledby="saved-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="saved-heading" className="text-lg font-semibold">Saved repositories</h2>
          <Button asChild variant="ghost" size="sm"><Link href="/saved">View all saved <ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>
        </div>
        {profile.savedRepositories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.savedRepositories.map(({ repository }) => <RepoCard key={repository.id} repo={repository} />)}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-3 border-dashed p-8 text-center">
            <Bookmark aria-hidden="true" className="size-6 text-neutral-400" />
            <p className="font-medium">Keep your next contribution close</p>
            <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">Save repositories that interest you and come back when you&rsquo;re ready to help.</p>
            <Button asChild variant="outline"><Link href="/find-a-project">Find a project</Link></Button>
          </Card>
        )}
      </section>

      <section aria-labelledby="submitted-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="submitted-heading" className="text-lg font-semibold">Submitted repositories</h2>
          <Button asChild variant="outline" size="sm"><Link href="/add"><Plus aria-hidden="true" className="size-4" /> Add repository</Link></Button>
        </div>
        {profile.submittedRepositories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.submittedRepositories.map((repository) => <RepoCard key={repository.id} repo={repository} />)}
          </div>
        ) : (
          <Card className="border-dashed p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            You haven&rsquo;t submitted any repositories yet. Know a project that could use a hand? Add it to help others discover it.
          </Card>
        )}
      </section>
    </div>
  );
}
