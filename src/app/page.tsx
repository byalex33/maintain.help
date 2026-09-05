import Link from "next/link";

import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/home/hero-search";
import { FeaturedRepository } from "@/components/home/featured-repository";
import { RepoSection } from "@/components/repo/repo-section";
import { getHomepageSections } from "@/lib/queries/repositories";

export default async function HomePage() {
  const sections = await getHomepageSections();

  const hasAnyData = sections.featured ||
    sections.seekingMaintainers.length +
      sections.activelyAsking.length +
      sections.goodFirstProjects.length +
      sections.needsPrReviewers.length +
      sections.needsDocumentationHelp.length +
      sections.trending.length >
    0;

  return (
    <div>
      <section className="border-b border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Find open source that needs you.
          </h1>
          <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
            Discover projects looking for contributors, reviewers, maintainers, documentation help, and more.
          </p>

          <HeroSearch />

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/explore">Explore projects</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/add">Add your repository</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl divide-y divide-neutral-100 px-4 dark:divide-neutral-900">
        {hasAnyData ? (
          <>
            {sections.featured ? (
              <section aria-labelledby="featured-heading" className="py-8">
                <h2 id="featured-heading" className="mb-4 text-lg font-semibold tracking-tight">Featured</h2>
                <FeaturedRepository repo={sections.featured} />
              </section>
            ) : null}
            <RepoSection
              title="Seeking maintainers"
              description="Projects explicitly looking for maintainers, co-maintainers, or a successor."
              repos={sections.seekingMaintainers}
              exploreHref="/explore?status=SEEKING_MAINTAINERS"
            />
            <RepoSection
              title="Projects asking for help"
              description="Maintainers have explicitly said they want contributor help."
              repos={sections.activelyAsking}
              exploreHref="/explore?status=ACTIVELY_ASKING"
            />
            <RepoSection
              title="Good first projects"
              description="Beginner friendly, based on more than just a label."
              repos={sections.goodFirstProjects}
              exploreHref="/explore?beginnerFriendly=1"
            />
            <RepoSection
              title="Needs PR reviewers"
              repos={sections.needsPrReviewers}
              exploreHref="/explore?category=PR_REVIEW"
            />
            <RepoSection
              title="Documentation help wanted"
              repos={sections.needsDocumentationHelp}
              exploreHref="/explore?category=DOCUMENTATION"
            />
            <RepoSection
              title="Trending projects needing contributors"
              repos={sections.trending}
              exploreHref="/explore?sort=recent"
            />
          </>
        ) : (
          <div className="py-24 text-center text-neutral-500 dark:text-neutral-400">
            <p>No repositories indexed yet.</p>
            <p className="mt-1 text-sm">
              <Link href="/add" className="underline underline-offset-4">
                Add a repository
              </Link>{" "}
              to get started, or run the fixture seed script in development.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
