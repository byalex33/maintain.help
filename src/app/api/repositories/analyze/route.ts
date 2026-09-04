import { NextRequest, NextResponse } from "next/server";

import { parseGitHubRepoUrl } from "@/lib/github/parseUrl";
import { repositoryExists } from "@/lib/queries/repositories";
import { ingestRepository } from "@/lib/ingest";
import { GitHubNotFoundError, GitHubRateLimitError } from "@/lib/github/client";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : "";
  const parsed = parseGitHubRepoUrl(url);

  if (!parsed) {
    return NextResponse.json(
      { error: "Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo" },
      { status: 400 }
    );
  }

  const alreadyIndexed = await repositoryExists(parsed.owner, parsed.repo);

  try {
    const session = await auth();
    const repository = await ingestRepository(parsed.owner, parsed.repo, {
      submittedById: session?.user?.id,
    });
    return NextResponse.json({ owner: repository.owner, repo: repository.name, existed: alreadyIndexed });
  } catch (err) {
    if (err instanceof GitHubNotFoundError) {
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
