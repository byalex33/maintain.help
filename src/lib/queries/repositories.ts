import "server-only";
import { db } from "@/lib/db";
import { HelpStatus, HelpCategory } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { repositoryNameFilter } from "@/lib/repositoryIdentity";

export const PUBLIC_REPOSITORY = { isIndexed: true, availability: "AVAILABLE" as const };
const ACCEPTING_HELP = { isArchived: false, maintainerRequests: { none: { isActive: true, status: "NOT_LOOKING" as const } } };

const CONFIDENCE_ORDER: Record<string, number> = { VERIFIED: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export const repositoryCardSelect = {
  _count: { select: { upvotes: true } },
  id: true,
  owner: true,
  name: true,
  fullName: true,
  description: true,
  url: true,
  primaryLanguage: true,
  stars: true,
  forks: true,
  openIssueCount: true,
  status: true,
  statusConfidence: true,
  statusVerified: true,
  isBeginnerFriendly: true,
  isArchived: true,
  pushedAt: true,
  helpCategories: { select: { category: true, verified: true } },
  evidence: {
    select: { title: true, confidence: true, type: true },
    orderBy: [{ confidence: "asc" as const }, { discoveredAt: "desc" as const }, { id: "asc" as const }],
    take: 6,
  },
} satisfies Prisma.RepositorySelect;

export type RepositoryCard = Prisma.RepositoryGetPayload<{ select: typeof repositoryCardSelect }>;

export function topSignals(evidence: { title: string; confidence: string }[], count = 3): string[] {
  return [...evidence]
    .sort((a, b) => (CONFIDENCE_ORDER[a.confidence] ?? 9) - (CONFIDENCE_ORDER[b.confidence] ?? 9))
    .slice(0, count)
    .map((e) => e.title);
}

async function findRepos(where: Prisma.RepositoryWhereInput, take: number) {
  return db.repository.findMany({
    where: { ...PUBLIC_REPOSITORY, ...ACCEPTING_HELP, ...where },
    select: repositoryCardSelect,
    orderBy: [{ stars: "desc" }],
    take,
  });
}

export interface HomepageSections {
  featured: RepositoryCard | null;
  seekingMaintainers: RepositoryCard[];
  activelyAsking: RepositoryCard[];
}

export async function getHomepageSections(): Promise<HomepageSections> {
  const [
    featured,
    seekingMaintainers,
    activelyAsking,
  ] = await Promise.all([
    db.repository.findFirst({ where: { ...PUBLIC_REPOSITORY, ...ACCEPTING_HELP, isFeatured: true }, select: repositoryCardSelect }),
    findRepos({ status: HelpStatus.SEEKING_MAINTAINERS }, 6),
    findRepos({ status: HelpStatus.ACTIVELY_ASKING }, 6),
  ]);

  return { featured, seekingMaintainers, activelyAsking };
}

export interface ExploreFilters {
  language?: string;
  helpCategory?: HelpCategory;
  status?: HelpStatus;
  minStars?: number;
  beginnerFriendly?: boolean;
  seekingMaintainers?: boolean;
  activelyAsking?: boolean;
  query?: string;
}

export type ExploreSort = "upvotes" | "recommended" | "stars" | "recent" | "most-help-needed" | "newest";

export interface ExploreParams {
  filters: ExploreFilters;
  sort: ExploreSort;
  page: number;
  pageSize?: number;
}

function buildExploreWhere(filters: ExploreFilters): Prisma.RepositoryWhereInput {
  const where: Prisma.RepositoryWhereInput = { ...PUBLIC_REPOSITORY };
  if (filters.helpCategory || filters.beginnerFriendly || filters.seekingMaintainers || filters.activelyAsking) Object.assign(where, ACCEPTING_HELP);
  if (filters.language) where.primaryLanguage = { equals: filters.language, mode: "insensitive" };
  const statuses = [...new Set([
    ...(filters.status ? [filters.status] : []),
    ...(filters.seekingMaintainers ? [HelpStatus.SEEKING_MAINTAINERS] : []),
    ...(filters.activelyAsking ? [HelpStatus.ACTIVELY_ASKING] : []),
  ])];
  if (statuses.length) where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  if (filters.minStars) where.stars = { gte: filters.minStars };
  if (filters.beginnerFriendly) where.isBeginnerFriendly = true;
  if (filters.helpCategory) where.helpCategories = { some: { category: filters.helpCategory } };
  if (filters.query) {
    const q = filters.query;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { owner: { contains: q, mode: "insensitive" } },
      { fullName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { primaryLanguage: { contains: q, mode: "insensitive" } },
      { topics: { has: q.toLowerCase() } },
    ];
  }
  return where;
}

function sortToOrderBy(sort: ExploreSort): Prisma.RepositoryOrderByWithRelationInput[] {
  switch (sort) {
    case "upvotes":
      return [{ upvotes: { _count: "desc" } }, { stars: "desc" }, { id: "asc" }];
    case "stars":
      return [{ stars: "desc" }];
    case "recent":
      return [{ pushedAt: "desc" }];
    case "most-help-needed":
      return [{ capacityPressureScore: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "recommended":
    default:
      return [{ statusConfidence: "asc" }, { stars: "desc" }];
  }
}

export async function exploreRepositories({ filters, sort, page, pageSize = 24 }: ExploreParams) {
  const where = buildExploreWhere(filters);
  const orderBy = sortToOrderBy(sort);
  const total = await db.repository.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  page = Math.min(Math.max(1, page), totalPages);

  const [items, languages] = await Promise.all([
    db.repository.findMany({
      where,
      select: repositoryCardSelect,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.repository.findMany({
      where: { ...PUBLIC_REPOSITORY, primaryLanguage: { not: null } },
      select: { primaryLanguage: true },
      distinct: ["primaryLanguage"],
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    availableLanguages: languages.map((l) => l.primaryLanguage).filter((l): l is string => Boolean(l)).sort(),
  };
}

export async function getRepositoryDetail(owner: string, repo: string, includeRemoved = false) {
  return db.repository.findFirst({
    where: { ...repositoryNameFilter(owner, repo), ...(includeRemoved ? {} : PUBLIC_REPOSITORY) },
    include: {
      _count: { select: { upvotes: true } },
      helpCategories: true,
      evidence: { orderBy: [{ confidence: "asc" }, { discoveredAt: "desc" }] },
      maintainers: { orderBy: { commitsLast365d: "desc" }, take: 10 },
      maintainerRequests: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1, include: { user: true } },
      metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 24 },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 20 },
      issues: {
        where: { state: "open" },
        orderBy: { updatedAtGithub: "desc" },
        take: 200,
      },
      submittedBy: { select: { name: true, githubLogin: true } },
    },
  });
}

export type Experience = "beginner" | "intermediate" | "advanced";

export interface DeveloperMatchParams {
  languages: string[];
  helpCategories: HelpCategory[];
  experience: Experience | null;
}

export async function matchProjectsForDeveloper({ languages, helpCategories, experience }: DeveloperMatchParams) {
  const where: Prisma.RepositoryWhereInput = { ...PUBLIC_REPOSITORY, ...ACCEPTING_HELP };
  if (languages.length > 0) where.primaryLanguage = { in: languages, mode: "insensitive" };
  if (helpCategories.length > 0) where.helpCategories = { some: { category: { in: helpCategories } } };
  if (experience === "beginner") where.isBeginnerFriendly = true;
  if (experience === "advanced") {
    where.status = { in: [HelpStatus.SEEKING_MAINTAINERS, HelpStatus.LIKELY_NEEDS_HELP] };
  }

  return db.repository.findMany({
    where,
    select: repositoryCardSelect,
    orderBy: [{ statusConfidence: "asc" }, { stars: "desc" }],
    take: 30,
  });
}

export async function repositoryExists(owner: string, repo: string): Promise<boolean> {
  const found = await db.repository.findFirst({
    where: repositoryNameFilter(owner, repo),
    select: { id: true },
  });
  return Boolean(found);
}
