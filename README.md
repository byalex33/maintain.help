# maintain.help

Evidence-backed discovery for open-source repositories that are asking for help or showing capacity pressure.

## Getting Started

Copy `.env.example` to `.env`, configure Postgres and GitHub credentials, then run:

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

For the embedded local database, run `npm run db:dev` in a separate terminal,
use its TCP database URL, and set `PRISMA_DEV_DATABASE="true"` in `.env`.
The app and seed script then use one connection per process and promptly close
idle connections. Prisma v7's `pg` adapter needs these pool options explicitly;
the old `connection_limit` URL parameter does not configure its pool.
Leave this flag false for real Postgres. Restart Next.js after changing it.

If the embedded server returns `Connection terminated unexpectedly` after
builds/restarts, stop it with `npx prisma dev stop default`, then restart it
with `npm run db:dev`. Its socket layer can retain stale connection slots even
when the port is still listening. Restarting preserves all data; do not reset
or remove the database. This is a local database limitation, not a Clerk error.

## Validation commands

```bash
npm run calibrate:ingest
npm run analyze:repo -- owner/repo
npm test
npm run typecheck
npm run lint
```

`calibrate:ingest` indexes the controlled set in `scripts/calibrate-ingest.ts`. `analyze:repo` ingests one repository and prints a readable analysis summary.

## Internal routes

- `/admin/calibration` requires the signed-in GitHub login in `ADMIN_GITHUB_LOGINS`.
- `/api/admin/ingest` accepts a bounded repository list or GitHub search query.
- `/api/cron/analyze-repositories` requires `Authorization: Bearer $CRON_SECRET`.

GitHub tokens remain server-only.

## Authentication (Clerk, GitHub only)

Create a Clerk application with GitHub enabled and every other sign-in method
(including email/password, phone and Google) disabled. Copy its
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` into your ignored `.env`.
Only the publishable key belongs in browser code. Keep `GITHUB_ANALYSIS_TOKEN`
separate: it is for public repository ingestion, never user permissions.

The integration follows the [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart).
`/sign-in` uses Clerk's hosted UI components; `src/proxy.ts` establishes sessions.
Public discovery remains public, with permission checks in server actions and API routes.
GitHub sign-up uses the same screen. Claim checks retrieve the current user's
GitHub OAuth token from Clerk on the server.

For production, create a Clerk production instance, configure the maintain.help
domain and the GitHub connection using Clerk's callback URL (not the old
`/api/auth/callback/github` URL), and set that instance's keys in your hosting environment.
Clerk's development GitHub connection uses shared credentials by default.
Do not add private-repository scopes merely for public discovery; organization
OAuth policies can still require an organization owner to approve claim checks.

Apply migrations with `npx prisma migrate deploy`, then `npm run db:generate`.
The Clerk migration only adds nullable, unique `User.clerkId`. On first sign-in,
the verified GitHub numeric ID links the existing local user, preserving saves,
claims and reviews. Email/username matching is never used to merge accounts.
Legacy auth tables remain inert to avoid deleting existing data; no old sessions
or stored OAuth tokens are accepted. NextAuth and its environment variables are
no longer used. A GitHub identity already linked to a different Clerk user fails
closed and needs a deliberate administrative reconciliation.
