import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, GitFork, ExternalLink, Circle, Bookmark, ShieldCheck, Flag, ChevronDown } from "lucide-react";

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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <Link href={`/explore?language=${encodeURIComponent(repository.primaryLanguage ?? "")}`} className="hover:underline">
            {repository.owner}
          </Link>
          <span>/</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{repository.name}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{repository.fullName}</h1>
            {repository.description ? (
              <p className="mt-1 max-w-2xl text-neutral-600 dark:text-neutral-400">{repository.description}</p>
            ) : null}
          </div>
          <a
            href={repository.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            View on GitHub
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
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
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={repository.status} />
              <ConfidenceBadge confidence={repository.statusConfidence} />
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {repository.statusReason ?? STATUS_DESCRIPTION[repository.status]}
            </p>
          </section>

          <Card>
            <CardHeader><CardTitle>How this was calculated</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <p><strong className="text-neutral-900 dark:text-neutral-100">{repository.statusVerified ? "Explicit / verified" : "Inferred"}</strong> classification with {repository.statusConfidence.toLowerCase()} confidence.</p>
              <p>{repository.statusReason ?? STATUS_DESCRIPTION[repository.status]}</p>
              {latestSnapshot ? <p>{latestSnapshot.activeMaintainersLast365d} active maintainers · {latestSnapshot.openIssues} open issues · {latestSnapshot.openPullRequests} open PRs · median PR age {latestSnapshot.medianOpenPrAgeDays === null ? "unknown" : `${Math.round(latestSnapshot.medianOpenPrAgeDays)} days`}.</p> : null}
              <p>Analysis v{repository.analysisVersion} · {repository.lastAnalyzedAt ? repository.lastAnalyzedAt.toLocaleDateString("en-GB") : "not yet analysed"}</p>
            </CardContent>
          </Card>

          {repository.helpCategories.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">Help needed</h2>
              <div className="flex flex-wrap gap-2">
                {repository.helpCategories.map((c) => {
                  const Icon = HELP_CATEGORY_ICON[c.category];
                  return (
                    <Badge key={c.category} variant={c.verified ? "default" : "outline"} className="gap-1.5 py-1">
                      <Icon className="size-3.5" />
                      {HELP_CATEGORY_LABEL[c.category]}
                      {!c.verified ? <span className="text-[0.65rem] opacity-70">(inferred)</span> : null}
                    </Badge>
                  );
                })}
              </div>
            </section>
          ) : null}

          {repository.evidence.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">Why maintain.help thinks this</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {repository.evidence.map((e) => (
                  <EvidenceCard key={e.id} evidence={e} />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Activity</h2>
            <ActivityCharts snapshots={repository.metricSnapshots} />
          </section>

          <OpenOpportunities issues={repository.issues} />
        </div>

        <div className={isAdmin ? "order-first space-y-4 lg:order-none" : "space-y-4"}>
          {isAdmin ? <Card className="border-blue-200 dark:border-blue-900">
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
          {session?.user && repository.isIndexed ? <form action={setRepositorySaved.bind(null, repository.id, !saved)}>
            <Button type="submit" variant="outline" className="w-full"><Bookmark className={saved ? "fill-current" : ""} />{saved ? "Unsave repository" : "Save repository"}</Button>
          </form> : null}
          {repository.isIndexed && !repository.isLocked ? <ClaimBanner
            owner={repository.owner}
            repo={repository.name}
            activeRequest={activeRequest}
            isSignedIn={Boolean(session?.user)}
          /> : null}
          <ContributorsList maintainers={repository.maintainers} />
          {repository.isIndexed ? <details className="group rounded-lg border border-border bg-card text-card-foreground">
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
          {repository.isIndexed ? <details id="report" open={reportSent || reportState === "open"} className="group scroll-mt-20 rounded-lg border border-border bg-card text-card-foreground">
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
            <Card>
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
