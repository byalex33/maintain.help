import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
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
    <div className="page-shell">
      <PageIntro eyebrow="For maintainers" title="Let the right people find you." description="Add a public repository you own or maintain. We’ll look at its activity and help contributors find a way in." />
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_260px]"><div className="form-panel min-w-0">
        {error ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Link href="/sign-in?callbackUrl=%2Fadd" className="text-sm underline">Sign in with GitHub</Link>
            <form action="/add" method="get">
              <Button type="submit" variant="link" className="h-auto p-0">Try again</Button>
            </form>
          </div>
        ) : <AddRepositoryForm repositories={repositories} organizations={organizations} personalLogin={session.user.githubLogin} organizationsUnavailable={organizationsUnavailable} />}
      </div><aside className="space-y-6 text-sm leading-7 text-muted-foreground"><p className="eyebrow">How it works</p><div><p className="font-medium text-foreground">01 / Choose your repository</p><p>Use your personal projects or an organization where you have maintainer access.</p></div><div><p className="font-medium text-foreground">02 / We gather the evidence</p><p>Public activity, contribution guides, and requests for help shape your listing.</p></div><div><p className="font-medium text-foreground">03 / Make it yours</p><p>Verify your access and tell contributors what kind of help you need.</p></div></aside></div>
    </div>
  );
}
