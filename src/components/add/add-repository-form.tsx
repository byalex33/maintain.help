"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddRepositoryForm({ repositories, organizations = [], personalLogin, organizationsUnavailable = false }: {
  repositories: { id: number; fullName: string; description: string | null; url: string }[];
  organizations?: string[];
  personalLogin?: string;
  organizationsUnavailable?: boolean;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
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

  async function connectOrganizations() {
    setConnecting(true);
    setError(null);
    try {
      const account = user?.verifiedExternalAccounts.find((account) => account.provider === "github");
      if (!account) throw new Error("GitHub account unavailable");
      const result = await account.reauthorize({ additionalScopes: ["read:org"], redirectUrl: "/add" });
      const url = result.verification?.externalVerificationRedirectURL;
      if (!url) throw new Error("GitHub redirect unavailable");
      window.location.assign(url.href);
    } catch {
      setError("Could not connect your organizations. Please try again.");
      setConnecting(false);
    }
  }

  async function addRepository(repository: typeof repositories[number]) {
    setSelectedId(repository.id);
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/repositories/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repository.url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Something went wrong.");
        return;
      }

      router.push(`/${data.owner}/${data.repo}`);
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={status === "loading"}>
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
      {organizationsUnavailable ? <p role="status" className="text-sm text-neutral-500">We couldn&rsquo;t load your organizations. Connect GitHub organization access, then retry if needed.</p> : null}
      <div className="text-sm text-neutral-500">
        <Button type="button" onClick={connectOrganizations} disabled={!user || connecting} variant="link" className="h-auto p-0">
          {connecting ? "Connecting…" : "Connect organizations"}
        </Button>
        <p className="mt-1">Allow GitHub to share your organization memberships, including private memberships.</p>
      </div>
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
            <Button onClick={() => addRepository(repo)} disabled={status === "loading"} aria-label={`Add ${repo.fullName}`}>
              {status === "loading" && selectedId === repo.id ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
              {status === "loading" && selectedId === repo.id ? "Adding…" : "Add"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
