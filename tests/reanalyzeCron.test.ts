import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn(), ingest: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { repository: { findMany: mocks.findMany, count: mocks.count } } }));
vi.mock("@/lib/ingest", () => ({ ingestRepository: mocks.ingest }));
import { GET } from "@/app/api/cron/reanalyze/route";
import { GitHubRateLimitError } from "@/lib/github/client";

const repo = (id: number) => ({ id: `r${id}`, owner: "o", name: `n${id}` });
const request = () => new NextRequest("http://localhost/api/cron/reanalyze", { headers: { authorization: "Bearer secret" } });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "secret");
  mocks.findMany.mockReset();
  mocks.count.mockReset().mockResolvedValue(7);
  mocks.ingest.mockReset().mockResolvedValue({});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("rejects requests without the cron secret", async () => {
  const response = await GET(new NextRequest("http://localhost/api/cron/reanalyze"));
  expect(response.status).toBe(401);
  expect(mocks.findMany).not.toHaveBeenCalled();
});

it("keeps fetching batches past the old fixed limit, never retrying a repository, and reports the backlog", async () => {
  const batches = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17]].map((ids) => ids.map(repo));
  batches.forEach((batch) => mocks.findMany.mockResolvedValueOnce(batch));
  mocks.findMany.mockResolvedValue([]);

  const body = await (await GET(request())).json();

  expect(body).toMatchObject({ analyzed: 17, remainingDue: 7, rateLimited: false });
  expect(mocks.findMany.mock.calls[1][0].where.id).toEqual({ notIn: ["r1", "r2", "r3", "r4", "r5"] });
});

it("stops at the GitHub rate limit", async () => {
  mocks.findMany.mockResolvedValue([repo(1), repo(2), repo(3)]);
  mocks.ingest.mockResolvedValueOnce({}).mockRejectedValueOnce(new GitHubRateLimitError(null));

  const body = await (await GET(request())).json();

  expect(body).toMatchObject({ analyzed: 2, rateLimited: true });
  expect(mocks.ingest).toHaveBeenCalledTimes(2);
});

it("stops starting new work once the time budget is spent", async () => {
  let now = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  mocks.findMany.mockResolvedValue([repo(1), repo(2), repo(3)]);
  mocks.ingest.mockImplementation(async () => { now += 150_000; });

  const body = await (await GET(request())).json();

  expect(body.analyzed).toBe(2);
});
