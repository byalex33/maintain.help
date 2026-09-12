import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/app/upvotes/actions", () => ({ setRepositoryUpvoted: vi.fn() }));
import { UpvoteButton } from "@/components/repo/upvote-button";

it("renders persisted counts, accessible heart states and a sign-in return link", () => {
  const props = { repositoryId: "repo", repositoryPath: "/owner/repo", count: 2, upvoted: true, signedIn: true };
  const html = renderToStaticMarkup(createElement(UpvoteButton, props));
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('aria-label="Like owner/repo, 2 likes"');
  expect(html).toContain("fill-current");
  expect(html).not.toContain("like-particle");
  const unliked = renderToStaticMarkup(createElement(UpvoteButton, { ...props, upvoted: false }));
  expect(unliked).toContain('aria-pressed="false"');
  expect(unliked).not.toContain("fill-current");
  const anonymous = renderToStaticMarkup(createElement(UpvoteButton, { ...props, upvoted: false, signedIn: false }));
  expect(anonymous).toContain('href="/sign-in?callbackUrl=%2Fowner%2Frepo"');
  expect(anonymous).not.toContain("<button");
});
