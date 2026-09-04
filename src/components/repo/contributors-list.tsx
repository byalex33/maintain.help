import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RepositoryMaintainer } from "@/generated/prisma/client";

export function ContributorsList({ maintainers }: { maintainers: RepositoryMaintainer[] }) {
  if (maintainers.length === 0) return null;

  const totalCommits = maintainers.reduce((sum, m) => sum + m.commitsLast365d, 0);
  const top = maintainers[0];
  const topShare = totalCommits > 0 ? Math.round((top.commitsLast365d / totalCommits) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contributors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalCommits > 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {top.githubLogin} accounts for approximately {topShare}% of commits in the last 12 months among tracked
            contributors.
          </p>
        ) : null}
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {maintainers.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <a
                href={`https://github.com/${m.githubLogin}`}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium hover:underline"
              >
                {m.githubLogin}
              </a>
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                <span>{m.commitsLast365d} commits / 12mo</span>
                {!m.isActive ? <Badge variant="outline">Inactive</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
