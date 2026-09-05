import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AddRepositoryForm } from "@/components/add/add-repository-form";
import { auth, getGitHubAccessToken } from "@/lib/auth";
import { getOwnPublicRepositories } from "@/lib/github/ownedRepositories";

export const metadata: Metadata = {
  title: "Add a repository",
  description: "Add a GitHub repository to maintain.help for analysis.",
};

export default async function AddRepositoryPage() {
  const session = await auth();
  if (!session) redirect("/sign-in?callbackUrl=%2Fadd");
  let repositories: Awaited<ReturnType<typeof getOwnPublicRepositories>> = [];
  let error: string | null = null;
  try {
    const token = await getGitHubAccessToken(session.user.id);
    if (token) repositories = await getOwnPublicRepositories(token, session.user.githubId);
    else error = "GitHub access is unavailable. Sign out, then sign in with GitHub again to reconnect.";
  } catch {
    error = "We couldn't load your GitHub repositories. Please try again shortly.";
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Add a repository</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Choose one of your public GitHub repositories to add to maintain.help.
      </p>
      <div className="mt-6">
        {error ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Link href="/sign-in?callbackUrl=%2Fadd" className="text-sm underline">Sign in with GitHub</Link>
            <form action="/add" method="get">
              <button type="submit" className="text-sm underline">Try again</button>
            </form>
          </div>
        ) : <AddRepositoryForm repositories={repositories} />}
      </div>
    </div>
  );
}
