import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ explore: vi.fn() }));
vi.mock("@/lib/queries/repositories", () => ({ exploreRepositories: mocks.explore }));
vi.mock("@/components/repo/repo-card", () => ({ RepoCard: () => null }));
vi.mock("@/components/explore/filters", () => ({ ExploreFilters: () => null }));
import ExplorePage from "@/app/explore/page";

beforeEach(() => {
  mocks.explore.mockReset().mockResolvedValue({ total: 0, items: [], availableLanguages: [], totalPages: 1 });
});

it("rejects fractional, negative, infinite and overflowing database parameters", async () => {
  for (const value of ["1.01", "-2", "Infinity", "NaN", "1e30"]) {
    await ExplorePage({ searchParams: Promise.resolve({ page: value, minStars: value }) });
    expect(mocks.explore).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1, filters: expect.objectContaining({ minStars: undefined }),
    }));
  }
});

it("keeps valid filters and defaults missing or repeated numeric parameters", async () => {
  await ExplorePage({ searchParams: Promise.resolve({ page: "2", minStars: "1000" }) });
  expect(mocks.explore).toHaveBeenLastCalledWith(expect.objectContaining({
    page: 2, filters: expect.objectContaining({ minStars: 1000 }),
  }));
  await ExplorePage({ searchParams: Promise.resolve({ page: ["2", "3"] }) });
  expect(mocks.explore).toHaveBeenLastCalledWith(expect.objectContaining({
    page: 1, filters: expect.objectContaining({ minStars: undefined }),
  }));
});
