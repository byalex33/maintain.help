import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, isAdminLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConfidenceLevel, HelpStatus, type Prisma } from "@/generated/prisma/client";
import { STATUS_LABEL } from "@/lib/display";
import { submitClassificationReview } from "./actions";

type Params = Record<string, string | string[] | undefined>;
const value = (params: Params, key: string) => typeof params[key] === "string" ? params[key] : "";

export default async function CalibrationPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await auth();
  if (!isAdminLogin(session?.user.githubLogin)) notFound();
  const params = await searchParams;
  const status = value(params, "status");
  const confidence = value(params, "confidence");
  const explicit = value(params, "explicit");
  const archived = value(params, "archived");
  const minScore = Number(value(params, "minScore"));
  const maxScore = Number(value(params, "maxScore"));
  const minStars = Number(value(params, "minStars"));
  const maxStars = Number(value(params, "maxStars"));
  const where: Prisma.RepositoryWhereInput = {
    isIndexed: true,
    isFixture: false,
    ...(Object.values(HelpStatus).includes(status as HelpStatus) ? { status: status as HelpStatus } : {}),
    ...(Object.values(ConfidenceLevel).includes(confidence as ConfidenceLevel) ? { statusConfidence: confidence as ConfidenceLevel } : {}),
    ...(explicit ? { statusVerified: explicit === "true" } : {}),
    ...(archived ? { isArchived: archived === "true" } : {}),
    ...(value(params, "language") ? { primaryLanguage: { equals: value(params, "language"), mode: "insensitive" } } : {}),
    ...(minScore || maxScore ? { capacityPressureScore: { ...(minScore ? { gte: minScore } : {}), ...(maxScore ? { lte: maxScore } : {}) } } : {}),
    ...(minStars || maxStars ? { stars: { ...(minStars ? { gte: minStars } : {}), ...(maxStars ? { lte: maxStars } : {}) } } : {}),
  };
  const repositories = await db.repository.findMany({
    where,
    include: {
      helpCategories: true,
      metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
      _count: { select: { evidence: true } },
      classificationReviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ capacityPressureScore: "desc" }, { stars: "desc" }],
    take: 100,
  });

  return <main className="mx-auto max-w-[1500px] px-4 py-8">
    <h1 className="text-2xl font-semibold">Classification calibration</h1>
    <p className="mt-1 text-sm text-neutral-500">Real repositories only. Reviews are tuning data and do not override status.</p>
    <form className="mt-5 grid gap-2 rounded-lg border p-3 sm:grid-cols-4 lg:grid-cols-10">
      <select name="status" defaultValue={status} className="rounded border bg-transparent p-2 text-sm"><option value="">All statuses</option>{Object.values(HelpStatus).map((item) => <option key={item} value={item}>{STATUS_LABEL[item]}</option>)}</select>
      <select name="confidence" defaultValue={confidence} className="rounded border bg-transparent p-2 text-sm"><option value="">All confidence</option>{Object.values(ConfidenceLevel).map((item) => <option key={item}>{item}</option>)}</select>
      <select name="explicit" defaultValue={explicit} className="rounded border bg-transparent p-2 text-sm"><option value="">Explicit + inferred</option><option value="true">Explicit</option><option value="false">Inferred</option></select>
      <select name="archived" defaultValue={archived} className="rounded border bg-transparent p-2 text-sm"><option value="">Archived + live</option><option value="false">Live</option><option value="true">Archived</option></select>
      <input name="language" defaultValue={value(params, "language")} placeholder="Language" className="rounded border bg-transparent p-2 text-sm" />
      <input name="minScore" defaultValue={value(params, "minScore")} type="number" min="0" max="100" placeholder="Min score" className="rounded border bg-transparent p-2 text-sm" />
      <input name="maxScore" defaultValue={value(params, "maxScore")} type="number" min="0" max="100" placeholder="Max score" className="rounded border bg-transparent p-2 text-sm" />
      <input name="minStars" defaultValue={value(params, "minStars")} type="number" min="0" placeholder="Min stars" className="rounded border bg-transparent p-2 text-sm" />
      <input name="maxStars" defaultValue={value(params, "maxStars")} type="number" min="0" placeholder="Max stars" className="rounded border bg-transparent p-2 text-sm" />
      <button className="rounded bg-neutral-900 px-3 py-2 text-sm text-white">Filter</button>
    </form>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-xs"><thead><tr className="border-b">{["Repository","Status","Score","Categories","Maintainers","Issues","PRs / median age","Commits 90d","Release age","Evidence","Review"].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead>
      <tbody>{repositories.map((repository) => { const metric = repository.metricSnapshots[0]; const review = repository.classificationReviews[0]; return <tr key={repository.id} className="border-b align-top">
        <td className="p-2"><Link className="font-medium hover:underline" href={`/${repository.owner}/${repository.name}`}>{repository.fullName}</Link><div>{repository.primaryLanguage ?? "—"} · {repository.stars.toLocaleString()}★{repository.isArchived ? " · archived" : ""}</div></td>
        <td className="p-2">{STATUS_LABEL[repository.status]}<div>{repository.statusVerified ? "explicit" : "inferred"} · {repository.statusConfidence}</div></td>
        <td className="p-2">{repository.capacityPressureScore ?? "—"}<div>beginner {repository.beginnerFriendlyScore ?? "—"}</div></td>
        <td className="p-2">{repository.helpCategories.map((category) => category.category.replaceAll("_", " ")).join(", ") || "—"}</td>
        <td className="p-2">{metric?.activeMaintainersLast365d ?? "—"}</td><td className="p-2">{metric?.openIssues ?? "—"}</td><td className="p-2">{metric?.openPullRequests ?? "—"} / {metric?.medianOpenPrAgeDays === null || !metric ? "—" : `${Math.round(metric.medianOpenPrAgeDays)}d`}</td><td className="p-2">{metric ? `${metric.commitsLast90d} / ${metric.commitsLast365d}` : "—"}</td><td className="p-2">{metric?.daysSinceLastRelease ?? "—"}</td><td className="p-2">{repository._count.evidence}</td>
        <td className="p-2"><form action={submitClassificationReview.bind(null, repository.id)} className="flex min-w-64 flex-col gap-1"><select name="verdict" defaultValue={review?.verdict ?? "NEEDS_REVIEW"} className="rounded border bg-transparent p-1"><option value="CORRECT">Correct</option><option value="FALSE_POSITIVE">False positive</option><option value="FALSE_NEGATIVE">False negative</option><option value="NEEDS_REVIEW">Needs review</option></select><select name="expectedStatus" defaultValue={review?.expectedStatus ?? ""} className="rounded border bg-transparent p-1"><option value="">Expected status (optional)</option>{Object.values(HelpStatus).map((item) => <option key={item} value={item}>{STATUS_LABEL[item]}</option>)}</select><input name="notes" placeholder="Notes" className="rounded border bg-transparent p-1"/><button className="rounded border p-1">Save review</button></form></td>
      </tr>; })}</tbody></table></div>
  </main>;
}
