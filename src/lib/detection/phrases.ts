export type PhraseCategory = "SEEKING_MAINTAINERS" | "ACTIVELY_ASKING" | "MAINTENANCE_MODE";

export interface PhraseMatch {
  category: PhraseCategory;
  label: string;
  /** The exact substring that matched. */
  matchedText: string;
  /** Surrounding text, trimmed, for use as evidence context. */
  context: string;
  index: number;
}

interface PhrasePattern {
  category: PhraseCategory;
  label: string;
  pattern: RegExp;
}

// Order matters when categories could overlap: seeking-maintainers phrases are
// checked before the broader "actively asking for contributors" phrases.
const PHRASE_PATTERNS: PhrasePattern[] = [
  // --- Seeking maintainers / successors ---
  { category: "SEEKING_MAINTAINERS", label: "looking for maintainers", pattern: /looking for (?:a |an |new )*(?:co-?)?maintainers?/gi },
  { category: "SEEKING_MAINTAINERS", label: "seeking maintainers", pattern: /seeking (?:a |an |new )*(?:co-?)?maintainers?/gi },
  { category: "SEEKING_MAINTAINERS", label: "maintainer(s) wanted", pattern: /maintainers? wanted/gi },
  { category: "SEEKING_MAINTAINERS", label: "looking for co-maintainers", pattern: /looking for (?:a |an )*co-?maintainers?/gi },
  { category: "SEEKING_MAINTAINERS", label: "seeking co-maintainers", pattern: /seeking (?:a |an )*co-?maintainers?/gi },
  { category: "SEEKING_MAINTAINERS", label: "looking for a new home", pattern: /looking for a new home/gi },
  { category: "SEEKING_MAINTAINERS", label: "project needs a new home", pattern: /(?:project|repo|repository) needs? a new home/gi },
  { category: "SEEKING_MAINTAINERS", label: "looking for a successor", pattern: /looking for a successor/gi },
  { category: "SEEKING_MAINTAINERS", label: "new maintainer needed", pattern: /new maintainers? needed/gi },
  { category: "SEEKING_MAINTAINERS", label: "in need of a maintainer", pattern: /in need of (?:a |an |new )*(?:co-?)?maintainers?/gi },
  { category: "SEEKING_MAINTAINERS", label: "transferring maintainership", pattern: /transferring (?:ownership|maintainership)/gi },
  { category: "SEEKING_MAINTAINERS", label: "step down as maintainer", pattern: /stepping down as (?:a |the )?maintainer/gi },
  { category: "SEEKING_MAINTAINERS", label: "need help maintaining", pattern: /need help maintain(?:ing)?/gi },
  { category: "SEEKING_MAINTAINERS", label: "help with maintenance", pattern: /help with (?:project )?maintenance/gi },

  // --- Actively asking for contributor help ---
  { category: "ACTIVELY_ASKING", label: "looking for contributors", pattern: /looking for (?:more |new )*contributors/gi },
  { category: "ACTIVELY_ASKING", label: "contributors wanted", pattern: /contributors wanted/gi },
  { category: "ACTIVELY_ASKING", label: "contributors welcome", pattern: /contributors? (?:are )?welcome/gi },
  { category: "ACTIVELY_ASKING", label: "help wanted", pattern: /\bhelp wanted\b/gi },
  { category: "ACTIVELY_ASKING", label: "we welcome contributions", pattern: /we welcome (?:contributions|contributors)/gi },
  { category: "ACTIVELY_ASKING", label: "pull requests welcome", pattern: /pull requests? (?:are )?welcome/gi },
  { category: "ACTIVELY_ASKING", label: "contributions welcome", pattern: /contributions (?:are )?welcome/gi },

  // --- Maintenance mode / reduced maintenance (only meaningful from maintainer-authored sources) ---
  { category: "MAINTENANCE_MODE", label: "maintenance mode", pattern: /maintenance mode/gi },
  { category: "MAINTENANCE_MODE", label: "critical fixes only", pattern: /only (?:receiving|accepting|merging) critical (?:fixes|bug ?fixes|security fixes)/gi },
  { category: "MAINTENANCE_MODE", label: "limited maintenance", pattern: /limited maintenance/gi },
  { category: "MAINTENANCE_MODE", label: "no longer actively developed", pattern: /no longer (?:being )?actively (?:developed|maintained)/gi },
  { category: "MAINTENANCE_MODE", label: "security fixes only", pattern: /security (?:fixes|patches) only/gi },
  { category: "MAINTENANCE_MODE", label: "project maintenance", pattern: /project (?:is in |under )?maintenance/gi },
];

const CONTEXT_RADIUS = 100;

function extractContext(text: string, index: number, matchLength: number): string {
  const start = Math.max(0, index - CONTEXT_RADIUS);
  const end = Math.min(text.length, index + matchLength + CONTEXT_RADIUS);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

/**
 * Case-insensitive scan for explicit "help wanted" style language.
 * Returns the first match per (category, label) pair so evidence stays de-duplicated.
 */
export function findPhraseMatches(text: string | null | undefined): PhraseMatch[] {
  if (!text) return [];
  const seen = new Set<string>();
  const matches: PhraseMatch[] = [];

  for (const { category, label, pattern } of PHRASE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const key = `${category}:${label}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({
          category,
          label,
          matchedText: match[0],
          context: extractContext(text, match.index, match[0].length),
          index: match.index,
        });
      }
      // Guard against zero-length matches causing infinite loops.
      if (match[0].length === 0) pattern.lastIndex++;
    }
  }

  return matches;
}

export function hasCategory(matches: PhraseMatch[], category: PhraseCategory): boolean {
  return matches.some((m) => m.category === category);
}
