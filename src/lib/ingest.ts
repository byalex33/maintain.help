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

export class RepositoryModerationError extends Error {}

/**
 * Fetches a repository from GitHub, runs the detection/scoring engine, and
 * persists everything. Used by both the "add repository" flow and scheduled
 * reanalysis. A repository that has been claimed keeps its verified
 * maintainer status as the source of truth — this only refreshes the
 * underlying evidence and metrics.
 */
export async function ingestRepository(owner: string, repo: string, options: {
  submittedById?: string;
  verifiedMaintainer?: { githubId: number; userId: string; githubLogin: string };
} = {}) {
  const listing = await db.repository.findFirst({ where: { fullName: { equals: `${owner}/${repo}`, mode: "insensitive" } } });
  if (listing && (!listing.isIndexed || listing.isLocked)) throw new RepositoryModerationError("This repository was deleted or locked by a moderator.");
  let raw: RawRepositoryData;
  try {
    raw = await fetchRepositoryData(owner, repo);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown GitHub error";
    await db.repository.updateMany({
      where: { fullName: { equals: `${owner}/${repo}`, mode: "insensitive" }, isIndexed: true, isLocked: false },
      data: {
        analysisError: message,
        ...(error instanceof GitHubNotFoundError ? { availability: RepositoryAvailability.UNAVAILABLE } : {}),
      },
    });
    throw error;
  }

  // Bind the user's permission check to the same repository that analysis fetched.
  if (options.verifiedMaintainer && String(raw.githubId) !== String(options.verifiedMaintainer.githubId)) {
    throw new RepositoryModerationError("The repository changed while it was being added. Please try again.");
  }

  const existing = await db.repository.findFirst({
    where: { OR: [{ githubId: BigInt(raw.githubId) }, { fullName: raw.fullName }] },
    include: { maintainerRequests: { where: { isActive: true }, take: 1 } },
  });
  // The numeric ID also protects renamed repositories from being re-imported.
  if (existing && (!existing.isIndexed || existing.isLocked)) throw new RepositoryModerationError("This repository was deleted or locked by a moderator.");

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
      // Recheck in the write itself so an in-flight import cannot undo moderation.
      where: { ...repositoryCanonicalKey(raw.githubId), isIndexed: true, isLocked: false },
      create: { ...values, submittedById: options.submittedById ?? null },
      update: { ...values, ...(options.submittedById && !existing?.submittedById ? { submittedById: options.submittedById } : {}) },
    });
    await persistRepositoryAnalysis(tx, saved.id, raw, analysis, { now });
    if (options.verifiedMaintainer) {
      const { userId, githubLogin } = options.verifiedMaintainer;
      await tx.repositoryMaintainer.upsert({
        where: { repositoryId_githubLogin: { repositoryId: saved.id, githubLogin } },
        create: { repositoryId: saved.id, githubLogin, userId, role: "maintainer", verifiedAt: now, isActive: true },
        update: { userId, verifiedAt: now },
      });
    }
    return saved;
  }, { timeout: 30_000 });

  return repository;
}
