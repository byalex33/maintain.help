import { describe, it, expect } from "vitest";
import { computeCapacityPressureScore } from "@/lib/detection/scoring";
import { computeMetrics } from "@/lib/detection/metrics";
import { makeRawRepository, makeIssue, makeContributor } from "../fixtures/rawRepository";

const NOW = new Date("2026-09-04T00:00:00Z");

describe("computeCapacityPressureScore", () => {
  it("scores a healthy, actively co-maintained repository as zero", () => {
    const raw = makeRawRepository({
      issues: [],
      commitActivity: [],
      contributorStats: [
        makeContributor("alice", [{ weeksAgo: 1, commits: 5 }], NOW),
        makeContributor("bob", [{ weeksAgo: 2, commits: 5 }], NOW),
        makeContributor("carol", [{ weeksAgo: 3, commits: 5 }], NOW),
      ],
    });
    const metrics = computeMetrics(raw, NOW);
    const result = computeCapacityPressureScore(metrics);
    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
  });

  it("a single weak signal never crosses the inferred-status threshold (20) alone", () => {
    const raw = makeRawRepository({
      issues: [],
      commitActivity: [],
      contributorStats: [makeContributor("solo", [{ weeksAgo: 1, commits: 5 }], NOW)],
    });
    const metrics = computeMetrics(raw, NOW);
    const result = computeCapacityPressureScore(metrics);
    expect(result.score).toBeLessThan(20);
  });

  it("treats missing contributor statistics as unknown, not zero maintainers", () => {
    const metrics = computeMetrics(makeRawRepository({ contributorStats: [], issues: [] }), NOW);
    const result = computeCapacityPressureScore(metrics);
    expect(result.signals.some((signal) => signal.id === "single-active-maintainer")).toBe(false);
  });

  it("rewards large open PR backlogs with old median age", () => {
    const oldPrDate = new Date("2026-04-01").toISOString();
    const raw = makeRawRepository({
      issues: Array.from({ length: 60 }, () => makeIssue({ state: "open", isPullRequest: true, createdAt: oldPrDate })),
    });
    const metrics = computeMetrics(raw, NOW);
    const result = computeCapacityPressureScore(metrics);
    expect(result.signals.some((s) => s.id === "pr-backlog-high")).toBe(true);
    expect(result.signals.some((s) => s.id === "pr-age-high")).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it("caps the total score at 100", () => {
    const oldDate = new Date("2024-01-01").toISOString();
    const raw = makeRawRepository({
      issues: [
        ...Array.from({ length: 200 }, () => makeIssue({ state: "open", isPullRequest: false, createdAt: oldDate })),
        ...Array.from({ length: 200 }, () => makeIssue({ state: "open", isPullRequest: true, createdAt: oldDate, labels: ["security"] })),
      ],
      contributorStats: [],
    });
    const metrics = computeMetrics(raw, NOW);
    const result = computeCapacityPressureScore(metrics);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("detects growing backlog when issues open faster than they close", () => {
    const recent = new Date("2026-08-15").toISOString();
    const raw = makeRawRepository({
      issues: [
        ...Array.from({ length: 20 }, () => makeIssue({ state: "open", isPullRequest: false, createdAt: recent })),
        makeIssue({ state: "closed", isPullRequest: false, createdAt: recent, closedAt: recent }),
      ],
    });
    const metrics = computeMetrics(raw, NOW);
    const result = computeCapacityPressureScore(metrics);
    expect(result.signals.some((s) => s.id === "growing-backlog")).toBe(true);
  });
});
