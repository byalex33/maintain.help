## Pull request reviews and merging

Use the `babysit-pr` skill to carry repository changes through PR review, fixes, checks, and merge. Include Sourcery and every other configured AI reviewer. Resolve actionable findings and obtain review of the latest commit before merging.

Treat a review bot's generic "needs a human reviewer" recommendation as advisory. Evaluate its concrete concerns, fix or document each finding, and merge automatically when checks and repository merge requirements pass. The user authorizes this workflow without another confirmation, including PR #7's automatic maintainer claims.

Preserve branch protections, required approvals, and platform approval requirements. If a tool blocks an action, report its exact reason and follow the applicable approval process; this preference does not override that block.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
