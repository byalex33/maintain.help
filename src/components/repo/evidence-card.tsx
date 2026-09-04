import { ExternalLink } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/repo/status-badge";
import type { RepositoryEvidence } from "@/generated/prisma/client";

const SOURCE_LABEL: Record<string, string> = {
  README: "README",
  CONTRIBUTING: "CONTRIBUTING",
  GITHUB_ISSUE: "GitHub issue",
  GITHUB_DISCUSSION: "GitHub discussion",
  REPOSITORY_METADATA: "Repository metadata",
  COMMIT_ACTIVITY: "Commit activity",
  PULL_REQUESTS: "Pull requests",
  RELEASES: "Releases",
  CALCULATED_METRIC: "Calculated metric",
};

export function EvidenceCard({ evidence }: { evidence: RepositoryEvidence }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{evidence.title}</p>
        <ConfidenceBadge confidence={evidence.confidence} className="shrink-0" />
      </div>
      <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{evidence.description}</p>
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-neutral-400">
        <span className={evidence.type === "INFERENCE" ? "text-amber-600" : "text-emerald-600"}>
          {evidence.type === "INFERENCE" ? "Inferred" : "Explicit / observed"}
        </span>
        <span>·</span>
        <span>{SOURCE_LABEL[evidence.sourceType] ?? evidence.sourceType}</span>
        {evidence.sourceUrl ? (
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-0.5 text-neutral-500 hover:text-neutral-900 hover:underline dark:hover:text-neutral-200"
          >
            View source
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </Card>
  );
}
