import { HelpCategory } from "@/generated/prisma/enums";
import type { RawRepositoryData } from "../github/types";
import type { ComputedMetrics } from "./metrics";
import type { PhraseMatch } from "./phrases";
import type { ScoreResult } from "./scoring";

export interface CategoryResult {
  category: HelpCategory;
  verified: boolean;
}

export const LABEL_CATEGORY_RULES: { pattern: RegExp; category: HelpCategory }[] = [
  { pattern: /doc(s|umentation)?/i, category: HelpCategory.DOCUMENTATION },
  { pattern: /test(s|ing)?/i, category: HelpCategory.TESTING },
  { pattern: /triage/i, category: HelpCategory.ISSUE_TRIAGE },
  { pattern: /(pr |code )?review/i, category: HelpCategory.PR_REVIEW },
  { pattern: /design|ux|\bui\b/i, category: HelpCategory.DESIGN },
  { pattern: /i18n|l10n|translat/i, category: HelpCategory.TRANSLATION },
  { pattern: /\bci\b|devops|build|infra/i, category: HelpCategory.DEVOPS_CI },
  { pattern: /security/i, category: HelpCategory.SECURITY },
];

export function mapLabelsToCategory(labels: string[]): HelpCategory | null {
  for (const label of labels) {
    for (const rule of LABEL_CATEGORY_RULES) {
      if (rule.pattern.test(label)) return rule.category;
    }
  }
  if (labels.some((l) => /good.?first.?issue|help.?wanted/i.test(l))) return HelpCategory.CODE;
  return null;
}

/**
 * Determines which kinds of help a repository needs, and whether each
 * category is backed by explicit evidence (labels, maintainer statements)
 * or only by an inferred capacity signal.
 */
export function detectHelpCategories(
  raw: RawRepositoryData,
  metrics: ComputedMetrics,
  phraseMatches: PhraseMatch[],
  capacityResult: ScoreResult
): CategoryResult[] {
  const verified = new Set<HelpCategory>();
  const inferred = new Set<HelpCategory>();

  const openIssues = raw.issues.filter((i) => i.state === "open");
  for (const issue of openIssues) {
    for (const label of issue.labels) {
      for (const rule of LABEL_CATEGORY_RULES) {
        if (rule.pattern.test(label)) verified.add(rule.category);
      }
    }
  }

  if (metrics.helpWantedIssueCount > 0 || metrics.goodFirstIssueCount > 0) {
    verified.add(HelpCategory.CODE);
  }

  for (const match of phraseMatches) {
    if (match.category === "SEEKING_MAINTAINERS") {
      verified.add(HelpCategory.MAINTAINER);
      if (/co-?maintainer/i.test(match.label)) verified.add(HelpCategory.CO_MAINTAINER);
    }
    if (match.category === "ACTIVELY_ASKING") {
      verified.add(HelpCategory.CODE);
    }
  }

  const signalIds = new Set(capacityResult.signals.map((s) => s.id));
  if (signalIds.has("pr-backlog-high") || signalIds.has("pr-backlog-medium") || signalIds.has("pr-age-high") || signalIds.has("pr-age-medium")) {
    inferred.add(HelpCategory.PR_REVIEW);
  }
  if (signalIds.has("issue-backlog-high") || signalIds.has("issue-backlog-medium") || signalIds.has("issue-age-high") || signalIds.has("issue-age-medium")) {
    inferred.add(HelpCategory.ISSUE_TRIAGE);
  }
  if (signalIds.has("stale-dependency-security-prs")) {
    inferred.add(HelpCategory.SECURITY);
    inferred.add(HelpCategory.DEVOPS_CI);
  }
  if (signalIds.has("single-active-maintainer") || signalIds.has("few-active-maintainers") || signalIds.has("commit-concentration")) {
    inferred.add(HelpCategory.MAINTAINER);
  }

  const results: CategoryResult[] = [];
  for (const category of verified) results.push({ category, verified: true });
  for (const category of inferred) {
    if (!verified.has(category)) results.push({ category, verified: false });
  }
  return results;
}
