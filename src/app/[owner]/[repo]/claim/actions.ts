"use server";

import { redirect } from "next/navigation";
import { saveMaintainerRequest } from "@/lib/saveMaintainerRequest";
export type { ClaimFormState } from "@/lib/saveMaintainerRequest";
import type { ClaimFormState } from "@/lib/saveMaintainerRequest";

export async function submitMaintainerRequest(owner: string, repo: string, _prevState: ClaimFormState, formData: FormData): Promise<ClaimFormState> {
  const result = await saveMaintainerRequest(owner, repo, formData);
  if (result.error) return result;
  redirect(`/${owner}/${repo}`);
}
