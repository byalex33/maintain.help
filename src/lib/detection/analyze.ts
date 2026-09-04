import type { RawRepositoryData } from "../github/types";
import { computeMetrics, type ComputedMetrics } from "./metrics";
import { computeCapacityPressureScore } from "./scoring";
import { computeBeginnerFriendlyScore, isBeginnerFriendly } from "./beginnerFriendly";
import { determineStatus, applyMaintainerOverride, type StatusResult, type MaintainerOverrideInput } from "./status";
import { detectHelpCategories, type CategoryResult } from "./categories";
import { findSourcedPhraseMatches, buildEvidence, type EvidenceInput } from "./evidence";
import { ANALYSIS_VERSION } from "./version";

export interface AnalysisResult {
  version: number;
  status: StatusResult;
  categories: CategoryResult[];
  capacityPressureScore: number;
  beginnerFriendlyScore: number;
  isBeginnerFriendly: boolean;
  metrics: ComputedMetrics;
  evidence: EvidenceInput[];
}

export interface AnalyzeOptions {
  /** A verified maintainer's self-reported status, if the repo has been claimed. */
  maintainerOverride?: MaintainerOverrideInput | null;
  /** Injectable for deterministic tests. */
  now?: Date;
}

/**
 * The single entry point tying together phrase detection, metric
 * computation, scoring, status classification, and evidence generation.
 * Ingestion jobs call this once per repository and persist the result.
 */
export function analyzeRepository(raw: RawRepositoryData, options: AnalyzeOptions = {}): AnalysisResult {
  const now = options.now ?? new Date();

  const metrics = computeMetrics(raw, now);
  const sourcedPhraseMatches = findSourcedPhraseMatches(raw);
  const capacityResult = computeCapacityPressureScore(metrics);
  const beginnerResult = computeBeginnerFriendlyScore(raw, metrics);

  const inferredStatus = determineStatus(raw, sourcedPhraseMatches, metrics, capacityResult, now);
  const status = applyMaintainerOverride(inferredStatus, options.maintainerOverride ?? null);

  const categories = detectHelpCategories(raw, metrics, sourcedPhraseMatches, capacityResult);
  const evidence = buildEvidence({
    raw,
    sourcedPhraseMatches,
    metrics,
    capacityResult,
    beginnerResult,
    statusResult: status,
  });

  return {
    version: ANALYSIS_VERSION,
    status,
    categories,
    capacityPressureScore: capacityResult.score,
    beginnerFriendlyScore: beginnerResult.score,
    isBeginnerFriendly: isBeginnerFriendly(beginnerResult),
    metrics,
    evidence,
  };
}
