import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  search: "", owner: "", index: 0, effects: [] as (() => void)[],
  reauthorize: vi.fn(), signedIn: false, provider: "github",
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: state.signedIn ? { verifiedExternalAccounts: [{ id: "account-1", provider: state.provider, reauthorize: state.reauthorize }] } : null }) }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: (effect: () => void) => { state.effects.push(effect); },
  useState: (initial: unknown) => [[state.search, state.owner][state.index++] ?? initial, vi.fn()],
}));

import { AddRepositoryForm } from "@/components/add/add-repository-form";

const repositories = ["alice/personal", "team/first", "team/second", "another/project"].map((fullName, id) => ({
  id, fullName, url: `https://github.com/${fullName}`, description: null,
}));

beforeEach(() => { state.search = ""; state.owner = ""; state.index = 0; state.effects = []; state.signedIn = false; state.provider = "github"; state.reauthorize.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

it("shows all repositories and one filter per account or organization", () => {
  const html = renderToStaticMarkup(createElement(AddRepositoryForm, { repositories }));
  expect(html).toContain("All accounts");
  expect(html.match(/>team<\/button>/g)).toHaveLength(1);
  for (const repo of repositories) expect(html).toContain(repo.fullName);
});

it("combines the organization selection with repository search", () => {
  state.owner = "team";
  state.search = "SECOND";
  const html = renderToStaticMarkup(createElement(AddRepositoryForm, { repositories }));
  expect(html).toContain("team/second");
  for (const name of ["alice/personal", "team/first", "another/project"]) expect(html).not.toContain(name);
  expect(html).toMatch(/aria-pressed="true"[^>]*>team<\/button>/);
});

it("explains empty search results within the selected organization", () => {
  state.owner = "team";
  state.search = "missing";
  expect(renderToStaticMarkup(createElement(AddRepositoryForm, { repositories }))).toContain("No repositories match your search in team.");
});

it("shows memberships even when the organization has no eligible repositories", () => {
  state.owner = "empty-org";
  const html = renderToStaticMarkup(createElement(AddRepositoryForm, { repositories, organizations: ["empty-org", "team"], personalLogin: "alice" }));
  expect(html).toContain(">empty-org</button>");
  expect(html).toContain("No eligible public repositories are available in empty-org.");
});


it("shows a retry without blaming missing permissions for temporary failures", () => {
  const html = renderToStaticMarkup(createElement(AddRepositoryForm, { repositories, organizationsUnavailable: true }));
  expect(html).toContain("Retry organizations");
  expect(html).not.toContain("Approve GitHub organization access once");
});

it("explains one-time consent only when GitHub reports missing access", () => {
  const html = renderToStaticMarkup(createElement(AddRepositoryForm, { repositories, organizationsUnavailable: true, needsOrganizationAccess: true }));
  expect(html).toContain("Approve GitHub organization access once");
  expect(html).toContain("Connect organizations");
});

it("does not ask to connect organizations after they load successfully", () => {
  const html = renderToStaticMarkup(createElement(AddRepositoryForm, { repositories, organizations: ["team"] }));
  expect(html).not.toContain("Connect organizations");
});


it.each(["github", "oauth_github"])("starts %s consent automatically only for missing access, once across remounts", async (provider) => {
  state.provider = provider;
  const entries = new Map<string, string>();
  const assign = vi.fn();
  vi.stubGlobal("window", {
    sessionStorage: { getItem: (key: string) => entries.get(key), setItem: (key: string, value: string) => entries.set(key, value) },
    location: { assign },
  });
  state.signedIn = true;
  state.reauthorize.mockResolvedValue({ verification: { externalVerificationRedirectURL: new URL("https://github.com/login/oauth/authorize") } });
  for (const needsOrganizationAccess of [false, true, true]) {
    state.index = 0;
    state.effects = [];
    renderToStaticMarkup(createElement(AddRepositoryForm, { repositories, organizationsUnavailable: true, needsOrganizationAccess }));
    state.effects.forEach((effect) => effect());
    await Promise.resolve();
    expect(state.reauthorize).toHaveBeenCalledTimes(needsOrganizationAccess ? 1 : 0);
  }
  expect(state.reauthorize).toHaveBeenCalledWith({ additionalScopes: ["read:org"], redirectUrl: "/add" });
  expect(assign).toHaveBeenCalledTimes(1);
});
