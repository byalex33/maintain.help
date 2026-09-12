# Site audit fixes — 2026-09-12

| Issue | Resolution | Verification |
| --- | --- | --- |
| #14 | Proxy excludes exact static assets instead of repository name suffixes. | Matcher regression cases; production browser renders `AuditOwner/audit.js`. |
| #15 | Search input remounts when the URL query changes; unchanged blur does not reset pagination. | Browser search then Back restores both query and input. |
| #16 | Dropdown and checkbox statuses form a union, explained beside the controls. | Query regression and browser selection of both checkboxes returns both statuses. |
| #17 | Shared case-insensitive name filter; canonical detail/claim redirects, metadata and mutation destinations. | Query/action tests; browser lowercase owner redirects while preserving feedback query. |
| #18 | Repeated callback parameters fall back to `/`. | Regression test and production sign-in browser check. |
| #19 | Clamp page before fetching records and generate links from that page. | Empty/negative/excessive page tests; 30 local records show page 2 of 2 with Previous=1. |
| #20 | Preserve claim, feedback and Saved destinations; reopen feedback on return. | Render/redirect tests and browser checks of sign-in URLs. |
| #21 | Exclude archived records from actionable discovery; suppress detail help, opportunity and claim sections. | Query/render tests and archived fixture browser check. |
| #22 | Rank evidence by confidence before limiting, with timestamp and ID tie breakers. | Query regression and seeded evidence in production browser. |
| #23 | Saved content uses a div under the shared layout main. | Render regression asserts no nested main. |
| #24 | Reuse label aliases for aggregate queries, evidence links, category mapping and open opportunities. | Alias regressions cover first-timers-only, beginner-friendly, help-wanted, closed issues and PRs. |
| #25 | Scope overrides to Prisma's vulnerable deepmerge-ts and mysql2 dependencies. | Full and production npm audits, Prisma generation/migrations/seed, tests and production build. |

Validation: 233 tests passed; three existing PostgreSQL concurrency tests skipped (require a native PostgreSQL test database). ESLint, production build and generated-route type checking passed. Browser checks used the production build on port 3001 and a dedicated local Prisma database, with fixture-only writes. No production database was changed. A complete third-party OAuth round trip was not performed; callback wiring and authenticated redirect behavior have automated coverage.

Dependency overrides retain Prisma 7.10.0 and install deepmerge-ts 8.0.2 and mysql2 3.24.4. Both `npm audit` and `npm audit --omit=dev` report zero vulnerabilities. The deepmerge major override was checked by loading Prisma config, generating the client, applying all nine migrations and seeding a fresh local database. See [deepmerge-ts 8.0.2](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.2) and [the advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). Remove the overrides when Prisma ships patched ranges.

Analysis version advances to 4 for the alias evidence change. Previously persisted evidence links update when repositories are reanalysed; this PR does not run production reanalysis.

## Follow-up code review

An independent review and direct Prisma/PostgreSQL reproduction found that case-insensitive `equals` uses `ILIKE`: `AuditOwner/audit_3` incorrectly matched `AuditOwner/audit-3`. The shared identity filter now escapes underscores, percent signs and backslashes. All ingestion identity lookups use the same filter, including retry updates and replacement detection, so the fix also protects writes. A rollback-only database regression verifies case-insensitive matching without wildcard collisions.

Updated validation: 234 tests passed in the default suite (four environment-gated integration tests skipped); the new PostgreSQL identity regression also passed separately on the dedicated local test database. Type checking and focused ESLint passed. No other actionable defects were found in the PR review.
