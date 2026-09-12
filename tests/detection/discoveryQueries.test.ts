import { beforeEach, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { repository } }));
import { exploreRepositories, getHomepageSections, getRepositoryDetail, matchProjectsForDeveloper } from "@/lib/queries/repositories";

beforeEach(() => {
  vi.clearAllMocks();
  repository.findMany.mockResolvedValue([]);
  repository.findFirst.mockResolvedValue(null);
  repository.findUnique.mockResolvedValue(null);
  repository.count.mockResolvedValue(0);
});

it("excludes non-public repositories and withdrawn requests from homepage and developer matches", async () => {
  await getHomepageSections();
  await matchProjectsForDeveloper({ languages: [], helpCategories: [], experience: null });
  for (const [args] of [...repository.findMany.mock.calls, ...repository.findFirst.mock.calls]) {
    expect(args.where.isArchived).toBe(false);
    expect(args.where.availability).toEqual("AVAILABLE");
    expect(args.where.maintainerRequests).toEqual({ none: { isActive: true, status: "NOT_LOOKING" } });
  }
});

it("allows browsing HEALTHY while excluding withdrawn requests from help categories", async () => {
  await exploreRepositories({ filters: { status: "HEALTHY" }, sort: "stars", page: 1 });
  expect(repository.findMany.mock.calls[0][0].where).toMatchObject({ status: "HEALTHY", availability: "AVAILABLE" });
  expect(repository.findMany.mock.calls[0][0].where.maintainerRequests).toBeUndefined();
  repository.findMany.mockClear();
  await exploreRepositories({ filters: { helpCategory: "DOCUMENTATION" }, sort: "stars", page: 1 });
  expect(repository.findMany.mock.calls[0][0].where.maintainerRequests).toEqual({ none: { isActive: true, status: "NOT_LOOKING" } });
});

it("hides non-public detail pages publicly while preserving the admin lookup", async () => {
  await getRepositoryDetail("acme", "widget");
  expect(repository.findFirst.mock.calls[0][0].where.availability).toEqual("AVAILABLE");
  await getRepositoryDetail("acme", "widget", true);
  expect(repository.findFirst.mock.calls[1][0].where.availability).toBeUndefined();
});


it("combines every selected status without overwriting earlier choices", async () => {
  await exploreRepositories({ filters: { status: "HEALTHY", seekingMaintainers: true, activelyAsking: true }, sort: "stars", page: 1 });
  expect(repository.findMany.mock.calls[0][0].where.status).toEqual({ in: ["HEALTHY", "SEEKING_MAINTAINERS", "ACTIVELY_ASKING"] });
});

it.each([[30, 999, 2, 24], [0, 999, 1, 0], [30, -1, 1, 0]])("clamps pagination for %i results and requested page %i", async (total, requested, page, skip) => {
  repository.count.mockResolvedValue(total);
  const result = await exploreRepositories({ filters: {}, sort: "stars", page: requested });
  expect(result.page).toBe(page);
  expect(repository.findMany.mock.calls[0][0].skip).toBe(skip);
});

it("resolves repository names without case sensitivity and ranks evidence before limiting it", async () => {
  await getRepositoryDetail("ACME", "Widget");
  expect(repository.findFirst.mock.calls[0][0].where.fullName).toEqual({ equals: "ACME/Widget", mode: "insensitive" });
  await exploreRepositories({ filters: {}, sort: "stars", page: 1 });
  expect(repository.findMany.mock.calls[0][0].select.evidence).toMatchObject({
    orderBy: [{ confidence: "asc" }, { discoveredAt: "desc" }, { id: "asc" }], take: 6,
  });
});
