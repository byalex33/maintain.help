import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
const mocks = vi.hoisted(() => ({ repository: vi.fn(), auth: vi.fn(), saved: vi.fn() }));
vi.mock("@/lib/queries/repositories", () => ({ getRepositoryDetail: mocks.repository }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth, isAdminLogin: () => false }));
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
  expect(html).toContain("Upvote repository, 3 upvotes");
  expect(html).toContain("Send feedback");
  expect(html).toContain("Send report");
  mocks.repository.mockResolvedValue({ ...repository, metricSnapshots: [], evidence: [], helpCategories: [] });
  mocks.auth.mockResolvedValue(null);
  const empty = await render();
  expect(empty).toContain("Activity will appear after");
  expect(empty).toContain("No supporting evidence");
  expect(empty).not.toContain('aria-pressed=');
});
