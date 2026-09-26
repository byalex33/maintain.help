// @vitest-environment happy-dom
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RepositoryOnboarding } from "@/components/add/repository-onboarding";
import { applyMaintainerCategoryOverride } from "@/lib/detection/categories";

vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: null }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function start() { render(createElement(RepositoryOnboarding, { repositories: [] })); }
function enterRequest() {
  fireEvent.change(screen.getByLabelText("GitHub link"), { target: { value: "https://github.com/alice/project" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByLabelText("A note to future contributors"), { target: { value: "Improve the docs and review the UI." } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

it("validates each step and keeps answers when navigating back", () => {
  start();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("alert").textContent).toContain("Enter a GitHub link");
  enterRequest();
  expect(screen.getByRole("button", { name: "Publish repository" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /Docs/ }));
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect((screen.getByLabelText("A note to future contributors") as HTMLTextAreaElement).value).toBe("Improve the docs and review the UI.");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect((screen.getByRole("checkbox", { name: /Docs/ }) as HTMLInputElement).checked).toBe(true);
});

it("keeps failed submissions editable and celebrates only after a successful retry", async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: "GitHub is unavailable." }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ owner: "alice", repo: "project" }) });
  vi.stubGlobal("fetch", fetch);
  start(); enterRequest();
  fireEvent.click(screen.getByRole("checkbox", { name: /Docs/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Design/ }));
  fireEvent.click(screen.getByRole("button", { name: "Publish repository" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("GitHub is unavailable."));
  expect(screen.queryByText("Your repository is listed.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Publish repository" }));
  await waitFor(() => expect(screen.getByText("Your repository is listed.")).toBeTruthy());
  expect(screen.getByRole("link", { name: "View repository" }).getAttribute("href")).toBe("/alice/project");
  expect(JSON.parse(fetch.mock.calls[1][1].body).onboarding.tags).toEqual(["DOCUMENTATION", "DESIGN"]);
});

it("retains explicit tags during reanalysis and clears them when no longer looking", () => {
  expect(applyMaintainerCategoryOverride([], { status: "NEED_COMAINTAINERS", skillsWanted: ["Docs", "Design"] }).map((c) => c.category)).toEqual(["DOCUMENTATION", "DESIGN", "MAINTAINER", "CO_MAINTAINER"]);
  expect(applyMaintainerCategoryOverride([], { status: "NOT_LOOKING", skillsWanted: ["Docs"] })).toEqual([]);
});
