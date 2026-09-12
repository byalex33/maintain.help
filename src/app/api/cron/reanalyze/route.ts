import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { ingestRepository } from "@/lib/ingest";
import { GitHubRateLimitError } from "@/lib/github/client";

export const maxDuration = 300;

// Kept small so one cron invocation stays well within serverless execution limits.
const BATCH_SIZE = 15;

/**
 * Scheduled reanalysis. Intended to be triggered by a Vercel Cron Job hitting
 * this route on a schedule (see vercel.json). Prioritises repositories that
 * are either manually submitted or already popular/indexed, and picks the
 * most stale ones first; this deliberately never attempts to scan all of
 * GitHub.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await db.repository.findMany({
    where: {
      isIndexed: true,
      isLocked: false,
      isFixture: false,
      OR: [{ nextAnalysisAt: null }, { nextAnalysisAt: { lte: new Date() } }],
    },
    select: { owner: true, name: true, lastAnalyzedAt: true },
    orderBy: [{ lastAnalyzedAt: "asc" }, { stars: "desc" }],
    take: BATCH_SIZE,
  });

  const results: { repo: string; ok: boolean; error?: string }[] = [];

  for (const candidate of candidates) {
    const fullName = `${candidate.owner}/${candidate.name}`;
    try {
      await ingestRepository(candidate.owner, candidate.name);
      results.push({ repo: fullName, ok: true });
    } catch (err) {
      results.push({ repo: fullName, ok: false, error: err instanceof Error ? err.message : "Unknown error" });
      if (err instanceof GitHubRateLimitError) break;
    }
  }

  return NextResponse.json({ analyzed: results.length, results });
}
