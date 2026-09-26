# Site announcements

Admins can open `/admin/announcements` from either admin section. Access uses the existing `ADMIN_GITHUB_IDS` allowlist and is checked again on every mutation.

The editor publishes one site-wide message, with an optional HTTPS or local link. Publishing replaces the previous message atomically and creates a new revision. Unpublishing retains the saved content. There is no draft or scheduling state. The live preview uses the actual banner and never writes a dismissal cookie.

Visitors can dismiss each published revision for up to one year using a first-party cookie. A new publication appears again. Already-open pages receive the new banner on reload, not through live polling. The bar collapses in document flow, with transitions disabled for reduced motion.

## Deployment

Generate the Prisma client and apply the additive migration before starting the updated application:

```sh
npm run db:generate -- --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
```

The public banner fails open if its query fails, so an unavailable announcement table does not itself break the site. The admin editor requires the migration. No announcement is seeded or published automatically.

The reference for the compact message, inline link and collapsing dismissal is https://lab.xevrion.dev/lab/announcement-banner. The implementation uses React and CSS without an additional animation dependency.
