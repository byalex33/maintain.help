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

it("excludes private and withdrawn requests from homepage and developer matches", async () => {
  await getHomepageSections();
  await matchProjectsForDeveloper({ languages: [], helpCategories: [], experience: null });
  for (const [args] of [...repository.findMany.mock.calls, ...repository.findFirst.mock.calls]) {
    expect(args.where.availability).toEqual({ not: "PRIVATE" });
    expect(args.where.maintainerRequests).toEqual({ none: { isActive: true, status: "NOT_LOOKING" } });
  }
});

it("allows browsing HEALTHY while excluding withdrawn requests from help categories", async () => {
  await exploreRepositories({ filters: { status: "HEALTHY" }, sort: "stars", page: 1 });
  expect(repository.findMany.mock.calls[0][0].where).toMatchObject({ status: "HEALTHY", availability: { not: "PRIVATE" } });
  expect(repository.findMany.mock.calls[0][0].where.maintainerRequests).toBeUndefined();
  repository.findMany.mockClear();
  await exploreRepositories({ filters: { helpCategory: "DOCUMENTATION" }, sort: "stars", page: 1 });
  expect(repository.findMany.mock.calls[0][0].where.maintainerRequests).toEqual({ none: { isActive: true, status: "NOT_LOOKING" } });
});

it("hides private detail pages publicly while preserving the admin lookup", async () => {
  await getRepositoryDetail("acme", "widget");
  expect(repository.findUnique.mock.calls[0][0].where.availability).toEqual({ not: "PRIVATE" });
  await getRepositoryDetail("acme", "widget", true);
  expect(repository.findUnique.mock.calls[1][0].where.availability).toBeUndefined();
});
