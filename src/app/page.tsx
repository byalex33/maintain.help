import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HeroActions } from "@/components/home/hero-actions";
import { HeroStars } from "@/components/home/hero-stars";
import { HelpRequests, type HelpRequestRow } from "@/components/home/help-requests";
import { HelpCategory } from "@/generated/prisma/enums";
import { formatStars, HELP_CATEGORY_ICON, HELP_CATEGORY_LABEL, STATUS_LABEL } from "@/lib/display";
import { getHomepageSections, type RepositoryCard } from "@/lib/queries/repositories";

const BLUE = "text-blue-600 dark:text-blue-400";
const GREEN = "text-green-600 dark:text-green-400";
const VIOLET = "text-violet-600 dark:text-violet-400";
const AMBER = "text-amber-600 dark:text-amber-400";

const HELP_TYPES: { category: HelpCategory; description: string; color: string }[] = [
  { category: HelpCategory.CODE, description: "Fix bugs and ship features.", color: BLUE },
  { category: HelpCategory.DOCUMENTATION, description: "Guides, references, examples.", color: BLUE },
  { category: HelpCategory.TESTING, description: "Coverage, fixtures, flaky CI.", color: GREEN },
  { category: HelpCategory.ISSUE_TRIAGE, description: "Reproduce, label, close.", color: GREEN },
  { category: HelpCategory.PR_REVIEW, description: "Review open pull requests.", color: VIOLET },
  { category: HelpCategory.DESIGN, description: "UI, theming, visual assets.", color: VIOLET },
  { category: HelpCategory.TRANSLATION, description: "Add and update locales.", color: BLUE },
  { category: HelpCategory.DEVOPS_CI, description: "Pipelines, releases, infra.", color: GREEN },
  { category: HelpCategory.SECURITY, description: "Audits, patches, disclosures.", color: VIOLET },
  { category: HelpCategory.MAINTAINER, description: "Take a project forward.", color: AMBER },
  { category: HelpCategory.CO_MAINTAINER, description: "Share the load with a maintainer.", color: AMBER },
];

const STEPS = [
  { title: "Add your repository", description: "We read your README, issues and activity to see where help is needed." },
  { title: "Verify on GitHub", description: "Sign in and claim the project with your repository permissions." },
  { title: "Say what you need", description: "Contributors, reviewers, triage, docs — or a new maintainer." },
];

function toRow(repo: RepositoryCard, featured = false): HelpRequestRow {
  return {
    id: repo.id,
    owner: repo.owner,
    name: repo.name,
    description: repo.description,
    status: repo.status,
    statusLabel: STATUS_LABEL[repo.status],
    categories: repo.helpCategories.slice(0, 2).map(({ category }) => HELP_CATEGORY_LABEL[category]).join(" · "),
    language: repo.primaryLanguage,
    stars: formatStars(repo.stars),
    featured,
  };
}

export default async function HomePage() {
  const sections = await getHomepageSections();
  const featuredId = sections.featured?.id;
  const pinFeatured = (rows: HelpRequestRow[]) => [...rows.filter((row) => row.featured), ...rows.filter((row) => !row.featured)];
  const seeking = pinFeatured(sections.seekingMaintainers.map((repo) => toRow(repo, repo.id === featuredId)));
  const asking = pinFeatured(sections.activelyAsking.map((repo) => toRow(repo, repo.id === featuredId)));
  // Pin the admin-featured repository first, then alternate the two statuses.
  const interleaved = Array.from({ length: Math.max(seeking.length, asking.length) }, (_, i) => [seeking[i], asking[i]]).flat();
  const all = [...(sections.featured ? [toRow(sections.featured, true)] : []), ...interleaved]
    .filter((row, index, rows): row is HelpRequestRow => Boolean(row) && rows.findIndex((other) => other?.id === row?.id) === index)
    .slice(0, 6);

  return (
    <div className="pb-16 sm:pb-36">
      <section className="relative isolate overflow-hidden pb-24 sm:pb-[120px]">
        <HeroStars />
        <div className="relative mx-auto max-w-6xl px-4 pt-24 text-center sm:px-8 sm:pt-[140px]">
          <h1 className="mx-auto max-w-[900px] text-[clamp(44px,8vw,104px)] leading-[0.98] font-medium tracking-[-0.055em] text-balance">
            Open source runs on people who show&nbsp;up.
          </h1>
          <p className="mx-auto mt-9 max-w-[520px] text-lg leading-[1.6] font-light text-pretty text-neutral-600 sm:text-xl dark:text-[#8a8a8a]">
            Find a project that&apos;s asking for help, or tell contributors what yours needs.
          </p>
          <HeroActions />
        </div>
      </section>

      <section aria-labelledby="help-types-heading" className="mx-auto max-w-6xl px-4 pt-20 sm:px-8">
        <h2 id="help-types-heading" className="mb-16 text-[clamp(32px,4vw,48px)] leading-[1.05] font-medium tracking-[-0.045em]">Browse by help type</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-12 gap-y-11">
          {HELP_TYPES.map(({ category, description, color }) => {
            const Icon = HELP_CATEGORY_ICON[category];
            return (
              <Link key={category} href={`/explore?category=${category}`} className="flex items-start gap-[18px] transition-opacity hover:opacity-70">
                <Icon aria-hidden="true" className={`mt-[3px] size-5 shrink-0 ${color}`} />
                <span className="flex flex-col gap-1.5">
                  <span className="text-lg font-medium tracking-[-0.02em] text-neutral-950 dark:text-neutral-50">{HELP_CATEGORY_LABEL[category]}</span>
                  <span className="text-[15px] leading-normal font-light text-neutral-600 dark:text-[#8a8a8a]">{description}</span>
                </span>
              </Link>
            );
          })}
        </div>
        <Link href="/find-a-project" className="mt-12 inline-flex items-center gap-2 text-[15px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50">
          Not sure? Get matched by language and experience<ArrowRight aria-hidden="true" className="size-[15px]" />
        </Link>
      </section>

      {all.length ? (
        <HelpRequests all={all} seeking={seeking} asking={asking} />
      ) : (
        <div className="mx-auto max-w-6xl px-4 pt-32 text-neutral-500 sm:px-8 dark:text-neutral-400">
          <p>No repositories indexed yet.</p>
          <p className="mt-1 text-sm">
            <Link href="/add" className="underline underline-offset-4">Add a repository</Link>{" "}
            to get started, or run the fixture seed script in development.
          </p>
        </div>
      )}

      <section id="maintainers" aria-labelledby="maintainers-heading" className="mx-auto max-w-6xl px-4 pt-32 sm:px-8 sm:pt-[200px]">
        <p className="mb-6 text-[15px] text-amber-600 dark:text-amber-400">For maintainers</p>
        <h2 id="maintainers-heading" className="max-w-[760px] text-[clamp(36px,5.4vw,68px)] leading-none font-medium tracking-[-0.05em] text-balance">
          Your project. Your call on what it&nbsp;needs.
        </h2>
        <ol className="mt-20 grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-16 gap-y-12">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <div aria-hidden="true" className="font-mono text-[13px] text-neutral-400 dark:text-[#6b6b6b]">{String(index + 1).padStart(2, "0")}</div>
              <div className="mt-5 text-xl font-medium tracking-[-0.02em]">{step.title}</div>
              <div className="mt-2.5 text-base leading-[1.6] font-light text-neutral-600 dark:text-[#8a8a8a]">{step.description}</div>
            </li>
          ))}
        </ol>
        <Link
          href="/add"
          className="mt-[72px] inline-flex h-[52px] items-center gap-2.5 rounded-full bg-neutral-900 px-7 text-[15px] font-medium text-neutral-50 transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Add your repository<ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </div>
  );
}
