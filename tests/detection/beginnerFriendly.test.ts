import { describe, it, expect } from "vitest";
import { computeBeginnerFriendlyScore, isBeginnerFriendly } from "@/lib/detection/beginnerFriendly";
import { computeMetrics } from "@/lib/detection/metrics";
import { makeRawRepository, makeIssue } from "../fixtures/rawRepository";

const NOW = new Date("2026-09-04T00:00:00Z");

describe("computeBeginnerFriendlyScore", () => {
  it("a good first issue label alone is not enough to be beginner friendly", () => {
    const raw = makeRawRepository({
      contributingText: null,
      hasIssueTemplates: false,
      issues: [makeIssue({ state: "open", labels: ["good first issue"] })],
    });
    const metrics = computeMetrics(raw, NOW);
    const result = computeBeginnerFriendlyScore(raw, metrics);
    expect(isBeginnerFriendly(result)).toBe(false);
  });

  it("is beginner friendly with good first issues, a contributing guide, and setup docs", () => {
    const raw = makeRawRepository({
      readmeText: "# Widget\n\n## Getting Started\n\nRun npm install.",
      contributingText: "Please open a PR.",
      hasIssueTemplates: true,
      issues: [makeIssue({ state: "open", labels: ["good first issue"] })],
    });
    const metrics = computeMetrics(raw, NOW);
    const result = computeBeginnerFriendlyScore(raw, metrics);
    expect(isBeginnerFriendly(result)).toBe(true);
  });
});
