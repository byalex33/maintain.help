"use client";

import { useState } from "react";
import { useReverification } from "@clerk/nextjs";
import { deleteAccount } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteAccount() {
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const removeAccount = useReverification(deleteAccount);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await removeAccount(confirmation);
      if (result && "success" in result) {
        // Clear Clerk's client state and the authenticated Next.js router cache.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
        return;
      }
      if (result && "error" in result) setError(result.error);
    } catch {
      setError("Account deletion could not be completed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="delete-account-heading" className="rounded-lg border border-red-200 p-6 dark:border-red-900">
      <h2 id="delete-account-heading" className="text-lg font-semibold">Delete Account</h2>
      <p id="delete-account-description" className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Permanently delete your account, saved repositories, feedback, and maintainer requests. Public repository listings and GitHub data remain. This cannot be undone.
      </p>
      <form onSubmit={submit} className="mt-5 max-w-sm space-y-3">
        <label htmlFor="delete-confirmation" className="block text-sm font-medium">Type DELETE to confirm</label>
        <Input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} required pattern="DELETE" disabled={pending} aria-describedby="delete-account-description" />
        {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <Button type="submit" variant="destructive" disabled={pending || confirmation !== "DELETE"}>
          {pending ? "Deleting account…" : "Delete Account"}
        </Button>
      </form>
    </section>
  );
}
