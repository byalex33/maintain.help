export default function Loading() {
  return <div className="onboarding-page mx-auto max-w-2xl px-4 py-20" role="status" aria-label="Loading repository form"><div className="repo-onboarding p-8 motion-safe:animate-pulse"><div className="mb-8 h-3 w-24 bg-neutral-400/30" /><div className="mb-4 h-7 w-3/4 bg-neutral-400/30" /><div className="mb-10 h-4 w-full bg-neutral-400/20" /><div className="mb-8 h-12 bg-neutral-400/20" /><div className="ml-auto h-10 w-28 bg-neutral-400/30" /></div><span className="sr-only">Loading your repositories…</span></div>;
}
