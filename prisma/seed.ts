import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildFixtureRepositories } from "./fixtures/repositories";
import { analyzeRepository } from "../src/lib/detection/analyze";
import { persistRepositoryAnalysis } from "../src/lib/detection/persist";
import { ANALYSIS_VERSION } from "../src/lib/detection/version";
import { nextAnalysisDate } from "../src/lib/analysisSchedule";
import { databasePoolConfig } from "../src/lib/databasePool";

const adapter = new PrismaPg(databasePoolConfig());
const db = new PrismaClient({ adapter });

async function main() {
  const now = new Date();
  const repos = buildFixtureRepositories(now);

  console.log(`Seeding ${repos.length} fixture repositories...`);

  for (const raw of repos) {
    const analysis = analyzeRepository(raw, { now });

    const repository = await db.repository.upsert({
      where: { githubId: BigInt(raw.githubId) },
      create: {
        githubId: BigInt(raw.githubId),
        owner: raw.owner,
        name: raw.name,
        fullName: raw.fullName,
        description: raw.description,
        url: raw.url,
        homepage: raw.homepage,
        primaryLanguage: raw.primaryLanguage,
        languages: raw.languages,
        topics: raw.topics,
        labels: raw.labels ?? [],
        stars: raw.stars,
        forks: raw.forks,
        watchers: raw.watchers,
        openIssueCount: raw.openIssueCount,
        isArchived: raw.isArchived,
        isFork: raw.isFork,
        createdAtGithub: new Date(raw.createdAtGithub),
        pushedAt: raw.pushedAt ? new Date(raw.pushedAt) : null,
        latestReleaseTag: raw.latestReleaseTag,
        latestReleaseAt: raw.latestReleaseAt ? new Date(raw.latestReleaseAt) : null,
        license: raw.license,
        defaultBranch: raw.defaultBranch,
        status: analysis.status.status,
        statusConfidence: analysis.status.confidence,
        statusVerified: analysis.status.verified,
        statusReason: analysis.status.reason,
        capacityPressureScore: analysis.capacityPressureScore,
        beginnerFriendlyScore: analysis.beginnerFriendlyScore,
        isBeginnerFriendly: analysis.isBeginnerFriendly,
        isFixture: true,
        isIndexed: true,
        lastAnalyzedAt: now,
        nextAnalysisAt: nextAnalysisDate({ isArchived: raw.isArchived, stars: raw.stars, statusVerified: analysis.status.verified }, now),
        analysisVersion: ANALYSIS_VERSION,
      },
      update: {
        description: raw.description,
        stars: raw.stars,
        forks: raw.forks,
        watchers: raw.watchers,
        openIssueCount: raw.openIssueCount,
        pushedAt: raw.pushedAt ? new Date(raw.pushedAt) : null,
        latestReleaseTag: raw.latestReleaseTag,
        latestReleaseAt: raw.latestReleaseAt ? new Date(raw.latestReleaseAt) : null,
        status: analysis.status.status,
        statusConfidence: analysis.status.confidence,
        statusVerified: analysis.status.verified,
        statusReason: analysis.status.reason,
        capacityPressureScore: analysis.capacityPressureScore,
        beginnerFriendlyScore: analysis.beginnerFriendlyScore,
        isBeginnerFriendly: analysis.isBeginnerFriendly,
        isFixture: true,
        lastAnalyzedAt: now,
        nextAnalysisAt: nextAnalysisDate({ isArchived: raw.isArchived, stars: raw.stars, statusVerified: analysis.status.verified }, now),
        analysisVersion: ANALYSIS_VERSION,
        analysisError: null,
      },
    });

    // Categories, evidence, issues, and maintainers; status history too, but we
    // create our own backdated metric snapshots below instead of a single one.
    await persistRepositoryAnalysis(db, repository.id, raw, analysis, { now, createMetricSnapshot: false });
    await db.repositoryMetricSnapshot.deleteMany({ where: { repositoryId: repository.id } });

    // Backdated snapshots so the activity charts have a trend to show, not just one point.
    // Interpolated from the current metrics — a real ingestion pipeline would instead
    // accumulate one real snapshot per analysis run over time.
    const trend = analysis.capacityPressureScore / 100;
    const snapshotOffsetsDays = [90, 60, 30, 0];
    for (const offset of snapshotOffsetsDays) {
      const age = offset / 30; // 3, 2, 1, 0
      const capturedAt = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
      await db.repositoryMetricSnapshot.create({
        data: {
          repositoryId: repository.id,
          capturedAt,
          analysisVersion: ANALYSIS_VERSION,
          stars: Math.round(raw.stars * (1 - 0.01 * age)),
          forks: raw.forks,
          openIssues: Math.max(0, Math.round(analysis.metrics.openIssues * (1 - trend * 0.15 * age))),
          openPullRequests: Math.max(0, Math.round(analysis.metrics.openPullRequests * (1 - trend * 0.15 * age))),
          newIssuesLast90d: analysis.metrics.newIssuesLast90d,
          closedIssuesLast90d: analysis.metrics.closedIssuesLast90d,
          newPullRequestsLast90d: analysis.metrics.newPullRequestsLast90d,
          closedPullRequestsLast90d: analysis.metrics.closedPullRequestsLast90d,
          commitsLast30d: Math.max(0, Math.round(analysis.metrics.commitsLast30d * (1 + trend * 0.3 * age))),
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
          capacityPressureScore: Math.max(0, Math.round(analysis.capacityPressureScore * (1 - 0.2 * age))),
          beginnerFriendlyScore: analysis.beginnerFriendlyScore,
        },
      });
    }

    console.log(`  ${raw.fullName} -> ${analysis.status.status} (${analysis.status.confidence})`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
