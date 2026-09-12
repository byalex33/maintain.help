import { ConfidenceLevel, EvidenceSourceType, EvidenceType } from "@/generated/prisma/enums";
import type { RawRepositoryData } from "../github/types";
import { findPhraseMatches, type PhraseMatch } from "./phrases";
import type { ComputedMetrics } from "./metrics";
import type { ScoreResult } from "./scoring";
import type { StatusResult } from "./status";
import { HELP_WANTED_LABEL, GOOD_FIRST_ISSUE_LABEL, issueLabelQuery } from "../github/labels";

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
  const readmeUrl = raw.readmeUrl ?? null;
  const contributingUrl = raw.contributingUrl ?? null;

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
  sourceUrl: string | null,
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
  const labels = [...(raw.labels ?? []), ...raw.issues.flatMap((issue) => issue.labels)];
  if (raw.issuesTruncated) {
    evidence.push({
      type: EvidenceType.METRIC,
      title: "Issue details are sampled",
      description: "Open and recent issue/PR totals are fetched separately. Only up to 300 oldest open items are inspected; backlog medians are omitted, and other labels or statements may be missing.",
      sourceUrl: `${raw.url}/issues`,
      sourceType: EvidenceSourceType.CALCULATED_METRIC,
      confidence: ConfidenceLevel.LOW,
    });
  }
  if (raw.closedIssuesTruncated) {
    evidence.push({
      type: EvidenceType.METRIC,
      title: "Closed issue details are sampled",
      description: "Only up to 300 recently updated closed issues/PRs are inspected. The recent PR closure-time median is omitted because the sample may be incomplete.",
      sourceUrl: `${raw.url}/pulls?q=is%3Apr+is%3Aclosed`,
      sourceType: EvidenceSourceType.CALCULATED_METRIC,
      confidence: ConfidenceLevel.LOW,
    });
  }

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
      description: `${metrics.helpWantedIssueCount} open issue(s) have "help wanted" or equivalent labels.`,
      sourceUrl: `${raw.url}/issues?q=${encodeURIComponent(issueLabelQuery(labels, HELP_WANTED_LABEL, "help wanted"))}`,
      sourceType: EvidenceSourceType.GITHUB_ISSUE,
      confidence: ConfidenceLevel.VERIFIED,
    });
  }

  if (metrics.goodFirstIssueCount > 0) {
    evidence.push({
      type: EvidenceType.LABEL,
      title: `${metrics.goodFirstIssueCount} "good first issue" issue(s)`,
      description: `${metrics.goodFirstIssueCount} open issue(s) have "good first issue" or equivalent beginner-friendly labels.`,
      sourceUrl: `${raw.url}/issues?q=${encodeURIComponent(issueLabelQuery(labels, GOOD_FIRST_ISSUE_LABEL, "good first issue"))}`,
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
