import type { RawRepositoryData } from "../github/types";
import type { ComputedMetrics } from "./metrics";
import type { Signal, ScoreResult } from "./scoring";

const SETUP_INSTRUCTIONS_HEADING = /##+\s*(getting started|installation|setup|quick ?start|development)/i;

/**
 * Beginner-friendliness is deliberately multi-signal: a `good first issue`
 * label alone does not make a project beginner friendly.
 */
export function computeBeginnerFriendlyScore(raw: RawRepositoryData, m: ComputedMetrics): ScoreResult {
  const signals: Signal[] = [];

  if (m.goodFirstIssueCount > 0) {
    signals.push({
      id: "good-first-issues",
      description: `${m.goodFirstIssueCount} open "good first issue" issue(s)`,
      weight: 25,
    });
  }

  if (raw.contributingText) {
    signals.push({ id: "contributing-guide", description: "CONTRIBUTING guide exists", weight: 20 });
  }

  if (raw.readmeText && SETUP_INSTRUCTIONS_HEADING.test(raw.readmeText)) {
    signals.push({ id: "setup-instructions", description: "README includes setup/installation instructions", weight: 15 });
  }

  if (raw.hasIssueTemplates) {
    signals.push({ id: "issue-templates", description: "Repository has issue templates", weight: 10 });
  }

  if (m.activeMaintainersLast90d >= 1 && m.medianPrCycleTimeHours !== null && m.medianPrCycleTimeHours < 24 * 14) {
    signals.push({
      id: "responsive-maintainers",
      description: "Recent pull requests are typically closed within two weeks",
      weight: 15,
    });
  }

  if (!raw.isArchived && m.daysSinceLastCommit !== null && m.daysSinceLastCommit < 180) {
    signals.push({ id: "recently-active", description: "Repository has recent commit activity", weight: 10 });
  }

  const score = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));
  return { score, signals };
}

export function isBeginnerFriendly(result: ScoreResult): boolean {
  return result.score >= 45 && result.signals.length >= 3;
}
