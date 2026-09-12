"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { RepositoryMetricSnapshot } from "@/generated/prisma/client";

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Chart({
  data,
  dataKey,
  color,
}: {
  data: { date: string; value: number }[];
  dataKey: string;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-neutral-400" />
        <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-neutral-400" allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 12, backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
          labelClassName="text-foreground"
        />
        <Line type="monotone" dataKey="value" name={dataKey} stroke={color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ActivityCharts({ snapshots }: { snapshots: RepositoryMetricSnapshot[] }) {
  if (snapshots.length === 0) return null;
  const ordered = [...snapshots].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

  const commits = ordered.map((s) => ({ date: formatDate(s.capturedAt), value: s.commitsLast30d }));
  const issues = ordered.map((s) => ({ date: formatDate(s.capturedAt), value: s.openIssues }));
  const prs = ordered.map((s) => ({ date: formatDate(s.capturedAt), value: s.openPullRequests }));

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <Card className="min-w-0 rounded-xl">
        <CardHeader>
          <CardTitle>Commits (last 30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart data={commits} dataKey="Commits" color="#2563eb" />
        </CardContent>
      </Card>
      <Card className="min-w-0 rounded-xl">
        <CardHeader>
          <CardTitle>Open issues</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart data={issues} dataKey="Open issues" color="#059669" />
        </CardContent>
      </Card>
      <Card className="min-w-0 rounded-xl">
        <CardHeader>
          <CardTitle>Open pull requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart data={prs} dataKey="Open PRs" color="#d97706" />
        </CardContent>
      </Card>
    </div>
  );
}
