import type { RawRepositoryData } from "../github/types";
import { median, daysBetween, hoursBetween } from "./statUtils";
import { isBotAccount } from "../github/bots";

export interface ComputedMetrics {
  issuesSampled?: boolean;
  openIssues: number;
  openPullRequests: number;
  newIssuesLast90d: number;
  closedIssuesLast90d: number;
  newPullRequestsLast90d: number;
  closedPullRequestsLast90d: number;

  commitsLast30d: number;
  commitsLast90d: number;
  commitsLast365d: number;

  activeMaintainersLast90d: number;
  activeMaintainersLast365d: number;
  topContributorShareLast365d: number | null;

  medianOpenIssueAgeDays: number | null;
  medianOpenPrAgeDays: number | null;
  medianPrCycleTimeHours: number | null;

  daysSinceLastCommit: number | null;
  daysSinceLastRelease: number | null;

  helpWantedIssueCount: number;
  goodFirstIssueCount: number;
  staleDependencyOrSecurityPrCount: number;
}

const HELP_WANTED_LABEL = /help.?wanted/i;
const GOOD_FIRST_ISSUE_LABEL = /good.?first.?issue|beginner.?friendly|first-timers?-only/i;
const DEPENDENCY_OR_SECURITY_LABEL = /security|dependenc/i;

export function computeMetrics(raw: RawRepositoryData, now: Date = new Date()): ComputedMetrics {
  const openIssueItems = raw.issues.filter((i) => !i.isPullRequest && i.state === "open");
  const openPrItems = raw.issues.filter((i) => i.isPullRequest && i.state === "open");
  const closedIssueItems = raw.issues.filter((i) => !i.isPullRequest && i.state === "closed");
  const closedPrItems = raw.issues.filter((i) => i.isPullRequest && i.state === "closed");

  const newIssuesLast90d = raw.issues.filter(
    (i) => !i.isPullRequest && daysBetween(i.createdAt, now) <= 90
  ).length;
  const closedIssuesLast90d = closedIssueItems.filter(
    (i) => i.closedAt && daysBetween(i.closedAt, now) <= 90
  ).length;
  const newPullRequestsLast90d = raw.issues.filter(
    (i) => i.isPullRequest && daysBetween(i.createdAt, now) <= 90
  ).length;
  const closedPullRequestsLast90d = closedPrItems.filter(
    (i) => i.closedAt && daysBetween(i.closedAt, now) <= 90
  ).length;

  const commitsLast30d = sumCommitActivity(raw, now, 30);
  const commitsLast90d = sumCommitActivity(raw, now, 90);
  const commitsLast365d = sumCommitActivity(raw, now, 365);

  const { activeLast90, activeLast365, topShare365 } = contributorActivity(raw, now);

  const medianOpenIssueAgeDays = raw.issuesTruncated ? null : median(openIssueItems.map((i) => daysBetween(i.createdAt, now)));
  const medianOpenPrAgeDays = raw.issuesTruncated ? null : median(openPrItems.map((i) => daysBetween(i.createdAt, now)));

  const recentClosedPrs = closedPrItems.filter((i) => i.closedAt && daysBetween(i.closedAt, now) <= 180);
  const medianPrCycleTimeHours = (raw.closedIssuesTruncated ?? raw.issuesTruncated) ? null : median(
    recentClosedPrs.map((i) => hoursBetween(i.createdAt, i.closedAt!))
  );

  const daysSinceLastCommit = raw.pushedAt ? Math.round(daysBetween(raw.pushedAt, now)) : null;
  const daysSinceLastRelease = raw.latestReleaseAt ? Math.round(daysBetween(raw.latestReleaseAt, now)) : null;

  const helpWantedIssueCount = openIssueItems.filter((i) => i.labels.some((l) => HELP_WANTED_LABEL.test(l))).length;
  const goodFirstIssueCount = openIssueItems.filter((i) =>
    i.labels.some((l) => GOOD_FIRST_ISSUE_LABEL.test(l))
  ).length;

  const staleDependencyOrSecurityPrCount = openPrItems.filter(
    (i) => !isBotAccount(i.authorLogin ?? "") && i.labels.some((l) => DEPENDENCY_OR_SECURITY_LABEL.test(l)) && daysBetween(i.createdAt, now) > 30
  ).length;

  return {
    issuesSampled: raw.issuesTruncated ?? false,
    openIssues: openIssueItems.length,
    openPullRequests: openPrItems.length,
    newIssuesLast90d,
    closedIssuesLast90d,
    newPullRequestsLast90d,
    closedPullRequestsLast90d,
    commitsLast30d,
    commitsLast90d,
    commitsLast365d,
    activeMaintainersLast90d: activeLast90,
    activeMaintainersLast365d: activeLast365,
    topContributorShareLast365d: topShare365,
    medianOpenIssueAgeDays,
    medianOpenPrAgeDays,
    medianPrCycleTimeHours,
    daysSinceLastCommit,
    daysSinceLastRelease,
    helpWantedIssueCount,
    goodFirstIssueCount,
    staleDependencyOrSecurityPrCount,
    ...raw.issueStatistics,
  };
}

function sumCommitActivity(raw: RawRepositoryData, now: Date, windowDays: number): number {
  return raw.commitActivity
    .filter((w) => daysBetween(w.weekStart, now) <= windowDays)
    .reduce((sum, w) => sum + w.total, 0);
}

function contributorActivity(
  raw: RawRepositoryData,
  now: Date
): { activeLast90: number; activeLast365: number; topShare365: number | null } {
  let activeLast90 = 0;
  let activeLast365 = 0;
  const commitsPerAuthorLast365: number[] = [];

  for (const contributor of raw.contributorStats) {
    if (isBotAccount(contributor.login)) continue;
    const commits90 = contributor.weeks
      .filter((w) => daysBetween(w.weekStart, now) <= 90)
      .reduce((s, w) => s + w.commits, 0);
    const commits365 = contributor.weeks
      .filter((w) => daysBetween(w.weekStart, now) <= 365)
      .reduce((s, w) => s + w.commits, 0);

    if (commits90 > 0) activeLast90++;
    if (commits365 > 0) {
      activeLast365++;
      commitsPerAuthorLast365.push(commits365);
    }
  }

  const totalCommits365 = commitsPerAuthorLast365.reduce((a, b) => a + b, 0);
  const topShare365 =
    totalCommits365 >= 5 ? Math.max(...commitsPerAuthorLast365) / totalCommits365 : null;

  return { activeLast90, activeLast365, topShare365 };
}
