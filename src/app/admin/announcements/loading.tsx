export default function LoadingAnnouncements() {
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-10" role="status" aria-label="Loading announcements">
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse"><div className="h-9 w-64 bg-muted" /><div className="h-5 w-72 max-w-full bg-muted" /><div className="h-12 bg-muted" /><div className="h-32 max-w-2xl bg-muted" /><div className="h-12 max-w-2xl bg-muted" /><div className="h-10 w-48 bg-muted" /></div>
  </div>;
}
