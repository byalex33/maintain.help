"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WANTED_HELP_STATUS_LABEL } from "@/lib/display";
import { WantedHelpStatus } from "@/generated/prisma/enums";
import type { ClaimFormState } from "@/app/[owner]/[repo]/claim/actions";

export function ClaimForm({
  action,
  defaultStatus,
  defaultMessage,
  defaultSkills,
}: {
  action: (state: ClaimFormState, formData: FormData) => Promise<ClaimFormState>;
  defaultStatus?: WantedHelpStatus;
  defaultMessage?: string;
  defaultSkills?: string[];
}) {
  const [state, formAction, pending] = useActionState<ClaimFormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <Label htmlFor="status" className="mb-1.5">
          Current help status
        </Label>
        <Select name="status" defaultValue={defaultStatus ?? WantedHelpStatus.NOT_LOOKING}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(WantedHelpStatus).map((value) => (
              <SelectItem key={value} value={value}>
                {WANTED_HELP_STATUS_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="skills" className="mb-1.5">
          Skills wanted
        </Label>
        <Input id="skills" name="skills" placeholder="TypeScript, documentation, accessibility" defaultValue={defaultSkills?.join(", ")} />
        <p className="mt-1 text-xs text-neutral-500">Comma-separated tags.</p>
      </div>

      <div>
        <Label htmlFor="message" className="mb-1.5">
          Message to potential contributors
        </Label>
        <textarea
          id="message"
          name="message"
          rows={4}
          defaultValue={defaultMessage}
          placeholder="What kind of help would be most useful right now?"
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950 dark:focus-visible:ring-neutral-800"
        />
      </div>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save status"}
      </Button>
    </form>
  );
}
