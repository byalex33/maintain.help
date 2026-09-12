<p align="center">
  <a href="https://maintain.help">
    <img src="docs/banner.svg" alt="maintain.help: Find open source that needs you." width="100%">
  </a>
</p>

<p align="center">
  Find open-source projects looking for contributors, reviewers, and maintainers.<br>
  See what help they need and the evidence behind each recommendation.
</p>

<p align="center">
  <strong><a href="https://maintain.help">Visit maintain.help</a></strong> &nbsp;·&nbsp;
  <a href="https://maintain.help/explore">Explore projects</a> &nbsp;·&nbsp;
  <a href="https://maintain.help/find-a-project">Find your match</a> &nbsp;·&nbsp;
  <a href="https://maintain.help/add">Add your repository</a>
</p>

## Find a place to contribute

A useful contribution can be a bug fix, clearer documentation, an issue review, or helping a project find its next maintainer. **maintain.help** brings those opportunities together so you can find a project that fits your skills and understand where your help could matter.

- **Explore projects** by language, help needed, and maintenance status.
- **Find a match** based on your skills, interests, and experience.
- **See the context** with source links, confidence levels, project activity, and open contribution opportunities.
- **Keep a shortlist** by signing in with GitHub to save projects, and upvote ones you want others to discover.

Browsing is public. Sign in with GitHub to save, upvote, add a repository, or give feedback.

## For maintainers

[Add a public repository](https://maintain.help/add) you own or have admin or maintainer access to, including organization repositories. GitHub permissions are checked before you can manage its listing.

State whether you need contributors, co-maintainers, a successor, reviewers, issue triage, or documentation help. You can also say you are not currently looking for help. Already listed? Claim the repository from its project page to update its help status.

**Verified maintainer updates take precedence over automated classifications.**

## How recommendations work

maintain.help analyzes public GitHub information, including READMEs, contribution guides, issue labels, pull requests, and contributor activity. Rule-based analysis turns those signals into help categories and a status, with supporting evidence you can inspect.

| Status | Meaning |
| :--- | :--- |
| **Seeking maintainers** | An explicit request for maintainers, co-maintainers, or a successor. |
| **Actively asking for help** | A direct request for contributors or open issues with contribution labels. |
| **Likely needs help** | Activity suggests pressure on maintainer capacity. This is an inference. |
| **Maintenance mode** | The project declares limited maintenance or is archived on GitHub. |
| **Healthy** | No significant capacity-pressure signals were detected, or the maintainer says they are not looking for help. |

An inferred status is not a statement from the maintainers. Read the linked evidence and the project's contribution guidance before getting involved. If something looks wrong, use the feedback or report controls on the project page.

## Run locally

You need Node.js 22.12+ in the 22.x line or Node.js 24+, npm, PostgreSQL, and a Clerk application with GitHub sign-in enabled.

### 1. Clone and install

```bash
git clone https://github.com/byalex33/maintain.help.git
cd maintain.help
npm ci
```

### 2. Configure the environment

Copy [`.env.example`](.env.example) to `.env` and fill in the values below. In Clerk, enable GitHub as the sign-in provider and disable other sign-in methods.

| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk's publishable key. |
| `CLERK_SECRET_KEY` | Clerk's server-side secret key. |
| `GITHUB_ANALYSIS_TOKEN` | Server-side GitHub token for analyzing public repositories. |
| `ADMIN_GITHUB_LOGINS` | Comma-separated GitHub logins allowed to use admin tools. |
| `CRON_SECRET` | Bearer secret for scheduled analysis requests. |
| `PRISMA_DEV_DATABASE` | Leave `false` unless using the embedded Prisma development database. |

Local `.env` files are ignored by Git. Repository claims use the signed-in user's GitHub OAuth token, separately from `GITHUB_ANALYSIS_TOKEN`.

### 3. Prepare the database and start

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
npm run dev
```

Open [localhost:3000](http://localhost:3000). The seed adds fictional repositories for local exploration. You can then add an eligible public GitHub repository to try live analysis.

<details>
<summary>Use the embedded Prisma development database</summary>

Run `npm run db:dev` in a separate terminal. Copy its TCP database URL into `DATABASE_URL`, set `PRISMA_DEV_DATABASE="true"`, then run the preparation commands above.

If the embedded database reports `Connection terminated unexpectedly`, stop it with `npx prisma dev stop default` and restart it with `npm run db:dev`. Restarting preserves data; do not reset or remove the database.

</details>

## Contribute

Found a bug or have an idea? [Open an issue](https://github.com/byalex33/maintain.help/issues). Include reproduction steps for bugs and explain the problem a proposed feature would solve. Check existing issues first; discuss substantial changes before starting a pull request.

For code changes, keep the scope focused, add regression coverage when behavior changes, and run the relevant checks:

```bash
npm run lint
npm test
npm run build
npm run typecheck
```

For database integration checks, set `TEST_DATABASE_URL` to a migrated test PostgreSQL database. The build generates Prisma Client and Next.js route types before type checking.

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start the development server. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run analyze:repo -- owner/repo` | Analyze one repository. |
| `npm run calibrate:ingest` | Analyze the controlled calibration set. |

Built with **Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma, Clerk, and Octokit**. Pages and actions live in [`src/app`](src/app), shared UI in [`src/components`](src/components), and analysis rules in [`src/lib/detection`](src/lib/detection).

## Deployment

Use a production PostgreSQL database and a Clerk production instance configured for your domain and GitHub sign-in. Set the environment variables above and leave `PRISMA_DEV_DATABASE` set to `false`.

```bash
npx prisma migrate deploy
npm run build
npm start
```

Do not seed development fixtures in production. Only the Clerk publishable key belongs in browser code; keep server credentials private.

[`vercel.json`](vercel.json) schedules analysis every six hours. Scheduled requests to `/api/cron/analyze-repositories` require `Authorization: Bearer $CRON_SECRET`. Configure an equivalent scheduler when hosting elsewhere.

Administrators listed in `ADMIN_GITHUB_LOGINS` can moderate listings and reports at `/admin`. The `/api/admin/ingest` endpoint supports admin-only batch ingestion. Successful analyses are reused for one hour; failed analyses retry with backoff.

---

<p align="center">
  <strong>Find a project. Lend a hand.</strong><br>
  <a href="https://maintain.help">maintain.help</a>
</p>
