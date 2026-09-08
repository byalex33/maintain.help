import "server-only";
import { db } from "@/lib/db";
import { fetchRepositoryData } from "@/lib/github/fetchRepositoryData";
import { analyzeRepository } from "@/lib/detection/analyze";
import { persistRepositoryAnalysis } from "@/lib/detection/persist";
import { ANALYSIS_VERSION } from "@/lib/detection/version";
import { nextAnalysisDate } from "@/lib/analysisSchedule";
import { GitHubNotFoundError, GitHubPrivateRepositoryError, GitHubRateLimitError } from "@/lib/github/client";
import { RepositoryAvailability } from "@/generated/prisma/enums";
import type { RawRepositoryData } from "@/lib/github/types";
import { repositoryCanonicalKey } from "@/lib/repositoryIdentity";
import { randomUUID } from "node:crypto";
import type { Repository } from "@/generated/prisma/client";

export class RepositoryModerationError extends Error {}
export class RepositoryAnalysisBusyError extends Error {}

const HOUR = 60 * 60 * 1000;

async function cachedRepository(listing: Repository, submittedById?: string) {
  if (!listing.submittedById && submittedById) {
    await db.repository.updateMany({
      where: { id: listing.id, submittedById: null, isIndexed: true, isLocked: false },
      data: { submittedById },
    });
  }
  return listing;
}

/**
 * Fetches a repository from GitHub, runs the detection/scoring engine, and
 * persists everything. Used by both the "add repository" flow and scheduled
 * reanalysis. A repository that has been claimed keeps its verified
 * maintainer status as the source of truth — this only refreshes the
 * underlying evidence and metrics.
 */
export async function ingestRepository(owner: string, repo: string, options: { submittedById?: string } = {}) {
  const listing = await db.repository.findFirst({ where: { fullName: { equals: `${owner}/${repo}`, mode: "insensitive" } } });
  if (listing && (!listing.isIndexed || listing.isLocked)) throw new RepositoryModerationError("This repository was deleted or locked by a moderator.");
  if (listing?.analysisError && listing.nextAnalysisAt && listing.nextAnalysisAt > new Date()) {
    throw new RepositoryAnalysisBusyError("This repository is waiting for its next analysis retry.");
  }
  if (listing?.lastAnalyzedAt && !listing.isFixture && listing.lastAnalyzedAt.getTime() > Date.now() - HOUR) return cachedRepository(listing, options.submittedById);

  const key = `${owner}/${repo}`.toLowerCase();
  const token = randomUUID();
  // Ten minutes exceeds the five-minute route limit; a crashed worker cannot block retries forever.
  const lease = await db.$queryRaw<{ key: string }[]>`
    INSERT INTO "RepositoryAnalysisLease" (key, token, "expiresAt")
    VALUES (${key}, ${token}, NOW() + INTERVAL '10 minutes')
    ON CONFLICT (key) DO UPDATE SET token = EXCLUDED.token, "expiresAt" = EXCLUDED."expiresAt"
    WHERE "RepositoryAnalysisLease"."expiresAt" <= NOW()
    RETURNING key
  `;
  if (!lease.length) throw new RepositoryAnalysisBusyError("This repository is already being analysed. Please try again shortly.");

  try {
    // Another worker may have completed between our initial read and lease acquisition.
    const latest = await db.repository.findFirst({ where: { fullName: { equals: `${owner}/${repo}`, mode: "insensitive" } } });
    if (latest && (!latest.isIndexed || latest.isLocked)) throw new RepositoryModerationError("This repository was deleted or locked by a moderator.");
    if (latest?.lastAnalyzedAt && !latest.isFixture && latest.lastAnalyzedAt.getTime() > Date.now() - HOUR) return cachedRepository(latest, options.submittedById);
    const raw = await fetchRepositoryData(owner, repo);
    return await saveRepository(raw, options, key, token);
  } catch (error) {
    if (error instanceof RepositoryAnalysisBusyError || error instanceof RepositoryModerationError) throw error;
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown GitHub error";
    const nextAnalysisAt = new Date(Math.max(Date.now() + Math.min(24, 2 ** (listing?.analysisFailureCount ?? 0)) * HOUR,
      error instanceof GitHubRateLimitError ? error.resetAt?.getTime() ?? 0 : 0));
    await db.$transaction(async (tx) => {
      const owned = await tx.$queryRaw<{ key: string }[]>`
        SELECT key FROM "RepositoryAnalysisLease" WHERE key = ${key} AND token = ${token} AND "expiresAt" > NOW() FOR UPDATE
      `;
      if (!owned.length) return;
      await tx.repository.updateMany({
        where: { fullName: { equals: `${owner}/${repo}`, mode: "insensitive" }, isIndexed: true, isLocked: false },
        data: {
          analysisError: message,
          nextAnalysisAt,
          analysisFailureCount: { increment: 1 },
          ...(error instanceof GitHubNotFoundError ? { availability: RepositoryAvailability.UNAVAILABLE } : {}),
          ...(error instanceof GitHubPrivateRepositoryError ? { availability: RepositoryAvailability.PRIVATE } : {}),
        },
      });
    });
    throw error;
  }
}

async function saveRepository(raw: RawRepositoryData, options: { submittedById?: string }, key: string, token: string) {
  return db.$transaction(async (tx) => {
    const lease = await tx.$queryRaw<{ key: string }[]>`
      SELECT key FROM "RepositoryAnalysisLease" WHERE key = ${key} AND token = ${token} AND "expiresAt" > NOW() FOR UPDATE
    `;
    if (!lease.length) throw new RepositoryAnalysisBusyError("The analysis timed out. Please try again.");
    // Claims take this same row lock before changing requests and derived classifications.
    await tx.$queryRaw`SELECT id FROM "Repository" WHERE "githubId" = ${BigInt(raw.githubId)} FOR UPDATE`;
    const existing = await tx.repository.findFirst({
      where: { OR: [{ githubId: BigInt(raw.githubId) }, { fullName: raw.fullName }] },
      include: { maintainerRequests: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } },
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
      analysisFailureCount: 0,
      availability: RepositoryAvailability.AVAILABLE,
    };

    const saved = await tx.repository.upsert({
      // Recheck in the write itself so an in-flight import cannot undo moderation.
      where: { ...repositoryCanonicalKey(raw.githubId), isIndexed: true, isLocked: false },
      create: { ...values, submittedById: options.submittedById ?? null },
      update: { ...values, ...(options.submittedById && !existing?.submittedById ? { submittedById: options.submittedById } : {}) },
    });
    await persistRepositoryAnalysis(tx, saved.id, raw, analysis, { now });
    return saved;
  }, { timeout: 30_000 });
}
