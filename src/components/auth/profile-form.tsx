"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<{ error?: string; success?: string }, FormData>(updateProfile, {});

  return (
    <form action={action} className="mt-6 border-t pt-6">
      <label htmlFor="display-name" className="text-sm font-medium">Display name</label>
      <p id="name-description" className="mt-1 text-sm text-muted-foreground">How your name appears on maintain.help. Your GitHub profile stays the same.</p>
      <Input id="display-name" name="name" defaultValue={name} autoComplete="name" required maxLength={100} disabled={pending} aria-describedby="name-description name-result" aria-invalid={!!state.error} className="mt-3 max-w-md" />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        <p id="name-result" role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-destructive" : "text-muted-foreground"}`}>{state.error ?? state.success}</p>
      </div>
    </form>
  );
}
