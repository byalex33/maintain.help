import { describe, it, expect } from "vitest";
import { determineStatus, applyMaintainerOverride } from "@/lib/detection/status";
import { computeMetrics } from "@/lib/detection/metrics";
import { computeCapacityPressureScore } from "@/lib/detection/scoring";
import { findSourcedPhraseMatches } from "@/lib/detection/evidence";
import { HelpStatus, ConfidenceLevel, WantedHelpStatus } from "@/generated/prisma/enums";
import { makeRawRepository, makeIssue } from "../fixtures/rawRepository";

const NOW = new Date("2026-09-04T00:00:00Z");

function classify(raw: ReturnType<typeof makeRawRepository>) {
  const metrics = computeMetrics(raw, NOW);
  const phraseMatches = findSourcedPhraseMatches(raw);
  const capacityResult = computeCapacityPressureScore(metrics);
  return determineStatus(raw, phraseMatches, metrics, capacityResult);
}

describe("determineStatus", () => {
  it("prioritizes seeking-maintainers over actively-asking language", () => {
    const raw = makeRawRepository({
      readmeText: "Contributors welcome! Also, we are seeking a new maintainer.",
    });
    const result = classify(raw);
    expect(result.status).toBe(HelpStatus.SEEKING_MAINTAINERS);
    expect(result.verified).toBe(true);
  });

  it("classifies help-wanted labeled issues as actively asking, verified", () => {
    const raw = makeRawRepository({
      issues: [makeIssue({ state: "open", labels: ["help wanted"] })],
    });
    const result = classify(raw);
    expect(result.status).toBe(HelpStatus.ACTIVELY_ASKING);
    expect(result.confidence).toBe(ConfidenceLevel.VERIFIED);
  });

  it("classifies explicit maintenance-mode language", () => {
    const raw = makeRawRepository({
      readmeText: "This project is now in maintenance mode.",
    });
    const result = classify(raw);
    expect(result.status).toBe(HelpStatus.MAINTENANCE_MODE);
    expect(result.verified).toBe(true);
  });

  it("falls back to healthy when there is no evidence at all", () => {
    const raw = makeRawRepository({ issues: [] });
    const result = classify(raw);
    expect(result.status).toBe(HelpStatus.HEALTHY);
    expect(result.verified).toBe(false);
  });

  it("never uses the word 'abandoned' in an inferred reason", () => {
    const oldDate = new Date("2025-01-01").toISOString();
    const raw = makeRawRepository({
      issues: Array.from({ length: 100 }, () => makeIssue({ state: "open", isPullRequest: false, createdAt: oldDate })),
    });
    const result = classify(raw);
    expect(result.reason.toLowerCase()).not.toContain("abandon");
    expect(result.reason.toLowerCase()).not.toContain("dead");
  });
});

describe("applyMaintainerOverride", () => {
  const base = classify(makeRawRepository({ issues: [] }));

  it("overrides an inferred healthy status when a maintainer requests contributors", () => {
    const overridden = applyMaintainerOverride(base, {
      status: WantedHelpStatus.NEED_CONTRIBUTORS,
      message: "We could use help with the plugin ecosystem.",
    });
    expect(overridden.status).toBe(HelpStatus.ACTIVELY_ASKING);
    expect(overridden.confidence).toBe(ConfidenceLevel.VERIFIED);
    expect(overridden.verified).toBe(true);
  });

  it("overrides to seeking-maintainers when a maintainer requests a successor", () => {
    const overridden = applyMaintainerOverride(base, { status: WantedHelpStatus.NEED_MAINTAINER });
    expect(overridden.status).toBe(HelpStatus.SEEKING_MAINTAINERS);
  });

  it("respects a maintainer explicitly saying they do not need help", () => {
    const overridden = applyMaintainerOverride(base, { status: WantedHelpStatus.NOT_LOOKING });
    expect(overridden.status).toBe(HelpStatus.HEALTHY);
    expect(overridden.verified).toBe(true);
  });

  it("passes through unchanged when there is no override", () => {
    const overridden = applyMaintainerOverride(base, null);
    expect(overridden).toEqual(base);
  });
});
