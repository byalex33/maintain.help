import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { analyzeRepository } from "@/lib/detection/analyze";
import { OpenOpportunities } from "@/components/repo/open-opportunities";
import type { GitHubIssue } from "@/generated/prisma/client";
import { makeIssue, makeRawRepository } from "./fixtures/rawRepository";
vi.stubGlobal("React", React);

it.each(["first-timers-only", "beginner-friendly", "help-wanted"])("keeps %s consistent across counts, evidence and contribution links", (label) => {
  const issue = makeIssue({ labels: [label], title: "Alias opportunity" });
  const result = analyzeRepository(makeRawRepository({ labels: [label], issues: [issue] }));
  expect(result.metrics.goodFirstIssueCount + result.metrics.helpWantedIssueCount).toBe(1);
  expect(result.categories).toContainEqual({ category: "CODE", verified: true });
  const evidence = result.evidence.find((item) => item.sourceUrl?.includes("/issues?q="));
  expect(evidence).toBeDefined();
  expect(new URL(evidence!.sourceUrl!).searchParams.get("q")).toContain(`"${label}"`);
  const issues = [
    { ...issue, id: "open" },
    { ...issue, id: "closed", state: "closed", title: "Closed opportunity" },
    { ...issue, id: "pr", isPullRequest: true, title: "Pull request opportunity" },
  ] as unknown as GitHubIssue[];
  const html = renderToStaticMarkup(React.createElement(OpenOpportunities, { issues }));
  expect(html).toContain("Alias opportunity");
  expect(html).not.toContain("Closed opportunity");
  expect(html).not.toContain("Pull request opportunity");
});
