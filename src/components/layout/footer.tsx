import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="page-shell grid gap-10 text-sm text-muted-foreground md:grid-cols-[1fr_1fr]">
        <div>
          <p className="eyebrow">Built in the open</p>
          <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground">Good projects deserve<br />a helping hand.</p>
          <a href="https://github.com/byalex33/maintain.help" className="mt-5 inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">We&apos;re also open source <span aria-hidden="true">↗</span></a>
        </div>
        <div>
        <p className="max-w-xl leading-7">
          maintain.help analyses public repository activity to help developers discover open-source projects
          that may benefit from additional contributions. Inferred statuses are not statements from repository
          maintainers.
        </p>
        <nav aria-label="Footer" className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-5 text-foreground">
          <Link href="/explore" className="hover:text-neutral-900 dark:hover:text-neutral-200">
            Explore
          </Link>
          <Link href="/find-a-project" className="hover:text-neutral-900 dark:hover:text-neutral-200">
            Find a project
          </Link>
          <Link href="/add" className="hover:text-neutral-900 dark:hover:text-neutral-200">
            Add a repository
          </Link>
        </nav>
        </div>
      </div>
    </footer>
  );
}
