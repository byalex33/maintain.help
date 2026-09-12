import type { db as Database } from "@/lib/db";
import type { RawRepositoryData } from "../github/types";
import type { AnalysisResult } from "./analyze";
import { mapLabelsToCategory } from "./categories";
import { daysBetween } from "./statUtils";
import type { Prisma } from "@/generated/prisma/client";
import { isBotAccount } from "../github/bots";

type AnalysisDatabase = typeof Database | Prisma.TransactionClient;

/**
 * Persists everything derived from one analysis run: help categories,
 * evidence, open-issue snapshots, maintainer/contributor rows, a metric
 * snapshot, and a status-history entry. Shared by the fixture seed script
 * and the real ingestion pipeline so both stay in sync with the schema.
 */
export async function persistRepositoryAnalysis(
  db: AnalysisDatabase,
  repositoryId: string,
  raw: RawRepositoryData,
  analysis: AnalysisResult,
  options: { now?: Date; createMetricSnapshot?: boolean } = {}
) {
  const now = options.now ?? new Date();
  const createMetricSnapshot = options.createMetricSnapshot ?? true;

  await db.repositoryHelpCategory.deleteMany({ where: { repositoryId } });
  await db.repositoryEvidence.deleteMany({ where: { repositoryId } });
  await db.gitHubIssue.deleteMany({ where: { repositoryId } });
  await db.repositoryMaintainer.deleteMany({ where: { repositoryId, userId: null, verifiedAt: null } });
  await db.repositoryMaintainer.updateMany({ where: { repositoryId }, data: { commitsLast365d: 0, isActive: false } });

  if (analysis.categories.length > 0) {
    await db.repositoryHelpCategory.createMany({
      data: analysis.categories.map((c) => ({ repositoryId, category: c.category, verified: c.verified })),
    });
  }

  if (analysis.evidence.length > 0) {
    await db.repositoryEvidence.createMany({
      data: analysis.evidence.map((e) => ({
        repositoryId,
        type: e.type,
        title: e.title,
        description: e.description,
        sourceUrl: e.sourceUrl,
        sourceType: e.sourceType,
        confidence: e.confidence,
      })),
    });
  }

  if (raw.issues.length > 0) {
    await db.gitHubIssue.createMany({
      data: raw.issues.map((i) => ({
        repositoryId,
        githubIssueId: BigInt(i.githubIssueId),
        number: i.number,
        title: i.title,
        url: i.url,
        state: i.state,
        labels: i.labels,
        isPullRequest: i.isPullRequest,
        createdAtGithub: new Date(i.createdAt),
        updatedAtGithub: new Date(i.updatedAt),
        closedAtGithub: i.closedAt ? new Date(i.closedAt) : null,
        commentCount: i.commentCount,
        category: mapLabelsToCategory(i.labels),
      })),
    });
  }

  const contributors = raw.contributorStats.filter((c) => !isBotAccount(c.login)).map((c) => {
    const commitsLast365d = c.weeks
      .filter((w) => daysBetween(w.weekStart, now) <= 365)
      .reduce((s, w) => s + w.commits, 0);
    return { githubLogin: c.login, commitsLast365d, isActive: commitsLast365d > 0 };
  });
  if (contributors.length > 0) {
    await db.repositoryMaintainer.createMany({
      data: contributors.map((stats) => ({ repositoryId, role: "maintainer", ...stats })),
      skipDuplicates: true,
    });
    // Refresh all retained claimants in one round trip without changing identity fields.
    await db.$executeRaw`
      UPDATE "RepositoryMaintainer" AS maintainer
      SET "commitsLast365d" = stats."commitsLast365d", "isActive" = stats."isActive"
      FROM jsonb_to_recordset(${JSON.stringify(contributors)}::jsonb)
        AS stats("githubLogin" text, "commitsLast365d" integer, "isActive" boolean)
      WHERE maintainer."repositoryId" = ${repositoryId}
        AND maintainer."githubLogin" = stats."githubLogin"
    `;
  }

  if (createMetricSnapshot) {
    await db.repositoryMetricSnapshot.create({
      data: {
        repositoryId,
        capturedAt: now,
        analysisVersion: analysis.version,
        stars: raw.stars,
        forks: raw.forks,
        openIssues: analysis.metrics.openIssues,
        openPullRequests: analysis.metrics.openPullRequests,
        newIssuesLast90d: analysis.metrics.newIssuesLast90d,
        closedIssuesLast90d: analysis.metrics.closedIssuesLast90d,
        newPullRequestsLast90d: analysis.metrics.newPullRequestsLast90d,
        closedPullRequestsLast90d: analysis.metrics.closedPullRequestsLast90d,
        commitsLast30d: analysis.metrics.commitsLast30d,
        commitsLast90d: analysis.metrics.commitsLast90d,
        commitsLast365d: analysis.metrics.commitsLast365d,
        activeMaintainersLast90d: analysis.metrics.activeMaintainersLast90d,
        activeMaintainersLast365d: analysis.metrics.activeMaintainersLast365d,
        medianOpenIssueAgeDays: analysis.metrics.medianOpenIssueAgeDays,
        medianOpenPrAgeDays: analysis.metrics.medianOpenPrAgeDays,
        medianPrReviewTimeHours: analysis.metrics.medianPrCycleTimeHours,
        daysSinceLastCommit: analysis.metrics.daysSinceLastCommit,
        daysSinceLastRelease: analysis.metrics.daysSinceLastRelease,
        helpWantedIssueCount: analysis.metrics.helpWantedIssueCount,
        goodFirstIssueCount: analysis.metrics.goodFirstIssueCount,
        capacityPressureScore: analysis.capacityPressureScore,
        beginnerFriendlyScore: analysis.beginnerFriendlyScore,
      },
    });
  }

  await db.repositoryStatus.create({
    data: {
      repositoryId,
      status: analysis.status.status,
      confidence: analysis.status.confidence,
      verified: analysis.status.verified,
      reason: analysis.status.reason,
      analysisVersion: analysis.version,
    },
  });
}
