import "server-only";
import { graphql } from "@octokit/graphql";
import { getOctokit, withGitHubErrors, GitHubNotFoundError } from "./client";
import { isBotAccount } from "./bots";
import type {
  RawRepositoryData,
  RawIssue,
  RawRelease,
  RawCommitActivityWeek,
  RawContributorStat,
  RawDiscussion,
} from "./types";

const MAX_ISSUE_PAGES = 3; // 100 per page -> up to 300 most-recently-updated issues/PRs
const ISSUES_PER_PAGE = 100;

function decodeBase64(content: string): string {
  return Buffer.from(content, "base64").toString("utf-8");
}

/**
 * Fetches everything the detection/scoring engine needs for one repository.
 * Intended for use in ingestion jobs (add-repository flow, scheduled reanalysis),
 * not on every page render — results should be persisted via `db`.
 */
export async function fetchRepositoryData(owner: string, repo: string): Promise<RawRepositoryData> {
  const octokit = getOctokit();

  const repoResponse = await withGitHubErrors(() =>
    octokit.repos.get({ owner, repo }).catch((err: unknown) => {
      if (typeof err === "object" && err !== null && "status" in err && (err as { status: number }).status === 404) {
        throw new GitHubNotFoundError(owner, repo);
      }
      throw err;
    })
  );
  const r = repoResponse.data;

  const [
    languages,
    readmeText,
    contributingText,
    hasIssueTemplates,
    issues,
    releases,
    commitActivity,
    contributorStats,
    labels,
    discussions,
  ] = await Promise.all([
    fetchLanguages(owner, repo),
    fetchTextFile(owner, repo, "README"),
    fetchContributing(owner, repo),
    fetchHasIssueTemplates(owner, repo),
    fetchIssues(owner, repo),
    fetchReleases(owner, repo),
    fetchCommitActivity(owner, repo),
    fetchContributorStats(owner, repo),
    fetchLabels(owner, repo),
    r.has_discussions ? fetchDiscussions(owner, repo) : Promise.resolve([]),
  ]);

  const humanCommitActivity = contributorStats.length > 0 ? contributorActivity(contributorStats) : commitActivity;

  return {
    githubId: r.id,
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? null,
    url: r.html_url,
    homepage: r.homepage ?? null,
    primaryLanguage: r.language ?? null,
    languages,
    topics: r.topics ?? [],
    labels,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    watchers: r.subscribers_count ?? r.watchers_count ?? 0,
    openIssueCount: r.open_issues_count ?? 0,
    isArchived: r.archived ?? false,
    isFork: r.fork ?? false,
    createdAtGithub: r.created_at,
    pushedAt: r.pushed_at ?? null,
    latestReleaseTag: releases[0]?.tagName ?? null,
    latestReleaseAt: releases[0]?.publishedAt ?? null,
    license: r.license?.spdx_id ?? r.license?.name ?? null,
    defaultBranch: r.default_branch ?? "main",
    readmeText,
    contributingText,
    hasIssueTemplates,
    issues,
    releases,
    commitActivity: humanCommitActivity,
    contributorStats,
    discussions,
  };
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 404;
}

async function fetchLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  const octokit = getOctokit();
  const { data } = await withGitHubErrors(() => octokit.repos.listLanguages({ owner, repo }));
  return data as Record<string, number>;
}

async function fetchTextFile(owner: string, repo: string, kind: "README"): Promise<string | null> {
  const octokit = getOctokit();
  try {
    const { data } =
      kind === "README"
        ? await withGitHubErrors(() => octokit.repos.getReadme({ owner, repo }))
        : await Promise.reject(new Error("unsupported"));
    if ("content" in data && typeof data.content === "string") {
      return decodeBase64(data.content);
    }
    return null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

const CONTRIBUTING_PATHS = ["CONTRIBUTING.md", ".github/CONTRIBUTING.md", "docs/CONTRIBUTING.md", "CONTRIBUTING"];

async function fetchContributing(owner: string, repo: string): Promise<string | null> {
  const octokit = getOctokit();
  for (const path of CONTRIBUTING_PATHS) {
    try {
      const { data } = await withGitHubErrors(() => octokit.repos.getContent({ owner, repo, path }));
      if (!Array.isArray(data) && "content" in data && typeof data.content === "string") {
        return decodeBase64(data.content);
      }
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
  return null;
}

async function fetchHasIssueTemplates(owner: string, repo: string): Promise<boolean> {
  const octokit = getOctokit();
  try {
    const { data } = await withGitHubErrors(() =>
      octokit.repos.getContent({ owner, repo, path: ".github/ISSUE_TEMPLATE" })
    );
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    try {
      await withGitHubErrors(() =>
        octokit.repos.getContent({ owner, repo, path: ".github/ISSUE_TEMPLATE.md" })
      );
      return true;
    } catch (nestedError) {
      if (isNotFound(nestedError)) return false;
      throw nestedError;
    }
  }
}

async function fetchIssues(owner: string, repo: string): Promise<RawIssue[]> {
  const octokit = getOctokit();
  const results: RawIssue[] = [];
  for (let page = 1; page <= MAX_ISSUE_PAGES; page++) {
    const { data } = await withGitHubErrors(() =>
      octokit.issues.listForRepo({
        owner,
        repo,
        state: "all",
        sort: "updated",
        direction: "desc",
        per_page: ISSUES_PER_PAGE,
        page,
      })
    );
    for (const issue of data) {
      results.push({
        githubIssueId: issue.id,
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        state: issue.state === "closed" ? "closed" : "open",
        labels: (issue.labels ?? []).map((l) => (typeof l === "string" ? l : l.name ?? "")).filter(Boolean),
        isPullRequest: Boolean(issue.pull_request),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at ?? null,
        commentCount: issue.comments ?? 0,
        authorAssociation: issue.author_association ?? null,
        authorLogin: issue.user?.login ?? null,
      });
    }
    if (data.length < ISSUES_PER_PAGE) break;
  }
  return results;
}

async function fetchReleases(owner: string, repo: string): Promise<RawRelease[]> {
  const octokit = getOctokit();
  const { data } = await withGitHubErrors(() => octokit.repos.listReleases({ owner, repo, per_page: 20 }));
  return data.map((rel) => ({ tagName: rel.tag_name, publishedAt: rel.published_at ?? null }));
}

/** GitHub computes these stats asynchronously; a 202 means "come back later". */
async function fetchCommitActivity(owner: string, repo: string): Promise<RawCommitActivityWeek[]> {
  const octokit = getOctokit();
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await withGitHubErrors(() => octokit.repos.getCommitActivityStats({ owner, repo }));
    if (Array.isArray(response.data)) return response.data.map((week) => ({
      weekStart: new Date(week.week * 1000).toISOString(), total: week.total,
    }));
    if (response.status === 202) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  return [];
}

async function fetchContributorStats(owner: string, repo: string): Promise<RawContributorStat[]> {
  const octokit = getOctokit();
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await withGitHubErrors(() => octokit.repos.getContributorsStats({ owner, repo }));
    if (!Array.isArray(response.data)) {
      if (response.status === 202) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      continue;
    }
    return response.data
      .filter((c) => c.author && !isBotAccount(c.author.login ?? "", c.author.type))
      .map((c) => ({
        login: c.author!.login ?? "unknown",
        totalCommits: c.total,
        weeks: c.weeks.map((w) => ({
          weekStart: new Date((w.w ?? 0) * 1000).toISOString(),
          commits: w.c ?? 0,
        })),
      }));
  }
  return [];
}

async function fetchLabels(owner: string, repo: string): Promise<string[]> {
  const octokit = getOctokit();
  const { data } = await withGitHubErrors(() => octokit.issues.listLabelsForRepo({ owner, repo, per_page: 100 }));
  return data.map((label) => label.name);
}

interface DiscussionsQuery {
  repository: { discussions: { nodes: Array<{ title: string; body: string; url: string; updatedAt: string; authorAssociation: string }> } } | null;
}

async function fetchDiscussions(owner: string, repo: string): Promise<RawDiscussion[]> {
  const token = process.env.GITHUB_ANALYSIS_TOKEN;
  if (!token) return [];
  const result = await withGitHubErrors(() => graphql<DiscussionsQuery>(
      `query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          discussions(first: 30, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes { title body url updatedAt authorAssociation }
          }
        }
      }`,
      { owner, repo, headers: { authorization: `token ${token}` } }
  ));
  const cutoff = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
  return (result.repository?.discussions.nodes ?? []).filter((discussion) => Date.parse(discussion.updatedAt) >= cutoff);
}

function contributorActivity(contributors: RawContributorStat[]): RawCommitActivityWeek[] {
  const totals = new Map<string, number>();
  for (const contributor of contributors) {
    for (const week of contributor.weeks) totals.set(week.weekStart, (totals.get(week.weekStart) ?? 0) + week.commits);
  }
  return [...totals].map(([weekStart, total]) => ({ weekStart, total }));
}
