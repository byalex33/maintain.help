import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

import { parseGitHubRepoUrl } from "@/lib/github/parseUrl";
import { repositoryExists } from "@/lib/queries/repositories";
import { ingestRepository, RepositoryModerationError } from "@/lib/ingest";
import { GitHubNotFoundError, GitHubRateLimitError, withGitHubErrors } from "@/lib/github/client";
import { auth, getGitHubAccessToken } from "@/lib/auth";
import { canAddPublicRepository } from "@/lib/github/ownedRepositories";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Sign in with GitHub to add a repository." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : "";
  const parsed = parseGitHubRepoUrl(url);

  if (!parsed) {
    return NextResponse.json(
      { error: "Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo" },
      { status: 400 }
    );
  }

  try {
    const token = await getGitHubAccessToken(session.user.id);
    if (!token) return NextResponse.json({ error: "Sign in again to reconnect GitHub." }, { status: 403 });
    const github = new Octokit({ auth: token });
    const { data } = await withGitHubErrors(() => github.repos.get({ owner: parsed.owner, repo: parsed.repo }));
    if (!canAddPublicRepository(data, session.user.githubId)) {
      return NextResponse.json({ error: "Choose a public repository you own or have admin or maintainer access to." }, { status: 403 });
    }
    const alreadyIndexed = await repositoryExists(parsed.owner, parsed.repo);
    const repository = await ingestRepository(parsed.owner, parsed.repo, {
      submittedById: session.user.id,
    });
    return NextResponse.json({ owner: repository.owner, repo: repository.name, existed: alreadyIndexed });
  } catch (err) {
    if (err instanceof RepositoryModerationError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof GitHubNotFoundError || (err && typeof err === "object" && "status" in err && err.status === 404)) {
      return NextResponse.json({ error: `${parsed.owner}/${parsed.repo} was not found on GitHub.` }, { status: 404 });
    }
    if (err instanceof GitHubRateLimitError) {
      return NextResponse.json(
        { error: "maintain.help is rate limited by GitHub right now. Please try again shortly." },
        { status: 429 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong analysing this repository. Please try again later." },
      { status: 500 }
    );
  }
}
