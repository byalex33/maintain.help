import { ExternalLink } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GitHubIssue } from "@/generated/prisma/client";
import { HELP_WANTED_LABEL, GOOD_FIRST_ISSUE_LABEL } from "@/lib/github/labels";

const PRIORITY_LABELS = [GOOD_FIRST_ISSUE_LABEL, HELP_WANTED_LABEL, /documentation/i, /testing/i];

function priorityRank(labels: string[]): number {
  for (let i = 0; i < PRIORITY_LABELS.length; i++) {
    if (labels.some((l) => PRIORITY_LABELS[i].test(l))) return i;
  }
  return PRIORITY_LABELS.length;
}

export function OpenOpportunities({ issues }: { issues: GitHubIssue[] }) {
  const relevant = issues
    .filter((i) => i.state === "open" && !i.isPullRequest && priorityRank(i.labels) < PRIORITY_LABELS.length)
    .sort((a, b) => priorityRank(a.labels) - priorityRank(b.labels))
    .slice(0, 12);

  if (relevant.length === 0) return null;

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="border-b bg-neutral-50/70 p-6 dark:bg-neutral-900/50">
        <CardTitle><h2 className="text-xl tracking-tight">Find your next contribution</h2></CardTitle>
        <p className="text-sm text-neutral-500">Open issues looking for a helping hand.</p>
      </CardHeader>
      <CardContent className="px-6 pt-2">
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {relevant.map((issue) => (
            <li key={issue.id} className="flex items-start justify-between gap-3 py-4">
              <div className="min-w-0">
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  <span className="break-words">{issue.title}</span>
                  <ExternalLink className="size-3 shrink-0 text-neutral-400" />
                </a>
                <div className="mt-1 flex flex-wrap gap-1">
                  {issue.labels.slice(0, 4).map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <span className="shrink-0 text-xs text-neutral-400">#{issue.number}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
