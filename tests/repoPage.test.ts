import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
const mocks = vi.hoisted(() => ({ repository: vi.fn(), auth: vi.fn(), saved: vi.fn() }));
vi.mock("@/lib/queries/repositories", () => ({ getRepositoryDetail: mocks.repository }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth, isAdminGitHubId: () => false }));
vi.mock("@/lib/db", () => ({ db: { repositoryUpvote: { findUnique: async () => null }, savedRepository: { findUnique: mocks.saved }, repositoryMaintainer: { findFirst: async () => null } } }));
vi.mock("@/app/admin/actions", () => ({ resolveReport: vi.fn(), moderateRepository: vi.fn() }));
vi.mock("@/app/upvotes/actions", () => ({ setRepositoryUpvoted: vi.fn() }));
vi.mock("@/app/saved/actions", () => ({ setRepositorySaved: vi.fn() }));
vi.mock("@/app/[owner]/[repo]/feedback/actions", () => ({ submitRepositoryFeedback: vi.fn() }));

import RepoPage from "@/app/[owner]/[repo]/page";

it("renders the repo overview, evidence and saved control, with honest empty states", async () => {
  const repository = {
    _count: { upvotes: 3 }, id: "fixture", owner: "brightloop", name: "queuelight", fullName: "brightloop/queuelight",
    url: "https://github.com/brightloop/queuelight", description: "A lightweight, embeddable job queue for Node.js.",
    primaryLanguage: "TypeScript", stars: 4200, forks: 210, license: "MIT", isFixture: true,
    isIndexed: true, isLocked: false, availability: "AVAILABLE", status: "SEEKING_MAINTAINERS", statusConfidence: "HIGH",
    statusVerified: false, analysisVersion: 1, lastAnalyzedAt: new Date("2026-09-09T12:00:00Z"),
    statusHistory: [], pushedAt: null, latestReleaseAt: null, latestReleaseTag: null,
    maintainerRequests: [], maintainers: [], issues: [], topics: ["job-queue", "nodejs", "typescript"],
    helpCategories: [{ category: "CODE", verified: false }, { category: "DOCUMENTATION", verified: true }],
    evidence: [{ id: "signal", title: "Maintainer seeking a successor", description: "The README invites contributors to help maintain the project.", confidence: "HIGH", type: "EXPLICIT", sourceType: "README", sourceUrl: "https://github.com/brightloop/queuelight" }],
    metricSnapshots: [{ capturedAt: new Date("2026-09-09"), activeMaintainersLast365d: 2, openIssues: 34, openPullRequests: 16, commitsLast30d: 8, medianOpenPrAgeDays: null }],
  };
  mocks.repository.mockResolvedValue(repository);
  mocks.auth.mockResolvedValue({ user: { id: "user" } });
  mocks.saved.mockResolvedValue({ id: "saved" });
  const render = async () => renderToStaticMarkup(await RepoPage({ params: Promise.resolve({ owner: "brightloop", repo: "queuelight" }), searchParams: Promise.resolve({}) }));
  const html = await render();
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('href="#evidence"');
  expect(html).toContain('id="evidence"');
  expect(html).toContain("Maintainer seeking a successor");
  expect(html).toContain("Not available");
  expect(html).toContain("Like brightloop/queuelight, 3 likes");
  expect(html).toContain("Send feedback");
  expect(html).toContain("Send report");
  expect(html).toContain("Activity timeline");
  expect(html).toContain("No activity milestones have been recorded yet.");
  mocks.repository.mockResolvedValue({ ...repository, statusHistory: Array.from({ length: 7 }, (_, index) => ({
    id: `status-${index}`, status: "HEALTHY", reason: `Reason ${index}`, verified: false, createdAt: new Date(`2026-09-0${index + 1}T12:00:00Z`),
  })) });
  const history = await render();
  expect(history).toContain("Show 2 more milestones");
  expect(history).toContain("Reason 6");
  expect(history).not.toContain("Reason 0");
  expect(history).toContain('aria-expanded="false"');
  expect(history).toContain("up to 20 recent classification records");
  mocks.repository.mockResolvedValue({ ...repository, metricSnapshots: [], evidence: [], helpCategories: [] });
  mocks.auth.mockResolvedValue(null);
  const empty = await render();
  expect(empty).toContain("callbackUrl=%2Fbrightloop%2Fqueuelight%2Fclaim");
  expect(empty).toContain("callbackUrl=%2Fbrightloop%2Fqueuelight%3Ffeedback%3Dopen%23feedback");
  mocks.repository.mockResolvedValue({ ...repository, isArchived: true });
  const archived = await render();
  expect(archived).not.toContain("Where you can help");
  expect(archived).not.toContain("Find your next contribution");
  expect(archived).not.toContain("/claim");
  const feedback = renderToStaticMarkup(await RepoPage({ params: Promise.resolve({ owner: "brightloop", repo: "queuelight" }), searchParams: Promise.resolve({ feedback: "open" }) }));
  expect(feedback).toMatch(/<details[^>]*id="feedback"[^>]*open=""/);
  await expect(RepoPage({ params: Promise.resolve({ owner: "BrightLoop", repo: "QueueLight" }), searchParams: Promise.resolve({ report: "open" }) })).rejects.toMatchObject({ digest: expect.stringContaining("/brightloop/queuelight?report=open") });
  expect(empty).toContain("Activity will appear after");
  expect(empty).toContain("No supporting evidence");
  expect(empty).not.toContain('aria-pressed=');

  const request = { status: "NEED_MAINTAINER", message: "Take over releases", skillsWanted: [], user: {} };
  mocks.repository.mockResolvedValue({ ...repository, maintainerRequests: [{ ...request, createdAt: new Date() }] });
  expect(await render()).toContain("Verified by repository maintainer");
  mocks.repository.mockResolvedValue({ ...repository, maintainerRequests: [{ ...request, createdAt: new Date(Date.now() - 91 * 86_400_000) }] });
  const expired = await render();
  expect(expired).not.toContain("Verified by repository maintainer");
  expect(expired).not.toContain("Take over releases");
  expect(expired).toContain("Claim this repository");

  mocks.repository.mockResolvedValue(repository);
  const page = (searchParams: Record<string, string>) => RepoPage({ params: Promise.resolve({ owner: "brightloop", repo: "queuelight" }), searchParams: Promise.resolve(searchParams) }).then(renderToStaticMarkup);
  const duplicate = await page({ report: "duplicate" });
  expect(duplicate).toMatch(/<details[^>]*id="report"[^>]*open=""/);
  expect(duplicate).toContain("already have an open submission");
  expect(await page({ feedback: "limit" })).toContain("limit for feedback and reports");
  expect(await page({ feedback: "sent" })).toContain("Feedback sent.");
  expect(await page({ report: "sent" })).toContain("Report sent.");
  expect(await page({ report: "bogus" })).not.toContain('role="status"');
});
