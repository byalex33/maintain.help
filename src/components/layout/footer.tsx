import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-neutral-500 dark:text-neutral-400">
        <p className="max-w-3xl leading-relaxed">
          maintain.help analyses public repository activity to help developers discover open-source projects
          that may benefit from additional contributions. Inferred statuses are not statements from repository
          maintainers.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/explore" className="hover:text-neutral-900 dark:hover:text-neutral-200">
            Explore
          </Link>
          <Link href="/find-a-project" className="hover:text-neutral-900 dark:hover:text-neutral-200">
            Find a project
          </Link>
          <Link href="/add" className="hover:text-neutral-900 dark:hover:text-neutral-200">
            Add a repository
          </Link>
          <a
            href="https://github.com/byalex33/maintain.help"
            className="ml-auto hover:text-neutral-900 dark:hover:text-neutral-200"
          >
            We&apos;re also open source
          </a>
        </div>
      </div>
    </footer>
  );
}
