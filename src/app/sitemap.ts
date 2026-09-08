import type { MetadataRoute } from "next";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repositories = await db.repository.findMany({
    where: { isIndexed: true, availability: { not: "PRIVATE" } },
    select: { owner: true, name: true, updatedAt: true },
    orderBy: { stars: "desc" },
    take: 5000,
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: "https://maintain.help/", changeFrequency: "daily", priority: 1 },
    { url: "https://maintain.help/explore", changeFrequency: "daily", priority: 0.8 },
    { url: "https://maintain.help/find-a-project", changeFrequency: "weekly", priority: 0.6 },
    { url: "https://maintain.help/add", changeFrequency: "monthly", priority: 0.4 },
  ];

  const repoRoutes: MetadataRoute.Sitemap = repositories.map((repo) => ({
    url: `https://maintain.help/${repo.owner}/${repo.name}`,
    lastModified: repo.updatedAt,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticRoutes, ...repoRoutes];
}
