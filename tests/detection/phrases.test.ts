import { describe, it, expect } from "vitest";
import { findPhraseMatches } from "@/lib/detection/phrases";

describe("findPhraseMatches", () => {
  it.each(["help wanted!", "not help wanted "])("handles dense phrase input without growing prefix scans: %s", (phrase) => {
    const text = phrase.repeat(8000);
    const start = performance.now();
    const matches = findPhraseMatches(text);
    const elapsed = performance.now() - start;
    expect(matches).toHaveLength(phrase.startsWith("not") ? 0 : 1);
    // A generous ceiling: the regression takes seconds on this small input.
    expect(elapsed).toBeLessThan(500);
  });

  it.each(["not", "no longer", "aren't", "aren’t"])("retains negation across four intervening words: %s", (negation) => {
    expect(findPhraseMatches(`We ${negation} one two three four ${" ".repeat(1000)}help wanted`)).toEqual([]);
    expect(findPhraseMatches(`We ${negation} one two three four five help wanted`)).toHaveLength(1);
  });

  it("finds the first affirmative match after repeated negated matches", () => {
    const prefix = "not help wanted ".repeat(8000);
    const matches = findPhraseMatches(`${prefix}but help wanted! help wanted!`);
    expect(matches).toHaveLength(1);
    expect(matches[0].index).toBe(prefix.length + 4);
  });

  it("detects seeking-maintainers language", () => {
    const matches = findPhraseMatches("We are looking for maintainers to help run this project.");
    expect(matches).toHaveLength(1);
    expect(matches[0].category).toBe("SEEKING_MAINTAINERS");
  });

  it("detects co-maintainer language distinctly", () => {
    const matches = findPhraseMatches("Seeking co-maintainers for this repo.");
    expect(matches.some((m) => m.category === "SEEKING_MAINTAINERS")).toBe(true);
  });

  it("detects actively-asking language", () => {
    const matches = findPhraseMatches("Contributors welcome! Pull requests are welcome too.");
    expect(matches.every((m) => m.category === "ACTIVELY_ASKING")).toBe(true);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("detects maintenance-mode language", () => {
    const matches = findPhraseMatches("This project is in maintenance mode and only receiving critical bug fixes.");
    expect(matches.some((m) => m.category === "MAINTENANCE_MODE")).toBe(true);
  });

  it("is case-insensitive", () => {
    const matches = findPhraseMatches("MAINTAINER WANTED - please reach out.");
    expect(matches.some((m) => m.category === "SEEKING_MAINTAINERS")).toBe(true);
  });

  it("returns no matches for unrelated text", () => {
    const matches = findPhraseMatches("This library parses dates and formats currency.");
    expect(matches).toHaveLength(0);
  });

  it("returns no matches for null/empty input", () => {
    expect(findPhraseMatches(null)).toHaveLength(0);
    expect(findPhraseMatches("")).toHaveLength(0);
  });

  it("de-duplicates repeated occurrences of the same phrase", () => {
    const matches = findPhraseMatches("help wanted! Yes, help wanted for real.");
    const helpWantedMatches = matches.filter((m) => m.label === "help wanted");
    expect(helpWantedMatches).toHaveLength(1);
  });

  it("captures surrounding context for evidence display", () => {
    const matches = findPhraseMatches(
      "Our small team is stretched thin these days. We are seeking maintainers who can help review pull requests and triage issues going forward."
    );
    const match = matches.find((m) => m.category === "SEEKING_MAINTAINERS");
    expect(match?.context).toContain("seeking maintainers");
  });
});
