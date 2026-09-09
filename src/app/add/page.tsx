import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AddRepositoryForm } from "@/components/add/add-repository-form";
import { auth, getGitHubAccessToken } from "@/lib/auth";
import { getAddablePublicRepositories, getGitHubOrganizations } from "@/lib/github/ownedRepositories";

export const metadata: Metadata = {
  title: "Add a repository",
  description: "Add a GitHub repository to maintain.help for analysis.",
};

export default async function AddRepositoryPage() {
  const session = await auth();
  if (!session) redirect("/sign-in?callbackUrl=%2Fadd");
  let repositories: Awaited<ReturnType<typeof getAddablePublicRepositories>> = [];
  let error: string | null = null;
  let organizations: string[] = [];
  let organizationsUnavailable = false;
  try {
    const token = await getGitHubAccessToken(session.user.id);
    if (token) {
      const [repos, orgs] = await Promise.allSettled([
        getAddablePublicRepositories(token, session.user.githubId),
        getGitHubOrganizations(token),
      ]);
      if (repos.status === "rejected") throw repos.reason;
      repositories = repos.value;
      if (orgs.status === "fulfilled") organizations = orgs.value;
      else organizationsUnavailable = true;
    }
    else error = "GitHub access is unavailable. Sign out, then sign in with GitHub again to reconnect.";
  } catch {
    error = "We couldn't load your GitHub repositories. Please try again shortly.";
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Add a repository</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Choose a public repository you own or have admin or maintainer access to, including organization repositories. Adding it also verifies you as a maintainer, so there is no separate claim step.
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
        ) : <AddRepositoryForm repositories={repositories} organizations={organizations} personalLogin={session.user.githubLogin} organizationsUnavailable={organizationsUnavailable} />}
      </div>
    </div>
  );
}
