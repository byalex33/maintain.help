export interface RawIssue {
  githubIssueId: number;
  number: number;
  title: string;
  url: string;
  state: "open" | "closed";
  labels: string[];
  isPullRequest: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  commentCount: number;
  authorAssociation: string | null;
  authorLogin?: string | null;
}

export interface RawRelease {
  tagName: string;
  publishedAt: string | null;
}

export interface RawCommitActivityWeek {
  weekStart: string;
  total: number;
}

export interface RawContributorWeek {
  weekStart: string;
  commits: number;
}

export interface RawContributorStat {
  login: string;
  totalCommits: number;
  weeks: RawContributorWeek[];
}

export interface RawDiscussion {
  title: string;
  body: string;
  url: string;
  updatedAt: string;
  authorAssociation?: string | null;
}

export interface RawRepositoryData {
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  topics: string[];
  labels?: string[];
  stars: number;
  forks: number;
  watchers: number;
  openIssueCount: number;
  isArchived: boolean;
  isFork: boolean;
  createdAtGithub: string;
  pushedAt: string | null;
  latestReleaseTag: string | null;
  latestReleaseAt: string | null;
  license: string | null;
  defaultBranch: string;

  readmeText: string | null;
  contributingText: string | null;
  hasIssueTemplates: boolean;

  issues: RawIssue[];
  releases: RawRelease[];
  commitActivity: RawCommitActivityWeek[];
  contributorStats: RawContributorStat[];
  discussions?: RawDiscussion[];
}
