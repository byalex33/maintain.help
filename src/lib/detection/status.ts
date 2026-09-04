import { HelpStatus, ConfidenceLevel, WantedHelpStatus } from "@/generated/prisma/enums";
import type { RawRepositoryData } from "../github/types";
import type { ComputedMetrics } from "./metrics";
import type { PhraseMatch } from "./phrases";
import type { ScoreResult } from "./scoring";
import { deriveInferredConfidence, deriveHealthyConfidence } from "./confidence";

export interface StatusResult {
  status: HelpStatus;
  confidence: ConfidenceLevel;
  verified: boolean;
  reason: string;
}

/**
 * The main status classification. Priority order:
 *   1. Explicit "seeking maintainers" language (most actionable, most urgent)
 *   2. Explicit "actively asking for help" language or help-wanted/good-first-issue labels
 *   3. Explicit "maintenance mode" language
 *   4. Otherwise, an inferred status from the capacity pressure score
 *
 * Anything not backed by an explicit maintainer statement or label is an
 * inference and must carry a confidence level, never be stated as fact.
 */
export function determineStatus(
  raw: RawRepositoryData,
  phraseMatches: PhraseMatch[],
  metrics: ComputedMetrics,
  capacityResult: ScoreResult,
  now = new Date()
): StatusResult {
  if (raw.isArchived) {
    return {
      status: HelpStatus.MAINTENANCE_MODE,
      confidence: ConfidenceLevel.VERIFIED,
      verified: true,
      reason: "GitHub marks this repository as archived, so maintain.help treats it as read-only maintenance mode rather than inferring capacity pressure.",
    };
  }

  const seeking = phraseMatches.find((m) => m.category === "SEEKING_MAINTAINERS");
  if (seeking) {
    return {
      status: HelpStatus.SEEKING_MAINTAINERS,
      confidence: ConfidenceLevel.VERIFIED,
      verified: true,
      reason: `The repository explicitly states: "${seeking.matchedText}"`,
    };
  }

  const activelyAskingPhrase = phraseMatches.find((m) => m.category === "ACTIVELY_ASKING");
  const hasHelpWantedLabels = metrics.helpWantedIssueCount > 0 || metrics.goodFirstIssueCount > 0;
  if (activelyAskingPhrase || hasHelpWantedLabels) {
    const reason = activelyAskingPhrase
      ? `The repository explicitly states: "${activelyAskingPhrase.matchedText}"`
      : `${metrics.helpWantedIssueCount} "help wanted" and ${metrics.goodFirstIssueCount} "good first issue" issue(s) are currently open`;
    return {
      status: HelpStatus.ACTIVELY_ASKING,
      confidence: ConfidenceLevel.VERIFIED,
      verified: true,
      reason,
    };
  }

  const maintenance = phraseMatches.find((m) => m.category === "MAINTENANCE_MODE");
  if (maintenance) {
    return {
      status: HelpStatus.MAINTENANCE_MODE,
      confidence: ConfidenceLevel.VERIFIED,
      verified: true,
      reason: `The repository explicitly states: "${maintenance.matchedText}"`,
    };
  }

  const repositoryAgeDays = (now.getTime() - new Date(raw.createdAtGithub).getTime()) / 86_400_000;
  if (!raw.isFork && repositoryAgeDays >= 90 && capacityResult.score >= 20) {
    return {
      status: HelpStatus.LIKELY_NEEDS_HELP,
      confidence: deriveInferredConfidence(capacityResult.score),
      verified: false,
      reason:
        "maintain.help detected signs of maintainer capacity pressure based on repository activity. No explicit maintainer request has been found — this is an inference, not a statement from the maintainers.",
    };
  }

  return {
    status: HelpStatus.HEALTHY,
    confidence: deriveHealthyConfidence(capacityResult.score),
    verified: false,
    reason: "No significant signals of maintainer capacity pressure were detected.",
  };
}

export interface MaintainerOverrideInput {
  status: WantedHelpStatus;
  message?: string | null;
}

const WANTED_TO_HELP_STATUS: Partial<Record<WantedHelpStatus, HelpStatus>> = {
  NEED_MAINTAINER: HelpStatus.SEEKING_MAINTAINERS,
  NEED_COMAINTAINERS: HelpStatus.SEEKING_MAINTAINERS,
  NEED_CONTRIBUTORS: HelpStatus.ACTIVELY_ASKING,
  NEED_PR_REVIEWERS: HelpStatus.ACTIVELY_ASKING,
  NEED_ISSUE_TRIAGE: HelpStatus.ACTIVELY_ASKING,
  NEED_DOCUMENTATION_HELP: HelpStatus.ACTIVELY_ASKING,
};

/**
 * A verified maintainer's self-reported status always wins over whatever
 * maintain.help inferred — this is the strongest possible evidence.
 */
export function applyMaintainerOverride(
  base: StatusResult,
  override: MaintainerOverrideInput | null
): StatusResult {
  if (!override) return base;

  if (override.status === WantedHelpStatus.NOT_LOOKING) {
    return {
      status: HelpStatus.HEALTHY,
      confidence: ConfidenceLevel.VERIFIED,
      verified: true,
      reason: "The repository maintainer has indicated they are not currently looking for help.",
    };
  }

  const mapped = WANTED_TO_HELP_STATUS[override.status];
  if (!mapped) return base;

  return {
    status: mapped,
    confidence: ConfidenceLevel.VERIFIED,
    verified: true,
    reason: override.message
      ? `Verified by the repository maintainer: "${override.message}"`
      : "Verified by the repository maintainer.",
  };
}
