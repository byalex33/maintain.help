import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUBLIC_REPOSITORY, repositoryCardSelect } from "@/lib/queries/repositories";
import { RepoCard } from "@/components/repo/repo-card";

export default async function SavedRepositoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=%2Fsaved");
  const saved = await db.savedRepository.findMany({
    where: { userId: session.user.id, repository: PUBLIC_REPOSITORY },
    select: { repository: { select: repositoryCardSelect } },
    orderBy: { createdAt: "desc" },
  });

  return <div className="mx-auto max-w-6xl px-4 py-10">
    <h1 className="text-2xl font-semibold">Saved repositories</h1>
    {saved.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{saved.map(({ repository }) => <RepoCard key={repository.id} repo={repository} />)}</div> : <p className="mt-4 text-neutral-500">You haven&rsquo;t saved any repositories yet.</p>}
  </div>;
}
