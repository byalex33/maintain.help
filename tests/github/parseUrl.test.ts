import { describe, it, expect } from "vitest";
import { parseGitHubRepoUrl } from "@/lib/github/parseUrl";

describe("parseGitHubRepoUrl", () => {
  it("parses a plain https URL", () => {
    expect(parseGitHubRepoUrl("https://github.com/expressjs/express")).toEqual({
      owner: "expressjs",
      repo: "express",
    });
  });

  it("parses a URL with a trailing slash", () => {
    expect(parseGitHubRepoUrl("https://github.com/expressjs/express/")).toEqual({
      owner: "expressjs",
      repo: "express",
    });
  });

  it("parses a URL with a .git suffix", () => {
    expect(parseGitHubRepoUrl("https://github.com/expressjs/express.git")).toEqual({
      owner: "expressjs",
      repo: "express",
    });
  });

  it("parses a URL with extra path segments (e.g. /issues)", () => {
    expect(parseGitHubRepoUrl("https://github.com/expressjs/express/issues")).toEqual({
      owner: "expressjs",
      repo: "express",
    });
  });

  it("parses an SSH-style reference", () => {
    expect(parseGitHubRepoUrl("git@github.com:expressjs/express.git")).toEqual({
      owner: "expressjs",
      repo: "express",
    });
  });

  it("parses a bare owner/repo shorthand", () => {
    expect(parseGitHubRepoUrl("expressjs/express")).toEqual({
      owner: "expressjs",
      repo: "express",
    });
  });

  it("parses a URL missing the protocol", () => {
    expect(parseGitHubRepoUrl("github.com/expressjs/express")).toEqual({
      owner: "expressjs",
      repo: "express",
    });
  });

  it("rejects non-GitHub URLs", () => {
    expect(parseGitHubRepoUrl("https://gitlab.com/expressjs/express")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(parseGitHubRepoUrl("not a url at all")).toBeNull();
    expect(parseGitHubRepoUrl("")).toBeNull();
    expect(parseGitHubRepoUrl("https://github.com/just-an-owner")).toBeNull();
  });
});
