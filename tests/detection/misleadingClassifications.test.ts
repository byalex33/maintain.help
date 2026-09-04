import { describe, it, expect } from "vitest";
import { analyzeRepository } from "@/lib/detection/analyze";
import { HelpStatus, ConfidenceLevel } from "@/generated/prisma/enums";
import { makeRawRepository, makeIssue, makeContributor } from "../fixtures/rawRepository";

const NOW = new Date("2026-09-04T00:00:00Z");

describe("misleading classification guards", () => {
  it("does NOT flag a quiet-but-finished project as needing a maintainer", () => {
    // No commits for 18 months, but no open issues and a stable release history —
    // this is a mature, complete project, not a struggling one.
    const raw = makeRawRepository({
      pushedAt: new Date("2025-03-01").toISOString(),
      latestReleaseAt: new Date("2025-03-01").toISOString(),
      issues: [],
      commitActivity: [],
      contributorStats: [makeContributor("alice", [{ weeksAgo: 150, commits: 40 }], NOW)],
    });

    const result = analyzeRepository(raw, { now: NOW });

    expect(result.status.status).toBe(HelpStatus.HEALTHY);
    expect(result.status.verified).toBe(false);
    expect(result.capacityPressureScore).toBeLessThan(20);
  });

  it("scores a single-maintainer repo with a large stale backlog much higher than the quiet-but-finished baseline", () => {
    const quiet = makeRawRepository({
      pushedAt: new Date("2025-03-01").toISOString(),
      issues: [],
      commitActivity: [],
      contributorStats: [makeContributor("alice", [{ weeksAgo: 150, commits: 40 }], NOW)],
    });
    const quietResult = analyzeRepository(quiet, { now: NOW });

    const oldIssueDate = new Date("2025-06-01").toISOString();
    const oldPrDate = new Date("2026-04-01").toISOString();
    const strained = makeRawRepository({
      issues: [
        ...Array.from({ length: 120 }, () =>
          makeIssue({ state: "open", isPullRequest: false, createdAt: oldIssueDate })
        ),
        ...Array.from({ length: 60 }, () =>
          makeIssue({ state: "open", isPullRequest: true, createdAt: oldPrDate })
        ),
      ],
      contributorStats: [makeContributor("bob", [{ weeksAgo: 4, commits: 20 }], NOW)],
    });
    const strainedResult = analyzeRepository(strained, { now: NOW });

    expect(strainedResult.capacityPressureScore).toBeGreaterThan(quietResult.capacityPressureScore + 30);
    expect(strainedResult.status.status).toBe(HelpStatus.LIKELY_NEEDS_HELP);
  });

  it("marks an explicit maintainer statement as verified, not merely inferred", () => {
    const raw = makeRawRepository({
      readmeText: "# Project\n\nWe are looking for maintainers to help keep this project going.",
    });

    const result = analyzeRepository(raw, { now: NOW });

    expect(result.status.status).toBe(HelpStatus.SEEKING_MAINTAINERS);
    expect(result.status.confidence).toBe(ConfidenceLevel.VERIFIED);
    expect(result.status.verified).toBe(true);
  });

  it("never labels an inferred status as verified", () => {
    const oldIssueDate = new Date("2025-06-01").toISOString();
    const raw = makeRawRepository({
      issues: Array.from({ length: 80 }, () =>
        makeIssue({ state: "open", isPullRequest: false, createdAt: oldIssueDate })
      ),
      contributorStats: [makeContributor("solo", [{ weeksAgo: 2, commits: 5 }], NOW)],
    });

    const result = analyzeRepository(raw, { now: NOW });

    if (result.status.status === HelpStatus.LIKELY_NEEDS_HELP) {
      expect(result.status.verified).toBe(false);
      expect(result.status.confidence).not.toBe(ConfidenceLevel.VERIFIED);
    }
  });
});
