export type ConfidenceLevel = "VERIFIED" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Explicit maintainer statements are always "verified"; they are not an
 * inference. Everything else gets a graduated confidence based on how much
 * the heuristic score clears the classification threshold.
 */
export function deriveInferredConfidence(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function deriveHealthyConfidence(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score < 8) return "HIGH";
  if (score < 15) return "MEDIUM";
  return "LOW";
}
