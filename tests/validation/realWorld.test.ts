import { describe, expect, it, vi } from "vitest";
import { HelpStatus, EvidenceSourceType } from "@/generated/prisma/enums";
import { analyzeRepository } from "@/lib/detection/analyze";
import { findSourcedPhraseMatches } from "@/lib/detection/evidence";
import { ANALYSIS_VERSION } from "@/lib/detection/version";
import { isBotAccount } from "@/lib/github/bots";
import { isGitHubRateLimitError } from "@/lib/github/client";
import { feedbackIsTrusted } from "@/lib/feedback";
import { isDueForAnalysis, nextAnalysisDate } from "@/lib/analysisSchedule";
import { setSavedRepository } from "@/lib/savedRepositories";
import { repositoryCanonicalKey } from "@/lib/repositoryIdentity";
import { makeContributor, makeIssue, makeRawRepository } from "../fixtures/rawRepository";

const NOW = new Date("2026-09-04T00:00:00Z");

describe("real-world validation guardrails", () => {
  it("creates verified evidence from recent GitHub Discussions", () => {
    const raw = makeRawRepository({ discussions: [{
      title: "Project maintenance",
      body: "We are looking for co-maintainers to share releases.",
      url: "https://github.com/acme/widget/discussions/42",
      updatedAt: NOW.toISOString(),
      authorAssociation: "MEMBER",
    }] });
    const matches = findSourcedPhraseMatches(raw);
    expect(matches.some((match) => match.sourceType === EvidenceSourceType.GITHUB_DISCUSSION)).toBe(true);
    const result = analyzeRepository(raw, { now: NOW });
    expect(result.status.status).toBe(HelpStatus.SEEKING_MAINTAINERS);
    expect(result.status.verified).toBe(true);
    expect(result.evidence.some((item) => item.sourceUrl?.endsWith("/discussions/42"))).toBe(true);
  });

  it("filters only known or GitHub-typed bot accounts", () => {
    expect(isBotAccount("dependabot[bot]")).toBe(true);
    expect(isBotAccount("renovate-bot")).toBe(true);
    expect(isBotAccount("robotics-botany")).toBe(false);
    expect(isBotAccount("custom-release", "Bot")).toBe(true);
  });

  it("classifies archived repositories as maintenance, never as needing help", () => {
    const result = analyzeRepository(makeRawRepository({
      isArchived: true,
      issues: Array.from({ length: 100 }, () => makeIssue({ createdAt: "2024-01-01T00:00:00Z" })),
    }), { now: NOW });
    expect(result.status.status).toBe(HelpStatus.MAINTENANCE_MODE);
    expect(result.status.reason.toLowerCase()).not.toMatch(/abandoned|dead/);
  });

  it("does not penalise a large active repository solely for raw backlog", () => {
    const contributors = Array.from({ length: 25 }, (_, index) => makeContributor(`human-${index}`, [{ weeksAgo: 1, commits: 2 }], NOW));
    const result = analyzeRepository(makeRawRepository({
      issues: Array.from({ length: 200 }, () => makeIssue({ createdAt: "2026-08-01T00:00:00Z" })),
      contributorStats: contributors,
    }), { now: NOW });
    expect(result.capacityPressureScore).toBeLessThan(20);
    expect(result.status.status).toBe(HelpStatus.HEALTHY);
  });

  it("records the current analysis version and schedules refreshes", () => {
    expect(analyzeRepository(makeRawRepository(), { now: NOW }).version).toBe(ANALYSIS_VERSION);
    const next = nextAnalysisDate({ isArchived: false, stars: 50, statusVerified: false }, NOW);
    expect(isDueForAnalysis(next, NOW)).toBe(false);
    expect(isDueForAnalysis(new Date("2026-09-03"), NOW)).toBe(true);
  });

  it("recognises rate limits without treating every 403 as one", () => {
    expect(isGitHubRateLimitError({ status: 403, response: { headers: { "x-ratelimit-remaining": "0" } } })).toBe(true);
    expect(isGitHubRateLimitError({ status: 403, message: "Resource not accessible" })).toBe(false);
    expect(isGitHubRateLimitError({ status: 429 })).toBe(true);
  });

  it("keeps repository identity stable across a rename or transfer", () => {
    expect(repositoryCanonicalKey(123)).toEqual(repositoryCanonicalKey(123));
    expect(repositoryCanonicalKey(123)).not.toEqual(repositoryCanonicalKey(456));
  });

  it("gives trust only to verified maintainer feedback", () => {
    expect(feedbackIsTrusted(new Date())).toBe(true);
    expect(feedbackIsTrusted(null)).toBe(false);
  });

  it("saves and unsaves idempotently", async () => {
    const store = { upsert: vi.fn().mockResolvedValue({}), deleteMany: vi.fn().mockResolvedValue({}) };
    await setSavedRepository(store, "user", "repo", true);
    await setSavedRepository(store, "user", "repo", false);
    expect(store.upsert).toHaveBeenCalledOnce();
    expect(store.deleteMany).toHaveBeenCalledWith({ where: { userId: "user", repositoryId: "repo" } });
  });
});
