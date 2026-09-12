import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, isAdminLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin · Users", robots: { index: false, follow: false } };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!isAdminLogin(session?.user.githubLogin)) notFound();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const where: Prisma.UserWhereInput = query ? { OR: [
    { name: { contains: query, mode: "insensitive" } },
    { githubLogin: { contains: query, mode: "insensitive" } },
    { email: { contains: query, mode: "insensitive" } },
  ] } : {};
  const total = await db.user.count({ where });
  const pages = Math.max(1, Math.ceil(total / 50));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(pages, Math.max(1, requestedPage)) : 1;
  const users = await db.user.findMany({
    where,
    select: { id: true, name: true, githubLogin: true, email: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * 50,
    take: 50,
  });
  const pageUrl = (number: number) => `/admin/users?${new URLSearchParams({ q: query, page: String(number) })}`;

  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-10">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
      <p className="mt-2 text-sm text-neutral-500">All maintain.help user accounts, newest first.</p>
    </div>
    <nav aria-label="Admin sections" className="flex gap-2">
      <Button asChild variant="ghost" size="sm"><Link href="/admin">Repositories</Link></Button>
      <Button asChild variant="secondary" size="sm"><Link href="/admin/users" aria-current="page">Users</Link></Button>
    </nav>
    <form action="/admin/users" className="flex gap-2">
      <Input name="q" defaultValue={query} aria-label="Search users" placeholder="Search name, GitHub username, or email…" maxLength={200} />
      <Button type="submit">Search</Button>
    </form>
    <p className="text-sm text-neutral-500">{total} {total === 1 ? "user" : "users"}{query ? " matching your search" : " total"}</p>
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Registered users</caption>
        <thead className="border-b border-neutral-200 dark:border-neutral-800">
          <tr>{["Name", "GitHub", "Email", "Joined"].map((label) => <th key={label} scope="col" className="px-5 py-3 font-semibold">{label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {users.map((user) => <tr key={user.id}>
            <td className="px-5 py-4">{user.name ?? "N/A"}</td>
            <td className="px-5 py-4">{user.githubLogin ? <a href={`https://github.com/${encodeURIComponent(user.githubLogin)}`} className="underline">{user.githubLogin}</a> : "N/A"}</td>
            <td className="px-5 py-4">{user.email ?? "N/A"}</td>
            <td className="whitespace-nowrap px-5 py-4"><time dateTime={user.createdAt.toISOString()}>{user.createdAt.toISOString().slice(0, 10)}</time></td>
          </tr>)}
          {!users.length ? <tr><td colSpan={4} className="p-10 text-center text-neutral-500">{query ? "No users match your search." : "No users yet."}</td></tr> : null}
        </tbody>
      </table>
    </Card>
    <nav aria-label="User list pages" className="flex items-center gap-3">
      {page > 1 ? <Button asChild variant="outline" size="sm"><Link href={pageUrl(page - 1)}>Previous</Link></Button> : null}
      <span className="text-sm text-neutral-500">Page {page} of {pages}</span>
      {page < pages ? <Button asChild variant="outline" size="sm"><Link href={pageUrl(page + 1)}>Next</Link></Button> : null}
    </nav>
  </div>;
}
