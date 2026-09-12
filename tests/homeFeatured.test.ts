import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sections: vi.fn() }));
vi.mock("@/lib/queries/repositories", () => ({ getHomepageSections: mocks.sections, topSignals: () => [] }));
vi.mock("@/components/home/hero-search", () => ({ HeroSearch: () => null }));
import HomePage from "@/app/page";

const featured = {
  id: "featured", owner: "owner", name: "spotlight", description: "Featured repository",
  status: "ACTIVELY_ASKING", stars: 10, forks: 2, primaryLanguage: "TypeScript",
  evidence: [], helpCategories: [],
};

it("renders the featured project once as an outlined standard card in Seeking maintainers", async () => {
  for (const seekingMaintainers of [[], [featured]]) {
    mocks.sections.mockResolvedValue({ featured, seekingMaintainers, activelyAsking: [featured] });
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Seeking maintainers");
    expect(html.match(/href="\/owner\/spotlight"/g)).toHaveLength(1);
    expect(html).toContain("featured-card");
    expect(html).toContain(">Featured</span>");
    expect(html).toContain("Actively asking for help");
    expect(html).not.toContain("featured-repository");
    expect(html).not.toContain("featured-heading");
    expect(html).not.toContain("Projects asking for help");
  }
});

it("keeps ordinary cards and the empty state when no project is featured", async () => {
  mocks.sections.mockResolvedValue({ featured: null, seekingMaintainers: [featured], activelyAsking: [] });
  const html = renderToStaticMarkup(await HomePage());
  expect(html).toContain('href="/owner/spotlight"');
  expect(html).not.toContain("featured-card");
  mocks.sections.mockResolvedValue({ featured: null, seekingMaintainers: [], activelyAsking: [] });
  expect(renderToStaticMarkup(await HomePage())).toContain("No repositories indexed yet.");
});
