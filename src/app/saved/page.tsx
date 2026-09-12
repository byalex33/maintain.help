import { PageIntro } from "@/components/layout/page-intro";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUBLIC_REPOSITORY, repositoryCardSelect } from "@/lib/queries/repositories";
import { RepoCard } from "@/components/repo/repo-card";

export default async function SavedRepositoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const saved = await db.savedRepository.findMany({
    where: { userId: session.user.id, repository: PUBLIC_REPOSITORY },
    select: { repository: { select: repositoryCardSelect } },
    orderBy: { createdAt: "desc" },
  });

  return <div className="page-shell">
    <PageIntro eyebrow="Your collection" title="Good projects. Kept close." description="A little shortlist of the open source you want to come back to." />
    {saved.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{saved.map(({ repository }) => <RepoCard key={repository.id} repo={repository} />)}</div> : <p className="empty-panel">You haven&rsquo;t saved any repositories yet.</p>}
  </div>;
}
