import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Flag, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import { auth, isAdminLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Prisma } from "@/generated/prisma/client";
import { formatStars } from "@/lib/display";

export const metadata: Metadata = { title: "Admin · Repositories", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!isAdminLogin(session?.user.githubLogin)) notFound();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const view = typeof params.view === "string" ? params.view : "";
  const where: Prisma.RepositoryWhereInput = {
    ...(query ? { fullName: { contains: query, mode: "insensitive" } } : {}),
    ...(view === "deleted" ? { isIndexed: false } : { isIndexed: true }),
    ...(view === "locked" ? { isLocked: true } : {}),
    ...(view === "reports" ? { feedback: { some: { resolvedAt: null } } } : {}),
  };
  const repositories = await db.repository.findMany({
    where,
    select: { id: true, owner: true, name: true, fullName: true, description: true, primaryLanguage: true, stars: true, isArchived: true, isFixture: true, isLocked: true, isIndexed: true, isFeatured: true, _count: { select: { feedback: { where: { resolvedAt: null } } } } },
    orderBy: { fullName: "asc" },
    take: 100,
  });

  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-10">
    <div>
      <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-neutral-500"><ShieldCheck aria-hidden="true" className="size-4" />Admin workspace</p>
      <h1 className="text-3xl font-semibold tracking-tight">Repositories</h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Manage listings, handle reports, and keep the directory useful.</p>
    </div>
    <nav aria-label="Admin sections" className="flex gap-2">
      <Button asChild variant="secondary" size="sm"><Link href="/admin" aria-current="page">Repositories</Link></Button>
      <Button asChild variant="ghost" size="sm"><Link href="/admin/users">Users</Link></Button>
    </nav>
    <Card className="space-y-4 p-4 sm:p-5">
      <nav aria-label="Repository views" className="flex flex-wrap gap-1">
        {[["", "All repositories"], ["reports", "Reports"], ["locked", "Locked"], ["deleted", "Deleted"]].map(([key, label]) => <Button key={key} asChild variant={view === key ? "secondary" : "ghost"} size="sm"><Link href={`/admin?${new URLSearchParams({ view: key, q: query })}`} aria-current={view === key ? "page" : undefined}>{label}</Link></Button>)}
      </nav>
      <form className="flex gap-2">
        <input type="hidden" name="view" value={view} />
        <Input aria-label="Search repositories" name="q" defaultValue={query} placeholder="Search by owner or repository name…" maxLength={200} />
        <Button type="submit" aria-label="Search"><Search aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Search</span></Button>
      </form>
    </Card>
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{view === "reports" ? "Repositories with open reports or feedback" : "Repository directory"}</h2><span className="text-xs text-neutral-500">{repositories.length} shown · up to 100</span></div>
    <Card className="divide-y divide-neutral-200 overflow-hidden dark:divide-neutral-800">
      {repositories.length ? repositories.map((repository) => <Link key={repository.id} href={`/${repository.owner}/${repository.name}`} className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
        <div className="min-w-0 space-y-2">
          <h3 className="break-all font-semibold">{repository.fullName}</h3>
          <p className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">{repository.description ?? "No description provided."}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>{repository.primaryLanguage ?? "Unknown language"} · {formatStars(repository.stars)} stars</span>
            {repository.isFeatured ? <Badge variant="outline" className="border-violet-300 text-violet-600 dark:border-violet-500/40 dark:text-violet-300"><Sparkles aria-hidden="true" className="size-3" />Featured</Badge> : null}
            {repository.isArchived ? <Badge variant="secondary">Archived</Badge> : null}
            {repository.isFixture ? <Badge variant="outline">Demo</Badge> : null}
            {repository.isLocked ? <Badge variant="warning"><LockKeyhole aria-hidden="true" className="size-3" />Locked</Badge> : null}
            {!repository.isIndexed ? <Badge variant="danger">Deleted</Badge> : null}
            {repository._count.feedback ? <Badge variant="danger"><Flag aria-hidden="true" className="size-3" />{repository._count.feedback} open reports / feedback</Badge> : null}
          </div>
        </div>
        <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-neutral-400" />
      </Link>) : <div className="space-y-2 p-12 text-center"><h3 className="font-semibold">{view === "reports" ? "No open reports" : "No matching repositories"}</h3><p className="text-sm text-neutral-500">{view === "reports" ? "Nothing to handle here right now." : "Try another search or repository view."}</p></div>}
    </Card>
  </div>;
}
