import type { Repository, RepositoryStatus } from "@/generated/prisma/client";
import { STATUS_LABEL } from "@/lib/display";

export interface RepositoryActivityEvent {
  id: string;
  kind: "release" | "push" | "status";
  title: string;
  description: string;
  occurredAt: string;
  href?: string;
}

type ActivitySource = Pick<Repository, "owner" | "name" | "pushedAt" | "latestReleaseAt" | "latestReleaseTag"> & {
  statusHistory: Pick<RepositoryStatus, "id" | "status" | "reason" | "createdAt" | "verified">[];
};

// These are stored milestones, not a complete GitHub event stream.
export function getRepositoryActivity(repository: ActivitySource): RepositoryActivityEvent[] {
  const baseUrl = `https://github.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
  const events: RepositoryActivityEvent[] = repository.statusHistory.map((status) => ({
    id: `status-${status.id}`,
    kind: "status",
    title: `Status recorded: ${STATUS_LABEL[status.status]}`,
    description: `${status.verified ? "Verified classification." : "Inferred classification."}${status.reason ? ` ${status.reason}` : ""}`,
    occurredAt: status.createdAt.toISOString(),
  }));

  if (repository.latestReleaseAt) {
    events.push({
      id: "latest-release",
      kind: "release",
      title: repository.latestReleaseTag ? `Released ${repository.latestReleaseTag}` : "Latest release published",
      description: "Latest release recorded from GitHub.",
      occurredAt: repository.latestReleaseAt.toISOString(),
      href: repository.latestReleaseTag ? `${baseUrl}/releases/tag/${encodeURIComponent(repository.latestReleaseTag)}` : `${baseUrl}/releases`,
    });
  }
  if (repository.pushedAt) {
    events.push({
      id: "latest-push",
      kind: "push",
      title: "Repository pushed to GitHub",
      description: "Most recent push recorded from GitHub.",
      occurredAt: repository.pushedAt.toISOString(),
      href: `${baseUrl}/activity`,
    });
  }
  return events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id));
}
