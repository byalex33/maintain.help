export const HELP_WANTED_LABEL = /help.?wanted/i;
export const GOOD_FIRST_ISSUE_LABEL = /good.?first.?issue|beginner.?friendly|first-timers?-only/i;

/** Use the same label union for aggregate counts and their supporting links. */
export function issueLabelQuery(labels: string[], pattern: RegExp, canonical: string): string {
  const matching = [...new Set([canonical, ...labels.filter((label) => pattern.test(label))])];
  return `is:issue is:open label:${matching.map((label) => JSON.stringify(label)).join(",")}`;
}
