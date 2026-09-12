import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: "", setQuery: vi.fn(), focus: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: () => [mocks.query, mocks.setQuery],
  useRef: () => ({ current: { focus: mocks.focus } }),
}));

import { HeroSearch } from "@/components/home/hero-search";

it("clears without submitting, restores focus, and safely submits search text", () => {
  mocks.query = "  C++ & docs  ";
  const form = HeroSearch();
  const clearButton = form.props.children[0].props.children[2];
  expect(clearButton.props.type).toBe("button");
  expect(clearButton.props["aria-label"]).toBe("Clear search");
  clearButton.props.onClick();
  expect(mocks.setQuery).toHaveBeenCalledWith("");
  expect(mocks.focus).toHaveBeenCalledOnce();
  expect(mocks.push).not.toHaveBeenCalled();

  const preventDefault = vi.fn();
  form.props.onSubmit({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(mocks.push).toHaveBeenLastCalledWith("/explore?q=C%2B%2B+%26+docs");

  mocks.query = "";
  const emptyForm = HeroSearch();
  expect(emptyForm.props.children[0].props.children[2]).toBeNull();
  emptyForm.props.onSubmit({ preventDefault });
  expect(mocks.push).toHaveBeenLastCalledWith("/explore");
});
