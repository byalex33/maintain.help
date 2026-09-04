import type {
  RawRepositoryData,
  RawIssue,
  RawCommitActivityWeek,
  RawContributorStat,
} from "@/lib/github/types";

let issueIdCounter = 1;

export function makeIssue(overrides: Partial<RawIssue> = {}): RawIssue {
  const id = issueIdCounter++;
  return {
    githubIssueId: id,
    number: id,
    title: `Issue ${id}`,
    url: `https://github.com/acme/widget/issues/${id}`,
    state: "open",
    labels: [],
    isPullRequest: false,
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    closedAt: null,
    commentCount: 0,
    authorAssociation: null,
    authorLogin: null,
    ...overrides,
  };
}

/** Weekly commit totals for the last `weeks` weeks, each with `commitsPerWeek` commits, ending "now". */
export function makeCommitActivity(weeks: number, commitsPerWeek: number, now = new Date("2026-09-04")): RawCommitActivityWeek[] {
  const result: RawCommitActivityWeek[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    result.push({ weekStart: weekStart.toISOString(), total: commitsPerWeek });
  }
  return result;
}

export function makeContributor(
  login: string,
  weeklyCommits: { weeksAgo: number; commits: number }[],
  now = new Date("2026-09-04")
): RawContributorStat {
  const weeks = weeklyCommits.map(({ weeksAgo, commits }) => ({
    weekStart: new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString(),
    commits,
  }));
  return {
    login,
    totalCommits: weeklyCommits.reduce((s, w) => s + w.commits, 0),
    weeks,
  };
}

export function makeRawRepository(overrides: Partial<RawRepositoryData> = {}): RawRepositoryData {
  return {
    githubId: 1,
    owner: "acme",
    name: "widget",
    fullName: "acme/widget",
    description: "A widget factory",
    url: "https://github.com/acme/widget",
    homepage: null,
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 10000 },
    topics: [],
    labels: [],
    stars: 100,
    forks: 10,
    watchers: 5,
    openIssueCount: 0,
    isArchived: false,
    isFork: false,
    createdAtGithub: new Date("2020-01-01").toISOString(),
    pushedAt: new Date("2026-09-01").toISOString(),
    latestReleaseTag: "v1.0.0",
    latestReleaseAt: new Date("2026-08-01").toISOString(),
    license: "MIT",
    defaultBranch: "main",
    readmeText: "# Widget\n\nA widget factory.",
    contributingText: null,
    hasIssueTemplates: false,
    issues: [],
    releases: [{ tagName: "v1.0.0", publishedAt: new Date("2026-08-01").toISOString() }],
    commitActivity: [],
    contributorStats: [],
    discussions: [],
    ...overrides,
  };
}
