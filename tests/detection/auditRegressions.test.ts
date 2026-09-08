import { describe, expect, it } from "vitest";
import { analyzeRepository } from "@/lib/detection/analyze";
import { findPhraseMatches } from "@/lib/detection/phrases";
import { applyMaintainerCategoryOverride } from "@/lib/detection/categories";
import { findSourcedPhraseMatches } from "@/lib/detection/evidence";
import { makeIssue, makeRawRepository } from "../fixtures/rawRepository";

describe("audit detection regressions", () => {
  it.each([
    "We are not looking for maintainers.",
    "This project is not in maintenance mode.",
    "We are no longer seeking maintainers.",
    "We don't need help maintaining this package.",
    "We aren't currently looking for contributors.",
  ])("ignores negated statements: %s", (text) => {
    expect(findPhraseMatches(text)).toEqual([]);
  });

  it("keeps affirmative language in a separate clause and genuine negative maintenance statements", () => {
    expect(findPhraseMatches("We are not looking for maintainers, but contributors welcome.").map((m) => m.category)).toEqual(["ACTIVELY_ASKING"]);
    expect(findPhraseMatches("This project is no longer actively developed.")[0].category).toBe("MAINTENANCE_MODE");
  });

  it("uses the current maintainer request for categories, including withdrawing help", () => {
    const raw = makeRawRepository({ issues: [makeIssue({ labels: ["help wanted", "review"] })] });
    const requested = analyzeRepository(raw, { maintainerOverride: { status: "NEED_DOCUMENTATION_HELP" } });
    expect(requested.categories).toEqual([{ category: "DOCUMENTATION", verified: true }]);
    expect(applyMaintainerCategoryOverride(requested.categories, { status: "NEED_PR_REVIEWERS" })).toEqual([{ category: "PR_REVIEW", verified: true }]);
    const withdrawn = analyzeRepository(raw, { maintainerOverride: { status: "NOT_LOOKING" } });
    expect(withdrawn.categories).toEqual([]);
    expect(withdrawn.status.status).toBe("HEALTHY");
  });

  it("uses aggregate totals without inferring whole-backlog medians from a truncated sample", () => {
    const result = analyzeRepository(makeRawRepository({
      issues: [makeIssue()], issuesTruncated: true,
      issueStatistics: {
        openIssues: 1000, openPullRequests: 600,
        newIssuesLast90d: 40, closedIssuesLast90d: 50,
        newPullRequestsLast90d: 30, closedPullRequestsLast90d: 35,
        helpWantedIssueCount: 12, goodFirstIssueCount: 3,
      },
    }));
    expect(result.metrics.openIssues).toBe(1000);
    expect(result.metrics.openPullRequests).toBe(600);
    expect(result.metrics.medianOpenIssueAgeDays).toBeNull();
    expect(result.metrics.medianOpenPrAgeDays).toBeNull();
    expect(result.metrics.medianPrCycleTimeHours).toBeNull();
    expect(result.status.status).toBe("ACTIVELY_ASKING");
    expect(result.evidence.some((item) => item.title === "Issue details are sampled")).toBe(true);
    expect(result.evidence.some((item) => item.title.includes("opened faster"))).toBe(false);
  });

  it("uses actual content URLs and never invents a path for missing source metadata", () => {
    const raw = makeRawRepository({
      readmeText: "Contributors welcome", readmeUrl: "https://github.com/acme/widget/blob/main/README.rst",
      contributingText: "Help wanted", contributingUrl: "https://github.com/acme/widget/blob/main/docs/CONTRIBUTING.md",
    });
    expect(findSourcedPhraseMatches(raw).map((m) => m.sourceUrl)).toEqual([raw.readmeUrl, raw.contributingUrl]);
    expect(findSourcedPhraseMatches({ ...raw, readmeUrl: undefined })[0].sourceUrl).toBeNull();
  });
});
