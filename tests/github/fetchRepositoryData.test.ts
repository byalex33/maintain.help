import { beforeEach, describe, expect, it, vi } from "vitest";

const { api, graphql } = vi.hoisted(() => ({
  api: {
    repos: {
      get: vi.fn(), listLanguages: vi.fn(), getReadme: vi.fn(), getContent: vi.fn(),
      listReleases: vi.fn(), getCommitActivityStats: vi.fn(), getContributorsStats: vi.fn(),
    },
    issues: { listForRepo: vi.fn(), listLabelsForRepo: vi.fn() },
    search: { issuesAndPullRequests: vi.fn() },
  },
  graphql: vi.fn(),
}));
vi.mock("@/lib/github/client", async (original) => ({
  ...await original<typeof import("@/lib/github/client")>(), getOctokit: () => api,
}));
vi.mock("@octokit/graphql", () => ({ graphql }));

import { fetchRepositoryData } from "@/lib/github/fetchRepositoryData";
import { analyzeRepository } from "@/lib/detection/analyze";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GITHUB_ANALYSIS_TOKEN", "test-token");
  api.repos.get.mockResolvedValue({ data: { id: 1, owner: { login: "acme" }, name: "widget", full_name: "acme/widget", private: false } });
  api.repos.listLanguages.mockResolvedValue({ data: {} });
  api.repos.getReadme.mockResolvedValue({ data: { content: Buffer.from("Contributors welcome").toString("base64"), html_url: "https://github.com/acme/widget/blob/main/README.rst" } });
  api.repos.getContent.mockImplementation(({ path }) => {
    if (path === "docs/CONTRIBUTING.md") return Promise.resolve({ data: { content: Buffer.from("Help wanted").toString("base64"), html_url: "https://github.com/acme/widget/blob/main/docs/CONTRIBUTING.md" } });
    return Promise.reject({ status: 404 });
  });
  api.repos.listReleases.mockResolvedValue({ data: [] });
  api.repos.getCommitActivityStats.mockResolvedValue({ data: [] });
  api.repos.getContributorsStats.mockResolvedValue({ data: [] });
  api.issues.listLabelsForRepo.mockResolvedValue({ data: [] });
  api.issues.listForRepo.mockResolvedValue({ data: [] });
  graphql.mockResolvedValue(Object.fromEntries([
    ["openIssues", 1000], ["openPullRequests", 500],
    ["newIssuesLast90d", 40], ["closedIssuesLast90d", 30],
    ["newPullRequestsLast90d", 20], ["closedPullRequestsLast90d", 10],
    ["helpWantedIssueCount", 12], ["goodFirstIssueCount", 3],
  ].map(([key, count]) => [key, { issueCount: count }])));
});

describe("shared repository fetch", () => {
  it("does not use closed samples to hide a truncated open backlog", async () => {
    api.issues.listForRepo.mockImplementation(({ state, page }) => ({
      data: Array.from({ length: 100 }, (_, i) => ({
        id: (state === "open" ? 0 : 1000) + page * 100 + i,
        number: page * 100 + i, title: "Issue", state, labels: [],
        created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z",
      })),
    }));
    // The other aggregate fields do not affect whether the open sample is complete.
    const counts = { openIssues: 350, openPullRequests: 50, newIssuesLast90d: 0,
      closedIssuesLast90d: 0, newPullRequestsLast90d: 0, closedPullRequestsLast90d: 0,
      helpWantedIssueCount: 0, goodFirstIssueCount: 0 };
    graphql.mockResolvedValue(Object.fromEntries(Object.entries(counts).map(([key, issueCount]) => [key, { issueCount }])));
    const raw = await fetchRepositoryData("acme", "widget");
    expect(raw.issues).toHaveLength(600);
    expect(raw.issuesTruncated).toBe(true);
    expect(analyzeRepository(raw).metrics.medianOpenIssueAgeDays).toBeNull();
  });

  it("rejects private repositories before fetching content", async () => {
    api.repos.get.mockResolvedValue({ data: { private: true } });
    await expect(fetchRepositoryData("acme", "widget")).rejects.toMatchObject({ name: "GitHubPrivateRepositoryError" });
    expect(api.repos.getReadme).not.toHaveBeenCalled();
    expect(api.issues.listForRepo).not.toHaveBeenCalled();
    expect(graphql).not.toHaveBeenCalled();
  });

  it("preserves source URLs, retrieves open samples and gets separate aggregate counts", async () => {
    api.issues.listLabelsForRepo.mockResolvedValue({ data: [{ name: "help-wanted" }, { name: "first-timers-only" }] });
    const raw = await fetchRepositoryData("acme", "widget");
    expect(raw.readmeUrl).toContain("README.rst");
    expect(raw.contributingUrl).toContain("docs/CONTRIBUTING.md");
    expect(raw.openIssueCount).toBe(1000);
    expect(raw.issueStatistics?.openPullRequests).toBe(500);
    expect(raw.issuesTruncated).toBe(true);
    expect(api.issues.listForRepo).toHaveBeenCalledWith(expect.objectContaining({ state: "open", sort: "created", direction: "asc" }));
    expect(graphql).toHaveBeenCalledTimes(1);
    expect(graphql.mock.calls[0][0]).toContain("help-wanted");
    expect(graphql.mock.calls[0][0]).toContain("first-timers-only");
  });

  it("rejects incomplete REST aggregate results instead of publishing partial counts", async () => {
    vi.stubEnv("GITHUB_ANALYSIS_TOKEN", "");
    api.search.issuesAndPullRequests.mockResolvedValue({ data: { total_count: 20, incomplete_results: true } });
    await expect(fetchRepositoryData("acme", "widget")).rejects.toThrow("incomplete issue statistics");
  });

  it.each([1, 300])("preserves complete closed PR metrics and omits capped samples (%i items)", async (count) => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 48 * 3_600_000).toISOString();
    const closedAt = new Date(now.getTime() - 24 * 3_600_000).toISOString();
    api.issues.listForRepo.mockImplementation(({ state, page }) => ({ data: state === "open" ? [] : Array.from({ length: Math.min(count, 100) }, (_, i) => ({
      id: page * 100 + i, number: page * 100 + i, title: "Fix", html_url: "https://github.com/acme/widget/pull/1",
      state: "closed", pull_request: {}, labels: [], created_at: createdAt, updated_at: closedAt, closed_at: closedAt,
    })) }));
    const raw = await fetchRepositoryData("acme", "widget");
    const analysis = analyzeRepository({ ...raw, contributorStats: [{ login: "alice", totalCommits: 1, weeks: [{ weekStart: now.toISOString(), commits: 1 }] }] }, { now });
    expect(raw.closedIssuesTruncated).toBe(count === 300);
    expect(analysis.metrics.medianPrCycleTimeHours).toBe(count === 300 ? null : 24);
    expect(analysis.evidence.some((item) => item.title === "Closed issue details are sampled")).toBe(count === 300);
    expect(analysis.evidence.some((item) => item.title === "Recent pull requests are typically closed within two weeks")).toBe(count === 1);
    expect(api.issues.listForRepo).toHaveBeenCalledWith(expect.objectContaining({ state: "closed", sort: "updated", direction: "desc", since: expect.any(String) }));
  });
});
