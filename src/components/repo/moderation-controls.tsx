"use client";

import { useActionState } from "react";
import { LockKeyhole, Unlock, Trash2, RotateCcw, Sparkles } from "lucide-react";
import { moderateRepository } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ModerationControls({ repository }: { repository: { id: string; fullName: string; isIndexed: boolean; isLocked: boolean; isFeatured: boolean } }) {
  const [state, action, pending] = useActionState(moderateRepository.bind(null, repository.id), { error: null });
  return (
    <form action={action} className="space-y-3">
      {repository.isIndexed ? <>
        <Button name="intent" value={repository.isFeatured ? "unfeature" : "feature"} variant={repository.isFeatured ? "secondary" : "outline"} className="w-full" disabled={pending}>
          <Sparkles aria-hidden="true" />{repository.isFeatured ? "Remove homepage feature" : "Feature on homepage"}
        </Button>
        <p className="text-xs text-neutral-500">{repository.isFeatured ? "This repository is in the homepage spotlight." : "Choose this as the homepage spotlight. It replaces the current featured project."}</p>
        <Button name="intent" value={repository.isLocked ? "unlock" : "lock"} variant="outline" className="w-full" disabled={pending}>
          {repository.isLocked ? <Unlock aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}{repository.isLocked ? "Unlock" : "Lock"}
        </Button>
        <p className="text-xs text-neutral-500">{repository.isLocked ? "Updates and reanalysis are paused. Reports remain open." : "Lock keeps the listing visible and pauses updates and reanalysis."}</p>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400">Delete repository</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-neutral-500">Remove this listing from maintain.help. It can be restored from Admin. The GitHub repository is unaffected.</p>
            <label className="block space-y-2 text-xs font-medium">Type {repository.fullName} to confirm<Input name="confirmation" autoComplete="off" /></label>
            <Button name="intent" value="delete" variant="destructive" className="w-full" disabled={pending}><Trash2 aria-hidden="true" />Delete</Button>
          </div>
        </details>
      </> : <>
        <p className="text-sm text-neutral-500">This listing is deleted and hidden from the public. Imports cannot bring it back.</p>
        <Button name="intent" value="restore" variant="outline" className="w-full" disabled={pending}><RotateCcw aria-hidden="true" />Restore repository</Button>
      </>}
      {state.error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
      {pending ? <p role="status" className="text-xs text-neutral-500">Saving change…</p> : null}
    </form>
  );
}
