import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { ingestRepository } from "@/lib/ingest";
import { GitHubRateLimitError } from "@/lib/github/client";
import type { Prisma } from "@/generated/prisma/client";

export const maxDuration = 300;

// Stop starting new analyses well before maxDuration; one import (GitHub fetch plus a 30s transaction) can take ~60s.
const WORK_BUDGET_MS = 200_000;
const BATCH_SIZE = 5;

/**
 * Scheduled reanalysis. Intended to be triggered by a Vercel Cron Job hitting
 * this route on a schedule (see vercel.json). Works through due repositories,
 * most stale first, until the time budget or GitHub rate limit is reached —
 * this deliberately never attempts to scan all of GitHub. The response reports
 * the remaining due backlog so staleness is visible.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deadline = Date.now() + WORK_BUDGET_MS;
  const due = (): Prisma.RepositoryWhereInput => ({
    isIndexed: true,
    isLocked: false,
    isFixture: false,
    OR: [{ nextAnalysisAt: null }, { nextAnalysisAt: { lte: new Date() } }],
  });
  // Recently analysed repositories return from cache without rescheduling, so never retry one in this run.
  const attempted: string[] = [];
  const results: { repo: string; ok: boolean; error?: string }[] = [];
  let rateLimited = false;

  while (!rateLimited && Date.now() < deadline) {
    const candidates = await db.repository.findMany({
      where: { ...due(), id: { notIn: [...attempted] } },
      select: { id: true, owner: true, name: true },
      orderBy: [{ lastAnalyzedAt: "asc" }, { stars: "desc" }, { id: "asc" }],
      take: BATCH_SIZE,
    });
    if (!candidates.length) break;

    for (const candidate of candidates) {
      if (Date.now() >= deadline) break;
      attempted.push(candidate.id);
      const fullName = `${candidate.owner}/${candidate.name}`;
      try {
        await ingestRepository(candidate.owner, candidate.name);
        results.push({ repo: fullName, ok: true });
      } catch (err) {
        results.push({ repo: fullName, ok: false, error: err instanceof Error ? err.message : "Unknown error" });
        if (err instanceof GitHubRateLimitError) {
          rateLimited = true;
          break;
        }
      }
    }
  }

  const remainingDue = await db.repository.count({ where: due() });
  return NextResponse.json({ analyzed: results.length, remainingDue, rateLimited, results });
}
