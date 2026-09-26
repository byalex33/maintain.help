import Link from "next/link";

import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/home/hero-search";
import { HeroHeadline } from "@/components/home/hero-headline";
import { HeroStars } from "@/components/home/hero-stars";
import { FeaturedRepository } from "@/components/home/featured-repository";
import { RepoSection } from "@/components/repo/repo-section";
import { getHomepageSections } from "@/lib/queries/repositories";

export default async function HomePage() {
  const sections = await getHomepageSections();

  const hasAnyData = sections.featured ||
    sections.seekingMaintainers.length + sections.activelyAsking.length > 0;

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-950">
        <HeroStars />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
          <HeroHeadline />
          <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
            Good projects need good people. Find your next contribution, meet fellow maintainers, and build open source together.
          </p>

          <HeroSearch />

          <div className="flex w-full flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/explore">Explore projects</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/add">Add your repository</Link>
            </Button>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-none transition-none">
            <a
              href={`https://twitter.com/intent/tweet?${new URLSearchParams({
                text: "I'm building an open-source project and looking for people to build it with.\n\nMy project: [add your project link]\n\nFind your next contribution:",
                url: "https://maintain.help",
              })}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.9-9L.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" />
              </svg>
              Share your project on X
            </a>
          </Button>
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
