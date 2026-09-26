export default function RepositoryLoading() {
  return <div role="status" aria-label="Loading repository" className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-10">
    <span className="sr-only">Loading repository and activity</span>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-8 w-1/3 bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-40 bg-neutral-200 dark:bg-neutral-800" />
      <div className="max-w-3xl space-y-6 border border-neutral-300 p-5 dark:border-neutral-700">
        <div className="h-5 w-36 bg-neutral-200 dark:bg-neutral-800" />
        {[0, 1, 2, 3].map((row) => <div key={row} className="flex gap-3">
          <div className="size-8 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex-1 space-y-3"><div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800" /><div className="h-3 w-5/6 bg-neutral-200 dark:bg-neutral-800" /></div>
        </div>)}
      </div>
    </div>
  </div>;
}
