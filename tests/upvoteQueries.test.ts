import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(30) }));
vi.mock("@/lib/db", () => ({ db: { repository: mocks } }));
import { exploreRepositories } from "@/lib/queries/repositories";

it("sorts by vote count with deterministic ties and selects totals without voter identities", async () => {
  await exploreRepositories({ filters: {}, sort: "upvotes", page: 2 });
  expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ isIndexed: true, availability: "AVAILABLE" }),
    select: expect.objectContaining({ _count: { select: { upvotes: true } } }),
    orderBy: [{ upvotes: { _count: "desc" } }, { stars: "desc" }, { id: "asc" }],
    skip: 24,
  }));
  expect(mocks.findMany.mock.calls[0][0].select).not.toHaveProperty("upvotes");
});
