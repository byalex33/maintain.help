import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.stubGlobal("React", React);
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { savedRepository: { findMany: async () => [] } } }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
import SavedRepositoriesPage from "@/app/saved/page";
it("preserves the saved destination for visitors and lets the layout own the main landmark", async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(SavedRepositoriesPage()).rejects.toThrow("redirect:/sign-in?callbackUrl=%2Fsaved");
  mocks.auth.mockResolvedValue({ user: { id: "user" } });
  const html = renderToStaticMarkup(await SavedRepositoriesPage());
  expect(html).toContain("Saved repositories");
  expect(html).not.toContain("<main");
});
