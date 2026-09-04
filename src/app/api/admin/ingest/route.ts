import { auth, isAdminLogin } from "@/lib/auth";
import { ingestRepository } from "@/lib/ingest";
import { discoverAndIngest } from "@/lib/github/discovery";
import { parseGitHubRepoUrl } from "@/lib/github/parseUrl";
import { GitHubRateLimitError } from "@/lib/github/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdminLogin(session?.user.githubLogin)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (typeof body?.search === "string" && body.search.trim()) {
    return Response.json({ results: await discoverAndIngest(body.search.trim(), Number(body.limit) || 10) });
  }

  const refs = Array.isArray(body?.repositories) ? body.repositories.slice(0, 25) : [];
  const parsed = refs.map((ref: unknown) => typeof ref === "string" ? parseGitHubRepoUrl(ref) : null);
  if (parsed.some((ref: unknown) => !ref)) return Response.json({ error: "Invalid repository reference" }, { status: 400 });

  const results = [];
  for (const ref of parsed) {
    try {
      const repository = await ingestRepository(ref!.owner, ref!.repo);
      results.push({ fullName: repository.fullName, ok: true });
    } catch (error) {
      results.push({ fullName: `${ref!.owner}/${ref!.repo}`, ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      if (error instanceof GitHubRateLimitError) break;
    }
  }
  return Response.json({ results });
}
