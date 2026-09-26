"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { isGitHubProvider } from "@/lib/github/provider";
import { connectGitHubOrganizationsAutomatically } from "@/lib/github/organizationAccess";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddRepositoryForm({ repositories, organizations = [], personalLogin, organizationsUnavailable = false, needsOrganizationAccess = false, onSelect }: {
  onSelect?: (url: string) => void;
  repositories: { id: number; fullName: string; description: string | null; url: string }[];
  organizations?: string[];
  personalLogin?: string;
  organizationsUnavailable?: boolean;
  needsOrganizationAccess?: boolean;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const owners = [...new Set([
    ...(personalLogin ? [personalLogin] : []), ...organizations,
    ...repositories.map((repo) => repo.fullName.split("/")[0]),
  ])].sort((a, b) => a.localeCompare(b));
  const matches = repositories.filter((repo) =>
    (!owner || repo.fullName.split("/")[0] === owner) &&
    repo.fullName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const connectOrganizations = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const account = user?.verifiedExternalAccounts.find((account) => isGitHubProvider(account.provider));
      if (!account) throw new Error("GitHub account unavailable");
      const result = await account.reauthorize({ additionalScopes: ["read:org"], redirectUrl: "/add" });
      const url = result.verification?.externalVerificationRedirectURL;
      if (!url) throw new Error("GitHub redirect unavailable");
      window.location.assign(url.href);
    } catch {
      setError("Could not connect your organizations. Please try again.");
      setConnecting(false);
    }
  }, [user]);

  useEffect(() => {
    const account = user?.verifiedExternalAccounts.find((account) => isGitHubProvider(account.provider));
    if (!needsOrganizationAccess || !account) return;
    // Accessing sessionStorage itself can throw when browser storage is disabled.
    try {
      void connectGitHubOrganizationsAutomatically(account.id, window.sessionStorage, connectOrganizations);
    } catch {
      // Keep the manual connection button available.
    }
  }, [needsOrganizationAccess, user, connectOrganizations]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Find a repository…"
        aria-label="Find one of your repositories"
        className="h-11"
      />
      <div role="group" aria-label="Filter by account or organization" className="flex flex-wrap gap-2">
        {["", ...owners].map((account) => (
          <Button key={account} type="button" size="sm" variant={owner === account ? "secondary" : "outline"}
            aria-pressed={owner === account} onClick={() => setOwner(account)}>
            {account || "All accounts"}
          </Button>
        ))}
      </div>
      {needsOrganizationAccess ? (
        <div className="text-sm text-neutral-500">
          <p role="status">Approve GitHub organization access once to load your memberships automatically. Your organization may also require an admin to approve this connection.</p>
          <Button type="button" onClick={connectOrganizations} disabled={!user || connecting} variant="link" className="mt-1 h-auto p-0">
            {connecting ? "Connecting…" : "Connect organizations"}
          </Button>
        </div>
      ) : organizationsUnavailable ? (
        <div className="text-sm text-neutral-500">
          <p role="status">GitHub organizations are unavailable right now. Try again shortly. If this continues, check your GitHub connection and organization access.</p>
          <Button type="button" onClick={() => router.refresh()} variant="link" className="mt-1 h-auto p-0">Retry organizations</Button>
          <Button type="button" onClick={connectOrganizations} disabled={!user || connecting} variant="link" className="ml-3 h-auto p-0">
            {connecting ? "Connecting…" : "Reconnect GitHub"}
          </Button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {repositories.length === 0 && !owner ? <p className="text-sm text-neutral-500">No public repositories with owner, admin, or maintainer access were found.</p> : null}
      {(repositories.length > 0 || owner) && matches.length === 0 ? (
        <p className="text-sm text-neutral-500">{owner && !search.trim() ? `No eligible public repositories are available in ${owner}. You need admin or maintainer access, and the organization must allow this GitHub connection.` : `No repositories match your search${owner ? ` in ${owner}` : ""}.`}</p>
      ) : null}
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {matches.map((repo) => (
          <li key={repo.id} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium">{repo.fullName}</p>
              {repo.description ? <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{repo.description}</p> : null}
            </div>
            <Button type="button" onClick={() => onSelect?.(repo.url)} aria-label={`Choose ${repo.fullName}`}>Choose</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
