import type {
  RawIssue,
  RawCommitActivityWeek,
  RawContributorStat,
} from "../../src/lib/github/types";

let issueId = 500_000;

export function daysAgo(n: number, from: Date): string {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

export function issue(overrides: Partial<RawIssue> & { url: string }): RawIssue {
  issueId += 1;
  return {
    githubIssueId: issueId,
    number: issueId - 500_000,
    title: "Untitled issue",
    state: "open",
    labels: [],
    isPullRequest: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
    commentCount: 0,
    authorAssociation: null,
    ...overrides,
  };
}

export function manyIssues(
  count: number,
  base: Omit<RawIssue, "githubIssueId" | "number" | "title" | "url">,
  urlBase: string,
  titlePrefix: string
): RawIssue[] {
  return Array.from({ length: count }, (_, i) =>
    issue({ ...base, url: `${urlBase}/issues/${1000 + i}`, title: `${titlePrefix} ${i + 1}` })
  );
}

export function commitActivity(weeks: { weeksAgo: number; total: number }[], now: Date): RawCommitActivityWeek[] {
  return weeks.map(({ weeksAgo, total }) => ({
    weekStart: new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString(),
    total,
  }));
}

export function steadyCommitActivity(weeksCount: number, perWeek: number, now: Date): RawCommitActivityWeek[] {
  return commitActivity(
    Array.from({ length: weeksCount }, (_, i) => ({ weeksAgo: i, total: perWeek })),
    now
  );
}

export function contributor(
  login: string,
  weeklyCommits: { weeksAgo: number; commits: number }[],
  now: Date
): RawContributorStat {
  return {
    login,
    totalCommits: weeklyCommits.reduce((s, w) => s + w.commits, 0),
    weeks: weeklyCommits.map(({ weeksAgo, commits }) => ({
      weekStart: new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString(),
      commits,
    })),
  };
}
