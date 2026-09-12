import type { ComputedMetrics } from "./metrics";

export interface Signal {
  id: string;
  description: string;
  weight: number;
}

export interface ScoreResult {
  score: number;
  signals: Signal[];
}

/**
 * Transparent, additive heuristic scoring; no ML. Each signal is a small,
 * named, explainable rule so it can be surfaced directly as evidence.
 *
 * Deliberately conservative: a single weak signal (e.g. "one active
 * maintainer") must never, by itself, cross the "likely needs help"
 * threshold. Only a *combination* of backlog / staleness / concentration
 * signals should. A quiet-but-finished project must score low.
 */
export function computeCapacityPressureScore(m: ComputedMetrics): ScoreResult {
  const signals: Signal[] = [];

  if (m.activeMaintainersLast365d === 1) {
    signals.push({
      id: "single-active-maintainer",
      description: `${m.activeMaintainersLast365d} active contributor in the last 12 months`,
      weight: 8,
    });
  } else if (m.activeMaintainersLast365d === 2) {
    signals.push({
      id: "few-active-maintainers",
      description: `Only ${m.activeMaintainersLast365d} active contributors in the last 12 months`,
      weight: 4,
    });
  }

  if (m.topContributorShareLast365d !== null && m.topContributorShareLast365d >= 0.75) {
    signals.push({
      id: "commit-concentration",
      description: `One contributor accounts for ${Math.round(m.topContributorShareLast365d * 100)}% of commits in the last 12 months`,
      weight: 10,
    });
  }

  // Zero usually means GitHub's asynchronous contributor endpoint had no data,
  // not that the project literally has no maintainers.
  const maintainerCount = m.activeMaintainersLast365d || 10;
  const prsPerMaintainer = m.openPullRequests / maintainerCount;
  const issuesPerMaintainer = m.openIssues / maintainerCount;
  const contributorDataMissing = m.activeMaintainersLast365d === 0;

  if (contributorDataMissing ? m.openPullRequests >= 50 : prsPerMaintainer >= 40) {
    signals.push({ id: "pr-backlog-high", description: `${m.openPullRequests} open pull requests`, weight: 20 });
  } else if (contributorDataMissing ? m.openPullRequests >= 25 : prsPerMaintainer >= 15) {
    signals.push({ id: "pr-backlog-medium", description: `${m.openPullRequests} open pull requests`, weight: 10 });
  }

  if (m.openPullRequests >= 5 && m.medianOpenPrAgeDays !== null && m.medianOpenPrAgeDays > 90) {
    signals.push({
      id: "pr-age-high",
      description: `Median open pull request age is ${Math.round(m.medianOpenPrAgeDays)} days`,
      weight: 15,
    });
  } else if (m.openPullRequests >= 5 && m.medianOpenPrAgeDays !== null && m.medianOpenPrAgeDays > 45) {
    signals.push({
      id: "pr-age-medium",
      description: `Median open pull request age is ${Math.round(m.medianOpenPrAgeDays)} days`,
      weight: 8,
    });
  }

  if (contributorDataMissing ? m.openIssues >= 100 : issuesPerMaintainer >= 40) {
    signals.push({ id: "issue-backlog-high", description: `${m.openIssues} unresolved issues`, weight: 12 });
  } else if (contributorDataMissing ? m.openIssues >= 50 : issuesPerMaintainer >= 15) {
    signals.push({ id: "issue-backlog-medium", description: `${m.openIssues} unresolved issues`, weight: 6 });
  }

  if (m.openIssues >= 10 && m.medianOpenIssueAgeDays !== null && m.medianOpenIssueAgeDays > 120) {
    signals.push({
      id: "issue-age-high",
      description: `Median open issue age is ${Math.round(m.medianOpenIssueAgeDays)} days`,
      weight: 10,
    });
  } else if (m.openIssues >= 10 && m.medianOpenIssueAgeDays !== null && m.medianOpenIssueAgeDays > 60) {
    signals.push({
      id: "issue-age-medium",
      description: `Median open issue age is ${Math.round(m.medianOpenIssueAgeDays)} days`,
      weight: 5,
    });
  }

  if (m.commitsLast365d > 0) {
    const quarterlyAverage = m.commitsLast365d / 4;
    if (quarterlyAverage > 0 && m.commitsLast90d < quarterlyAverage * 0.4) {
      signals.push({
        id: "commit-decline",
        description: "Maintainer commit activity has declined substantially over the last 3 months relative to the last 12",
        weight: 15,
      });
    }
  }

  if (m.newIssuesLast90d > 0 && m.closedIssuesLast90d < m.newIssuesLast90d * 0.5) {
    signals.push({
      id: "growing-backlog",
      description: "Issues are being opened faster than they are being closed",
      weight: 10,
    });
  }

  if (m.newPullRequestsLast90d >= 5 && m.closedPullRequestsLast90d < m.newPullRequestsLast90d * 0.4) {
    signals.push({
      id: "low-pr-closure-ratio",
      description: "Recent pull requests are closing substantially slower than they are opening",
      weight: 10,
    });
  }

  if (m.staleDependencyOrSecurityPrCount > 0) {
    signals.push({
      id: "stale-dependency-security-prs",
      description: `${m.issuesSampled ? "At least " : ""}${m.staleDependencyOrSecurityPrCount} dependency/security pull request(s) open for more than 30 days`,
      weight: 8,
    });
  }

  const score = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));
  return { score, signals };
}
