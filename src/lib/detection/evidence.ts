import { ConfidenceLevel, EvidenceSourceType, EvidenceType } from "@/generated/prisma/enums";
import type { RawRepositoryData } from "../github/types";
import { findPhraseMatches, type PhraseMatch } from "./phrases";
import type { ComputedMetrics } from "./metrics";
import type { ScoreResult } from "./scoring";
import type { StatusResult } from "./status";

export interface SourcedPhraseMatch extends PhraseMatch {
  sourceType: EvidenceSourceType;
  sourceUrl: string | null;
  sourceTitle?: string;
}

export interface EvidenceInput {
  type: EvidenceType;
  title: string;
  description: string;
  sourceUrl: string | null;
  sourceType: EvidenceSourceType;
  confidence: ConfidenceLevel;
}

/** Scans README, CONTRIBUTING, and open issue titles for explicit phrases, tagging each with its source. */
export function findSourcedPhraseMatches(raw: RawRepositoryData): SourcedPhraseMatch[] {
  const results: SourcedPhraseMatch[] = [];
  const readmeUrl = `${raw.url}/blob/${raw.defaultBranch}/README.md`;
  const contributingUrl = `${raw.url}/blob/${raw.defaultBranch}/CONTRIBUTING.md`;

  results.push(
    ...tagMatches(raw.readmeText, EvidenceSourceType.README, readmeUrl)
  );
  results.push(
    ...tagMatches(raw.contributingText, EvidenceSourceType.CONTRIBUTING, contributingUrl)
  );

  const maintainerAssociations = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
  for (const issue of raw.issues.filter((i) => i.state === "open" && maintainerAssociations.has(i.authorAssociation ?? ""))) {
    results.push(...tagMatches(issue.title, EvidenceSourceType.GITHUB_ISSUE, issue.url));
  }

  for (const discussion of (raw.discussions ?? []).filter((item) => maintainerAssociations.has(item.authorAssociation ?? ""))) {
    results.push(...tagMatches(
      `${discussion.title}\n${discussion.body}`,
      EvidenceSourceType.GITHUB_DISCUSSION,
      discussion.url,
      discussion.title
    ));
  }

  return results;
}

function tagMatches(
  text: string | null,
  sourceType: EvidenceSourceType,
  sourceUrl: string,
  sourceTitle?: string
): SourcedPhraseMatch[] {
  return findPhraseMatches(text).map((m) => ({ ...m, sourceType, sourceUrl, sourceTitle }));
}

function titleCase(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface BuildEvidenceParams {
  raw: RawRepositoryData;
  sourcedPhraseMatches: SourcedPhraseMatch[];
  metrics: ComputedMetrics;
  capacityResult: ScoreResult;
  beginnerResult: ScoreResult;
  statusResult: StatusResult;
}

export function buildEvidence(params: BuildEvidenceParams): EvidenceInput[] {
  const { raw, sourcedPhraseMatches, metrics, capacityResult, beginnerResult } = params;
  const evidence: EvidenceInput[] = [];

  for (const match of sourcedPhraseMatches) {
    evidence.push({
      type: EvidenceType.EXPLICIT_STATEMENT,
      title: match.sourceTitle ? `${match.sourceTitle}: ${match.label}` : titleCase(match.label),
      description: match.context,
      sourceUrl: match.sourceUrl,
      sourceType: match.sourceType,
      confidence: ConfidenceLevel.VERIFIED,
    });
  }

  if (metrics.helpWantedIssueCount > 0) {
    evidence.push({
      type: EvidenceType.LABEL,
      title: `${metrics.helpWantedIssueCount} "help wanted" issue(s)`,
      description: `${metrics.helpWantedIssueCount} open issue(s) are labelled "help wanted".`,
      sourceUrl: `${raw.url}/issues?q=${encodeURIComponent('is:issue is:open label:"help wanted"')}`,
      sourceType: EvidenceSourceType.GITHUB_ISSUE,
      confidence: ConfidenceLevel.VERIFIED,
    });
  }

  if (metrics.goodFirstIssueCount > 0) {
    evidence.push({
      type: EvidenceType.LABEL,
      title: `${metrics.goodFirstIssueCount} "good first issue" issue(s)`,
      description: `${metrics.goodFirstIssueCount} open issue(s) are labelled "good first issue".`,
      sourceUrl: `${raw.url}/issues?q=${encodeURIComponent('is:issue is:open label:"good first issue"')}`,
      sourceType: EvidenceSourceType.GITHUB_ISSUE,
      confidence: ConfidenceLevel.VERIFIED,
    });
  }

  for (const signal of capacityResult.signals) {
    evidence.push({
      type: EvidenceType.INFERENCE,
      title: signal.description,
      description: `Calculated signal contributing to the capacity pressure score (+${signal.weight}).`,
      sourceUrl: null,
      sourceType: EvidenceSourceType.CALCULATED_METRIC,
      confidence: ConfidenceLevel.MEDIUM,
    });
  }

  for (const signal of beginnerResult.signals) {
    evidence.push({
      type: EvidenceType.METRIC,
      title: signal.description,
      description: "Calculated signal contributing to the beginner-friendliness assessment.",
      sourceUrl: null,
      sourceType: EvidenceSourceType.CALCULATED_METRIC,
      confidence: ConfidenceLevel.MEDIUM,
    });
  }

  return evidence;
}
