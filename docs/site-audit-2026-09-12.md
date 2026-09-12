# Site audit: 12 September 2026

Audited the local working tree at base commit `ee5ff4ed34a86590f461b17eae62050838f4afdf` and the deployed site at https://maintain.help. Production differs from the checkout; its exact revision was not established. Other work changed the shared tree during the audit. Findings below identify their evidence and environment.

## Coverage and results

| Area | Checks and outcome |
| --- | --- |
| Quality gates | 187 tests passed; three database integration checks skipped because TEST_DATABASE_URL was not configured. Typecheck and production build passed. Final lint passed. |
| Local startup | Started Next.js and the documented existing Prisma development database. Initial ECONNREFUSED was an inactive local database, not filed as a product bug. No reset or seed was run. |
| Public discovery | Homepage, Explore search, status combinations, pagination, matching, empty states, repository detail, evidence and opportunities inspected. |
| Responsive / accessibility | Repository detail visually inspected at 390×844 in the built-in browser; no horizontal overflow observed there. Controls and landmarks inspected through accessibility trees. This is not a WCAG certification or every-device matrix. |
| Authentication / authorization | Signed-out saved/profile/settings/add/claim redirect checks; admin and admin-users return 404; cron endpoints return 401; admin ingestion returns 403; repository ingestion rejects anonymous requests. External sign-in callback falls back safely; repeated callback crashes. |
| Deployed account flows | Existing signed-in session used for profile, settings, Add picker and empty search, saved page, repository detail, admin directory. Empty display name is blocked by browser validation. Save/unsave of aya-rs/aya succeeded; saved list was verified empty again. Non-maintainer claim correctly reports read access and withholds the form. |
| Source review | Traced ingestion, analysis, persistence, queries, URL parsing, GitHub permissions, claims, feedback, saves, profile/deletion, moderation and cron routes. No production credentials or personal report contents included in evidence. |
| SEO | robots.txt and sitemap.xml return 200. Reviewed metadata and route generation. A concurrent change removed /add from the sitemap during the audit; no issue filed for it. |
| Tooling | Initial lint scanned .worktrees and produced 165 errors/108 warnings. Concurrent work added an ignore; rerun passed. No open issue filed for the resolved condition. |

## Limits

No destructive account deletion, repository deletion/locking, permission expansion, genuine feedback/report submission, or new repository ingestion was performed. Provider failures, account-deletion partial failures and concurrent database races were source/test reviewed rather than triggered against production. No load test, exhaustive screen-reader test, or full browser/OS matrix was performed. Dependency advisories were scanned with npm audit; application exploitability was not established. Existing database records include old analyses and development fixtures; their contents were not re-ingested. A successful build is not proof that the deployed revision matches this checkout.

## Findings

### 1. [P1] Repository names ending in .js or other asset extensions return 500

**Issue:** [#14](https://github.com/byalex33/maintain.help/issues/14).

**Reproduction**

1. Start the configured local app.
2. GET `/vercel/next.js` or `/owner/repo.css`.
3. Compare with `/owner/repo-no-extension`.

**Expected behavior**
Repository routes must run session middleware, including valid repository names containing asset-like suffixes. Existing listings should render; absent listings should return 404.

**Actual behavior / evidence**
The extension-bearing routes return HTTP 500. The server records `Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware()`. The extension-free missing listing correctly returns 404.

**Relevant code**
`src/proxy.ts` excludes asset extensions anywhere in the pathname. Both the root header and repository page call auth(). The matcher must distinguish app repository paths from real static assets.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Local HTTP reproduction; not reproduced against production.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 2. [P2] Explore search input keeps stale text after browser Back

**Issue:** [#15](https://github.com/byalex33/maintain.help/issues/15).

**Reproduction**

1. Open `/explore`.
2. Enter `tilix` in Search and press Enter.
3. Confirm one matching repository.
4. Use browser Back.

**Expected behavior**
Search text should reflect the restored URL and results after Back/Forward.

**Actual behavior / evidence**
URL returns to `/explore` and the page shows `30 repositories indexed`, but Search still contains `tilix`. Leaving the field can reapply this stale query through onBlur.

**Relevant code**
`src/components/explore/filters.tsx` uses an uncontrolled `defaultValue` derived from searchParams. It does not synchronize when client navigation changes q.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Local built-in browser, signed out. Counts depend on the existing local data.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 3. [P2] Explore status controls silently overwrite each other

**Issue:** [#16](https://github.com/byalex33/maintain.help/issues/16).

**Reproduction**

1. Open `/explore?seekingMaintainers=1` and note seeking-maintainer results.
2. Also check Actively asking for help, or open `/explore?seekingMaintainers=1&activelyAsking=1`.
3. Try combining a Status dropdown value with either checkbox.

**Expected behavior**
Use mutually exclusive controls or explicit combination semantics. The UI must not show an active filter that the query silently discards.

**Actual behavior / evidence**
Both checkboxes remain selected but results contain only ACTIVELY_ASKING repositories (8 in local data); the seeking-maintainer selection is silently ignored. Checkbox flags also override the Status dropdown.

**Relevant code**
`buildExploreWhere` in `src/lib/queries/repositories.ts` assigns where.status for status, then seekingMaintainers, then activelyAsking; the last assignment wins.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Local built-in browser plus source tracing.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 4. [P2] Repository URLs fail when GitHub owner or repository casing differs

**Issue:** [#17](https://github.com/byalex33/maintain.help/issues/17).

**Reproduction**

1. With the existing PyGithub listing, GET `/PyGithub/PyGithub`.
2. GET `/pygithub/pygithub`.

**Expected behavior**
Resolve names case-insensitively and redirect to the stored canonical URL. Apply the same identity rules to detail and claim flows.

**Actual behavior / evidence**
Canonical casing returns 200; lowercase returns 404 even though both identify the same GitHub repository.

**Relevant code**
`getRepositoryDetail` and `repositoryExists` in `src/lib/queries/repositories.ts`, plus claim lookups, use exact fullName equality. Ingestion already resolves fullName case-insensitively.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Local HTTP reproduction with an existing mixed-case listing.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 5. [P2] Repeated callbackUrl parameters crash the sign-in page

**Issue:** [#18](https://github.com/byalex33/maintain.help/issues/18).

**Reproduction**

1. While signed out, GET `/sign-in?callbackUrl=%2Fsaved&callbackUrl=%2Fprofile`.

**Expected behavior**
Reject or normalize repeated parameters and render sign-in using a safe local fallback.

**Actual behavior / evidence**
HTTP 500; server error: `TypeError: callbackUrl?.startsWith is not a function`.

**Relevant code**
`src/app/sign-in/page.tsx` assumes callbackUrl is a string. Next.js supplies string[] for repeated search parameters, as documented by the installed page convention guide.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Local HTTP reproduction, signed out.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 6. [P2] Out-of-range Explore pages show contradictory empty results and unusable pagination

**Issue:** [#19](https://github.com/byalex33/maintain.help/issues/19).

**Reproduction**

1. With 30 indexed repositories, open `/explore?page=999`.

**Expected behavior**
Clamp/redirect to a valid page or show a proper not-found response with a useful way back. Do not describe an invalid page offset as no matching repositories.

**Actual behavior / evidence**
Page says `30 repositories indexed`, `No repositories match these filters`, and `Page 999 of 2`. Previous points to page 998, requiring hundreds of clicks to reach results.

**Relevant code**
`src/app/explore/page.tsx` bounds the integer but not the result page range; `exploreRepositories` applies skip before resolving/clamping totalPages.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Local built-in browser and HTTP reproduction.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 7. [P2] Sign-in from Claim, feedback, and Saved loses the user's destination

**Issue:** [#20](https://github.com/byalex33/maintain.help/issues/20).

**Reproduction**

1. Signed out, open an unclaimed repository such as `/FactoryGameFan/factorio-blueprint-editor`.
2. Follow Claim this repository or Sign in to send feedback.
3. Inspect the sign-in URL; separately request `/saved` while signed out.

**Expected behavior**
Preserve the claim/repository/saved destination through sign-in.

**Actual behavior / evidence**
Claim and feedback link to bare `/sign-in`; `/saved` redirects there too. SignInPage defaults the completion destination to `/`, losing the original task. The report link and direct claim route already preserve callbackUrl.

**Relevant code**
Bare sign-in links in `src/components/repo/claim-banner.tsx` and the repository page, and the redirect in `src/app/saved/page.tsx`. Reuse the existing local callbackUrl pattern.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Local browser/HTTP and code-confirmed redirect configuration. A fresh OAuth round trip was not performed.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 8. [P2] Find a project recommends archived repositories as contribution opportunities

**Issue:** [#21](https://github.com/byalex33/maintain.help/issues/21).

**Reproduction**

1. Open `/find-a-project?languages=JavaScript` with the existing local data.
2. Observe atom/atom among matches.
3. Open `/atom/atom`.

**Expected behavior**
Exclude archived repositories from actionable matching by default, or make their read-only status explicit and avoid presenting current issues as contribution opportunities.

**Actual behavior / evidence**
The match includes atom/atom. Its detail page explicitly says Archived and read-only maintenance mode, yet also renders Where you can help and open contribution opportunities.

**Relevant code**
`matchProjectsForDeveloper` checks visibility and NOT_LOOKING requests but not isArchived. The detail page also renders help/opportunities without an archive guard.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Local built-in browser with an existing archived real-repository record. No new ingestion performed.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 9. [P2] Repository cards select arbitrary evidence before ranking confidence

**Issue:** [#22](https://github.com/byalex33/maintain.help/issues/22).

**Reproduction**

1. Compare the same repository card across homepage sections, Explore, and reloads.
2. On the local data, compare the PyGithub or brightloop/queuelight cards.
3. On the deployed homepage, compare ytsaurus/ytsaurus across sections.

**Expected behavior**
Choose the strongest relevant evidence deterministically before truncating the relation. Tied timestamps should not change which signals explain the listing.

**Actual behavior / evidence**
Different signals appear for the same repository. Local seeking-maintainer cards sometimes omit the explicit maintainer request and show generic setup/activity signals instead. Live ytsaurus cards display different selections across homepage sections.

**Relevant code**
`repositoryCardSelect.evidence` orders only by discoveredAt and takes six, then topSignals sorts that already-truncated subset by confidence. An analysis inserts many evidence rows with tied/default timestamps, so strong signals can be excluded before ranking.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Observed in local and deployed built-in-browser pages; current local source confirms ordering/truncation. Production revision is unknown.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 10. [P3] Saved repositories nests a main landmark inside the shared layout main

**Issue:** [#23](https://github.com/byalex33/maintain.help/issues/23).

**Reproduction**

1. Sign in and open `/saved`.
2. Inspect accessibility landmarks or `document.querySelectorAll('main main')`.

**Expected behavior**
One main landmark for the page; the saved page content should use a section/div under the layout landmark.

**Actual behavior / evidence**
The deployed accessibility tree contains main > main > Saved repositories. The current local saved page returns a main element inside RootLayout's main.

**Relevant code**
`src/app/saved/page.tsx` returns `<main>` while `src/app/layout.tsx` already wraps children in `<main>`.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Deployed built-in-browser accessibility tree, corroborated by current local source.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.

### 11. [P2] Recognized beginner-label aliases produce incorrect evidence links and no opportunities

**Issue:** [#24](https://github.com/byalex33/maintain.help/issues/24).

**Reproduction**

1. Analyze a repository with one open issue labelled only `first-timers-only` (the existing makeRawRepository/makeIssue fixtures can reproduce this without GitHub).
2. Inspect goodFirstIssueCount and its generated LABEL evidence.
3. Pass the same issue to OpenOpportunities.

**Expected behavior**
Evidence text/links and opportunity filtering should recognize the same label aliases as ingestion/metrics.

**Actual behavior / evidence**
The count is 1, but VERIFIED evidence says the issue is labelled `good first issue` and links to a query for that different label. OpenOpportunities does not recognize `first-timers-only`, so it omits the actual matching issue.

**Relevant code**
`src/lib/detection/metrics.ts` and fetchIssueStatistics recognize first-timers-only and other aliases; `src/lib/detection/evidence.ts` hard-codes canonical label links; `src/components/repo/open-opportunities.tsx` matches only four literal substrings.

**Environment and scope**
Audit date: 2026-09-12. Local base commit: ee5ff4ed34a86590f461b17eae62050838f4afdf, with pre-existing and concurrent uncommitted changes. Windows, Node 22.17.1, Next.js 16.3.4, React 19.2.8, Prisma 7.10.0. Executed local fixture analysis confirms the wrong count-to-link mapping. Opportunity omission is source-confirmed; no production alias example was claimed.

No application changes were made by this audit. This finding is not claimed to be introduced by the current work. Open and closed repository issues were checked before filing; no matching issue was found. No issue template was present.


### 12. [P2] Triage npm audit advisories in the Prisma dependency chain

**Issue:** [#25](https://github.com/byalex33/maintain.help/issues/25).

## Reproduction
Run `npm audit --json` and `npm ls deepmerge-ts mysql2 prisma @prisma/config` in the checkout.

## Actual behavior
On 2026-09-12 npm audit reports four high-severity package entries: prisma, @prisma/config, deepmerge-ts and mysql2. These are dependency-chain entries, not four independent exploits.

Installed paths:
- prisma@7.10.0 > @prisma/config@7.10.0 > deepmerge-ts@7.1.5
- prisma@7.10.0 > mysql2@3.15.3

Advisories reported by npm:
- [DeepmergeTS recursive-object stack exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), affected <8.0.0.
- [MySQL2 auth plugin downgrade](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), affected <3.22.0.
- [MySQL2 compressed-protocol decompression DoS](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), affected <=3.23.0 (moderate advisory; package entry high).

## Expected behavior
Triage dependency reachability and move to a compatible dependency graph that addresses the advisories, or document why an advisory is not reachable in the shipped application.

## Scope / limitations
This is an installed-dependency finding, NOT a demonstrated exploit against maintain.help. The application uses PostgreSQL through @prisma/adapter-pg; MySQL2 is transitive tooling. No malicious payload or credential attack was attempted. npm proposes a breaking Prisma downgrade to 6.19.3; do not apply npm audit fix --force blindly. No dependency changes were made.

Environment: Windows, Node 22.17.1, base commit ee5ff4ed34a86590f461b17eae62050838f4afdf with concurrent working-tree changes. No matching open/closed issue found; no issue template present.
