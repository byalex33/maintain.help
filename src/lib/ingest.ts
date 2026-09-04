import "server-only";
import { db } from "@/lib/db";
import { fetchRepositoryData } from "@/lib/github/fetchRepositoryData";
import { analyzeRepository } from "@/lib/detection/analyze";
import { persistRepositoryAnalysis } from "@/lib/detection/persist";
import { ANALYSIS_VERSION } from "@/lib/detection/version";
import { nextAnalysisDate } from "@/lib/analysisSchedule";
import { GitHubNotFoundError } from "@/lib/github/client";
import { RepositoryAvailability } from "@/generated/prisma/enums";
import type { RawRepositoryData } from "@/lib/github/types";
import { repositoryCanonicalKey } from "@/lib/repositoryIdentity";

/**
 * Fetches a repository from GitHub, runs the detection/scoring engine, and
 * persists everything. Used by both the "add repository" flow and scheduled
 * reanalysis. A repository that has been claimed keeps its verified
 * maintainer status as the source of truth — this only refreshes the
 * underlying evidence and metrics.
 */
export async function ingestRepository(owner: string, repo: string, options: { submittedById?: string } = {}) {
  let raw: RawRepositoryData;
  try {
    raw = await fetchRepositoryData(owner, repo);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown GitHub error";
    await db.repository.updateMany({
      where: { fullName: { equals: `${owner}/${repo}`, mode: "insensitive" } },
      data: {
        analysisError: message,
        ...(error instanceof GitHubNotFoundError ? { availability: RepositoryAvailability.UNAVAILABLE } : {}),
      },
    });
    throw error;
  }

  const existing = await db.repository.findFirst({
    where: { OR: [{ githubId: BigInt(raw.githubId) }, { fullName: raw.fullName }] },
    include: { maintainerRequests: { where: { isActive: true }, take: 1 } },
  });

  const activeRequest = existing?.maintainerRequests[0] ?? null;
  const analysis = analyzeRepository(raw, {
    maintainerOverride: activeRequest ? { status: activeRequest.status, message: activeRequest.message } : null,
  });

  const now = new Date();
  const values = {
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
      isFixture: false,
      isIndexed: true,
      lastAnalyzedAt: now,
      nextAnalysisAt: nextAnalysisDate({
        isArchived: raw.isArchived,
        stars: raw.stars,
        statusVerified: analysis.status.verified,
      }, now),
      analysisVersion: ANALYSIS_VERSION,
      analysisError: null,
      availability: RepositoryAvailability.AVAILABLE,
  };

  const repository = await db.$transaction(async (tx) => {
    const saved = await tx.repository.upsert({
      where: repositoryCanonicalKey(raw.githubId),
      create: { ...values, submittedById: options.submittedById ?? null },
      update: { ...values, ...(options.submittedById && !existing?.submittedById ? { submittedById: options.submittedById } : {}) },
    });
    await persistRepositoryAnalysis(tx, saved.id, raw, analysis, { now });
    return saved;
  }, { timeout: 30_000 });

  return repository;
}
