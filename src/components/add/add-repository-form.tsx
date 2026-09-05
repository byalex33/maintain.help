"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddRepositoryForm({ repositories }: {
  repositories: { id: number; fullName: string; description: string | null; url: string }[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const matches = repositories.filter((repo) => repo.fullName.toLowerCase().includes(search.trim().toLowerCase()));

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
      setError("Network error — please try again.");
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
      {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {repositories.length === 0 ? <p className="text-sm text-neutral-500">You don&rsquo;t have any public repositories yet.</p> : null}
      {repositories.length > 0 && matches.length === 0 ? (
        <p className="text-sm text-neutral-500">No repositories match your search.</p>
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
