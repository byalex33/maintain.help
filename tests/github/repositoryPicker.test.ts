import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ search: "", owner: "", index: 0 }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [[state.search, state.owner][state.index++] ?? initial, vi.fn()],
}));

import { AddRepositoryForm } from "@/components/add/add-repository-form";

const repositories = ["alice/personal", "team/first", "team/second", "another/project"].map((fullName, id) => ({
  id, fullName, url: `https://github.com/${fullName}`, description: null,
}));

beforeEach(() => { state.search = ""; state.owner = ""; state.index = 0; });

it("shows all repositories and one filter per account or organization", () => {
  const html = renderToStaticMarkup(AddRepositoryForm({ repositories }));
  expect(html).toContain("All accounts");
  expect(html.match(/>team<\/button>/g)).toHaveLength(1);
  for (const repo of repositories) expect(html).toContain(repo.fullName);
});

it("combines the organization selection with repository search", () => {
  state.owner = "team";
  state.search = "SECOND";
  const html = renderToStaticMarkup(AddRepositoryForm({ repositories }));
  expect(html).toContain("team/second");
  for (const name of ["alice/personal", "team/first", "another/project"]) expect(html).not.toContain(name);
  expect(html).toMatch(/aria-pressed="true"[^>]*>team<\/button>/);
});

it("explains empty search results within the selected organization", () => {
  state.owner = "team";
  state.search = "missing";
  expect(renderToStaticMarkup(AddRepositoryForm({ repositories }))).toContain("No repositories match your search in team.");
});
