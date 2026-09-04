/**
 * Parses a GitHub repository reference into { owner, repo }.
 *
 * Accepts:
 *  - https://github.com/owner/repo
 *  - https://github.com/owner/repo.git
 *  - https://github.com/owner/repo/ (trailing slash, extra path segments)
 *  - git@github.com:owner/repo.git
 *  - owner/repo
 */
export interface ParsedRepoRef {
  owner: string;
  repo: string;
}

const OWNER_REPO_SEGMENT = /^[A-Za-z0-9._-]+$/;

export function parseGitHubRepoUrl(input: string): ParsedRepoRef | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // git@github.com:owner/repo.git
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(\.git)?\/?$/i);
  if (sshMatch) {
    return normalize(sshMatch[1], sshMatch[2]);
  }

  // owner/repo shorthand (no protocol, no dots that would indicate a domain)
  if (!trimmed.includes("://") && !trimmed.startsWith("github.com")) {
    const parts = trimmed.split("/").filter(Boolean);
    if (parts.length === 2 && OWNER_REPO_SEGMENT.test(parts[0]) && OWNER_REPO_SEGMENT.test(parts[1])) {
      return normalize(parts[0], parts[1].replace(/\.git$/i, ""));
    }
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repoRaw] = parts;
    if (!OWNER_REPO_SEGMENT.test(owner) || !OWNER_REPO_SEGMENT.test(repoRaw)) return null;
    return normalize(owner, repoRaw.replace(/\.git$/i, ""));
  } catch {
    return null;
  }
}

function normalize(owner: string, repo: string): ParsedRepoRef | null {
  if (!owner || !repo) return null;
  return { owner, repo };
}

export function repoFullName(ref: ParsedRepoRef): string {
  return `${ref.owner}/${ref.repo}`;
}
