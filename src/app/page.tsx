import Link from "next/link";

import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/home/hero-search";
import { RepoSection } from "@/components/repo/repo-section";
import { getHomepageSections } from "@/lib/queries/repositories";

export default async function HomePage() {
  const sections = await getHomepageSections();

  const hasAnyData = sections.featured ||
    sections.seekingMaintainers.length + sections.activelyAsking.length > 0;

  return (
    <div>
      {/* OpenSourceUI Dot Grid and Annotated Text adaptations; see THIRD_PARTY_NOTICES.md. */}
      <section className="relative isolate overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(circle,#e8e8e8_1px,transparent_1px)] [background-size:20px_20px] opacity-60 dark:[background-image:radial-gradient(circle,#262626_1px,transparent_1px)]"
        />
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-7 px-5 py-16 md:px-8 md:py-24">
          <p className="eyebrow">A home for your next contribution</p>
          <h1 className="display-title max-w-3xl md:text-7xl">
            Find open source that{" "}
            <span className="relative inline-block whitespace-nowrap">
              needs you.
              <svg
                aria-hidden="true"
                focusable="false"
                className="pointer-events-none absolute -bottom-[0.32em] -left-[1%] h-[0.5em] w-[102%] text-cyan-600 dark:text-cyan-400"
                viewBox="0 0 140 10"
                fill="none"
                preserveAspectRatio="none"
              >
                <path d="M3,6 C40,3 100,3 137,5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
            Discover projects looking for contributors, reviewers, maintainers, documentation help, and more.
          </p>

          <HeroSearch />

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="depth">
              <Link href="/find-a-project">Match my skills</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/add">Add your repository</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl divide-y divide-border px-5 md:px-8">
        {hasAnyData ? (
          <>
            <RepoSection
              title="Seeking maintainers"
              description="Projects explicitly looking for maintainers, co-maintainers, or a successor."
              repos={sections.seekingMaintainers}
              featured={sections.featured}
              exploreHref="/explore?status=SEEKING_MAINTAINERS"
            />
            <RepoSection
              title="Projects asking for help"
              description="Maintainers have explicitly said they want contributor help."
              repos={sections.activelyAsking.filter((repo) => repo.id !== sections.featured?.id)}
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
              to help it find its next contributor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
