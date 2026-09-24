import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { repository: mocks } }));
import { exploreRepositories, matchProjectsForDeveloper, type ExploreSort } from "@/lib/queries/repositories";

const SORTS: ExploreSort[] = ["recommended", "upvotes", "stars", "recent", "most-help-needed", "newest"];

beforeEach(() => {
  mocks.findMany.mockReset().mockResolvedValue([]);
  mocks.count.mockReset().mockResolvedValue(100);
});

it.each(SORTS)("orders %s by a unique final key so offset pages never overlap", async (sort) => {
  await exploreRepositories({ filters: {}, sort, page: 2 });
  const { orderBy } = mocks.findMany.mock.calls[0][0];
  expect(orderBy.at(-1)).toEqual({ id: "asc" });
});

it("orders developer matches deterministically", async () => {
  await matchProjectsForDeveloper({ languages: [], helpCategories: [], experience: null });
  expect(mocks.findMany.mock.calls[0][0].orderBy.at(-1)).toEqual({ id: "asc" });
});
