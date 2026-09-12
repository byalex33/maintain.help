import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, GitFork, ArrowUpRight, ArrowLeft, Code2, Activity, Circle, Bookmark, ShieldCheck, Flag, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UpvoteButton } from "@/components/repo/upvote-button";
import { StatusBadge, ConfidenceBadge } from "@/components/repo/status-badge";
import { EvidenceCard } from "@/components/repo/evidence-card";
import { ActivityCharts } from "@/components/repo/activity-charts";
import { ContributorsList } from "@/components/repo/contributors-list";
import { OpenOpportunities } from "@/components/repo/open-opportunities";
import { ClaimBanner } from "@/components/repo/claim-banner";
import { getRepositoryDetail } from "@/lib/queries/repositories";
import { auth, isAdminLogin } from "@/lib/auth";
import { ModerationControls } from "@/components/repo/moderation-controls";
import { resolveReport } from "@/app/admin/actions";
import { db } from "@/lib/db";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setRepositorySaved } from "@/app/saved/actions";
import { submitRepositoryFeedback } from "./feedback/actions";
import { STATUS_DESCRIPTION, HELP_CATEGORY_LABEL, HELP_CATEGORY_ICON, formatStars } from "@/lib/display";

interface RepoPageParams {
  owner: string;
  repo: string;
}

async function loadRepo(params: Promise<RepoPageParams>, includeRemoved: boolean) {
  const { owner, repo } = await params;
  const data = await getRepositoryDetail(owner, repo, includeRemoved);
  if (!data) notFound();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RepoPageParams>;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  const data = await getRepositoryDetail(owner, repo);
  if (!data) return { robots: { index: false, follow: false } };

  const title = `${data.fullName} - Open Source Help & Maintainer Status`;
  const description =
    data.description ?? `See what kind of help ${data.fullName} needs and the evidence behind that conclusion.`;

  return {
    title,
    description,
    alternates: { canonical: `/${owner}/${repo}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function RepoPage({ params, searchParams }: { params: Promise<RepoPageParams>; searchParams: Promise<{ report?: string }> }) {
  const session = await auth();
  const isAdmin = isAdminLogin(session?.user.githubLogin);
  const repository = await loadRepo(params, isAdmin);
  const reportState = (await searchParams).report;
  const reportSent = reportState === "sent";
  const reports = isAdmin ? await db.repositoryFeedback.findMany({
    where: { repositoryId: repository.id, resolvedAt: null },
    include: { user: { select: { githubLogin: true, name: true } } },
    orderBy: { createdAt: "desc" },
  }) : [];

  const upvoted = session?.user ? Boolean(await db.repositoryUpvote.findUnique({
    where: { userId_repositoryId: { userId: session.user.id, repositoryId: repository.id } },
    select: { userId: true },
  })) : false;
  const activeRequest = repository.maintainerRequests[0] ?? null;
  const saved = session?.user ? Boolean(await db.savedRepository.findUnique({
    where: { userId_repositoryId: { userId: session.user.id, repositoryId: repository.id } }, select: { id: true },
  })) : false;
  const verifiedMaintainer = session?.user ? Boolean(await db.repositoryMaintainer.findFirst({
    where: { repositoryId: repository.id, userId: session.user.id, verifiedAt: { not: null } },
    select: { id: true },
  })) : false;
  const latestSnapshot = repository.metricSnapshots[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/explore" className="mb-7 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-violet-600 dark:hover:text-violet-400">
        <ArrowLeft aria-hidden="true" className="size-4" /> Explore repositories
      </Link>
      <header className="relative isolate overflow-hidden rounded-3xl border border-violet-200/70 bg-violet-50/50 p-6 dark:border-violet-900/60 dark:bg-violet-950/15 sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-700/15" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1 basis-96">
            <div className="mb-4 flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600 dark:border-violet-800 dark:bg-neutral-950 dark:text-violet-400"><Code2 aria-hidden="true" className="size-5" /></span>
              <span className="break-all font-mono">{repository.owner} /</span>
            </div>
            <h1 className="break-words text-4xl font-semibold tracking-tight sm:text-5xl">{repository.name}</h1>
            {repository.description ? (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">{repository.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <a
            href={repository.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
          >
            View on GitHub
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
          {session?.user && repository.isIndexed ? <form action={setRepositorySaved.bind(null, repository.id, !saved)}>
            <Button type="submit" variant="outline" className="h-11 rounded-xl" aria-pressed={saved}><Bookmark aria-hidden="true" className={saved ? "fill-current" : ""} />{saved ? "Saved" : "Save"}</Button>
          </form> : null}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-violet-200/60 pt-6 text-sm text-neutral-600 dark:border-violet-900/60 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <Star className="size-4" />
            {formatStars(repository.stars)} stars
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="size-4" />
            {formatStars(repository.forks)} forks
          </span>
          {repository.primaryLanguage ? (
            <span className="flex items-center gap-1">
              <Circle className="size-2.5 fill-current" />
              {repository.primaryLanguage}
            </span>
          ) : null}
          {repository.license ? <span>{repository.license}</span> : null}
          {repository.isFixture ? <Badge variant="outline">Fixture data</Badge> : null}
          {repository.isArchived ? <Badge variant="secondary">Archived</Badge> : null}
          {repository.isLocked ? <Badge variant="warning">Locked by a moderator</Badge> : null}
          {!repository.isIndexed ? <Badge variant="danger">Deleted listing · admin only</Badge> : null}
          {repository.availability !== "AVAILABLE" ? <Badge variant="outline">Currently unavailable</Badge> : null}
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="status-heading" className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Repository pulse</p>
              <ConfidenceBadge confidence={repository.statusConfidence} />
            </div>
            <h2 id="status-heading"><StatusBadge status={repository.status} className="gap-3 whitespace-normal rounded-none border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight dark:bg-transparent sm:text-3xl [&_svg]:size-6 [&_svg]:shrink-0" /></h2>
            <p className="mt-3 text-sm leading-7 text-neutral-600 dark:text-neutral-400">
              {repository.statusReason ?? STATUS_DESCRIPTION[repository.status]}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden="true" className="size-3.5" />{repository.statusVerified ? "Explicit / verified classification" : "Inferred from repository signals"}</span>
              <a href="#evidence" className="inline-flex items-center gap-1 font-medium text-violet-700 hover:underline dark:text-violet-400">See the evidence <ArrowUpRight aria-hidden="true" className="size-3.5" /></a>
            </div>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-6 py-3 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 sm:px-8">
              <span>{repository.lastAnalyzedAt ? `Last analysed ${repository.lastAnalyzedAt.toLocaleDateString("en-GB", { timeZone: "UTC" })}` : "Not yet analysed"}</span>
              <span>Analysis v{repository.analysisVersion}</span>
            </div>
          </section>

          {repository.helpCategories.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Make a difference</p>
              <h2 className="mb-4 text-2xl font-semibold tracking-tight">Where you can help</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {repository.helpCategories.map((c) => {
                  const Icon = HELP_CATEGORY_ICON[c.category];
                  return (
                    <div key={c.category} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"><Icon aria-hidden="true" className="size-5" /></span>
                      <div><p className="text-sm font-medium">{HELP_CATEGORY_LABEL[c.category]}</p><p className="mt-0.5 text-xs text-neutral-500">{c.verified ? "Verified need" : "Inferred from signals"}</p></div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="activity-heading">
            <div className="mb-5 flex items-center gap-2.5"><Activity aria-hidden="true" className="size-5 text-violet-500" /><h2 id="activity-heading" className="text-2xl font-semibold tracking-tight">Project activity</h2></div>
            {latestSnapshot ? <>
              <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-4">
                <div className="bg-neutral-50 p-4 dark:bg-neutral-950"><dt className="text-xs text-neutral-500">Active maintainers</dt><dd className="mt-3 text-2xl font-semibold tabular-nums">{latestSnapshot.activeMaintainersLast365d}</dd><dd className="mt-1 text-xs text-neutral-500">last 12 months</dd></div>
                <div className="bg-neutral-50 p-4 dark:bg-neutral-950"><dt className="text-xs text-neutral-500">Open issues</dt><dd className="mt-3 text-2xl font-semibold tabular-nums">{formatStars(latestSnapshot.openIssues)}</dd></div>
                <div className="bg-neutral-50 p-4 dark:bg-neutral-950"><dt className="text-xs text-neutral-500">Open PRs</dt><dd className="mt-3 text-2xl font-semibold tabular-nums">{formatStars(latestSnapshot.openPullRequests)}</dd></div>
                <div className="bg-neutral-50 p-4 dark:bg-neutral-950"><dt className="text-xs text-neutral-500">Median PR age</dt><dd className="mt-3 text-2xl font-semibold tabular-nums">{latestSnapshot.medianOpenPrAgeDays === null ? "—" : Math.round(latestSnapshot.medianOpenPrAgeDays)}</dd><dd className="mt-1 text-xs text-neutral-500">{latestSnapshot.medianOpenPrAgeDays === null ? "Not available" : "days open"}</dd></div>
              </dl>
              <ActivityCharts snapshots={repository.metricSnapshots} />
            </> : <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">Activity will appear after this repository has been analysed.</p>}
          </section>

          <OpenOpportunities issues={repository.issues} />

          <section id="evidence" aria-labelledby="evidence-heading" className="scroll-mt-24">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Behind the status</p><h2 id="evidence-heading" className="text-2xl font-semibold tracking-tight">Evidence &amp; signals</h2></div>
              <span className="shrink-0 font-mono text-xs text-neutral-500">{repository.evidence.length} signals</span>
            </div>
            {repository.evidence.length > 0 ? <div className="grid grid-cols-1 gap-3">
              {repository.evidence.map((e) => <EvidenceCard key={e.id} evidence={e} />)}
            </div> : <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">No supporting evidence has been recorded yet.</p>}
          </section>
        </div>

        <div className={isAdmin ? "order-first min-w-0 space-y-5 lg:order-none" : "min-w-0 space-y-5"}>
          {isAdmin ? <Card className="rounded-2xl border-blue-200 dark:border-blue-900">
            <CardHeader><CardTitle><span className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4" />Repository management</span></CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <Link href="/admin" className="text-xs text-neutral-500 underline underline-offset-4">Back to admin</Link>
              <ModerationControls repository={{ id: repository.id, fullName: repository.fullName, isIndexed: repository.isIndexed, isLocked: repository.isLocked, isFeatured: repository.isFeatured }} />
              <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <h3 className="text-sm font-semibold">Reports &amp; feedback ({reports.length})</h3>
                {reports.length ? reports.map((report) => <div key={report.id} className="space-y-2 rounded-md bg-neutral-50 p-3 text-xs dark:bg-neutral-900">
                  <p className="font-medium">{report.type.replaceAll("_", " ")}</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{report.notes ?? "No additional details."}</p>
                  <p className="text-neutral-500">{report.user.githubLogin ?? report.user.name ?? "User"} · {report.createdAt.toLocaleDateString("en-GB", { timeZone: "UTC" })}</p>
                  <form action={resolveReport.bind(null, repository.id, report.id)}><Button type="submit" variant="outline" size="sm">Mark resolved</Button></form>
                </div>) : <p className="text-xs text-neutral-500">No open reports or feedback.</p>}
              </div>
            </CardContent>
          </Card> : null}
          {repository.isIndexed && repository.availability === "AVAILABLE" ? <UpvoteButton
            repositoryId={repository.id}
            count={repository._count.upvotes}
            upvoted={upvoted}
            signedIn={Boolean(session?.user)}
            repositoryPath={`/${repository.owner}/${repository.name}`}
          /> : null}
          {repository.isIndexed && !repository.isLocked ? <ClaimBanner
            owner={repository.owner}
            repo={repository.name}
            activeRequest={activeRequest}
            isSignedIn={Boolean(session?.user)}
          /> : null}
          <ContributorsList maintainers={repository.maintainers} />
          {repository.isIndexed ? <details className="group rounded-2xl border border-border bg-card text-card-foreground">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg p-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              Give feedback
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <CardContent>
              <h2 className="mb-3 text-sm font-semibold">Is this status inaccurate?</h2>
              {session?.user ? <form action={submitRepositoryFeedback.bind(null, repository.owner, repository.name)} className="space-y-3">
                {verifiedMaintainer ? <p className="text-xs text-emerald-600">Verified maintainer feedback receives higher trust.</p> : <p className="text-xs text-neutral-500">Feedback is reviewed and does not automatically change the status.</p>}
                <Select name="type" required defaultValue="INACCURATE">
                  <SelectTrigger aria-label="Feedback type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {verifiedMaintainer ? <><SelectItem value="NEED_CONTRIBUTORS">We&rsquo;re looking for contributors</SelectItem>
                    <SelectItem value="NEED_COMAINTAINERS">We&rsquo;re looking for co-maintainers</SelectItem>
                    <SelectItem value="NEED_SUCCESSOR">We&rsquo;re looking for a successor</SelectItem>
                    <SelectItem value="NOT_LOOKING">We&rsquo;re not looking for help</SelectItem>
                    <SelectItem value="INTENTIONALLY_STABLE">This project is intentionally stable</SelectItem></> : null}
                    <SelectItem value="INACCURATE">This classification is inaccurate</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea name="notes" maxLength={2000} placeholder="Optional context" aria-label="Additional feedback context" />
                <Button type="submit" size="sm">Send feedback</Button>
              </form> : <Button asChild variant="outline" size="sm"><Link href="/sign-in">Sign in to send feedback</Link></Button>}
            </CardContent>
          </details> : null}
          {repository.isIndexed ? <details id="report" open={reportSent || reportState === "open"} className="group scroll-mt-20 rounded-2xl border border-border bg-card text-card-foreground">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg p-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2"><Flag aria-hidden="true" className="size-4" />Report repository</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <CardContent>
              {reportSent ? <p role="status" className="mb-3 text-sm text-green-700 dark:text-green-400">Report sent. An admin can now review it.</p> : null}
              {session?.user ? <form action={submitRepositoryFeedback.bind(null, repository.owner, repository.name)} className="space-y-3">
                <input type="hidden" name="type" value="REPORT" />
                <label className="block space-y-2 text-xs font-medium">What should we look into?
                  <Textarea name="notes" required minLength={1} maxLength={2000} rows={3} placeholder="Spam, misleading information, or another concern…" />
                </label>
                <p className="text-xs text-neutral-500">Your report and account name are visible only to admins.</p>
                <Button type="submit" variant="outline" size="sm">Send report</Button>
              </form> : <Button asChild variant="outline" size="sm"><Link href={`/sign-in?callbackUrl=${encodeURIComponent(`/${repository.owner}/${repository.name}?report=open#report`)}`}>Sign in to report</Link></Button>}
            </CardContent>
          </details> : null}
          {repository.topics.length > 0 ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Topics</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {repository.topics.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
