import Link from "next/link";
import { BadgeCheck, ShieldQuestion } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WANTED_HELP_STATUS_LABEL } from "@/lib/display";
import type { MaintainerRequest, User } from "@/generated/prisma/client";

export function ClaimBanner({
  owner,
  repo,
  activeRequest,
  isSignedIn,
}: {
  owner: string;
  repo: string;
  activeRequest: (MaintainerRequest & { user: User }) | null;
  isSignedIn: boolean;
}) {
  if (activeRequest) {
    return (
      <Card className="rounded-2xl flex flex-col gap-2 border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-400">
          <BadgeCheck className="size-4" />
          Verified by repository maintainer
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {WANTED_HELP_STATUS_LABEL[activeRequest.status]}
          {activeRequest.message ? ` — "${activeRequest.message}"` : ""}
        </p>
        {activeRequest.skillsWanted.length > 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Skills wanted: {activeRequest.skillsWanted.join(", ")}
          </p>
        ) : null}
        <Button asChild size="sm" variant="outline" className="self-start">
          <Link href={`/${owner}/${repo}/claim`}>Update help status</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl flex flex-col items-start gap-2 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldQuestion className="size-4 text-neutral-400" />
        Are you a maintainer of this repository?
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Claim it to set the current help status yourself — verified input always overrides our inference.
      </p>
      <Button asChild size="sm" variant="outline">
        <Link href={isSignedIn ? `/${owner}/${repo}/claim` : `/sign-in?callbackUrl=${encodeURIComponent(`/${owner}/${repo}/claim`)}`}>Claim this repository</Link>
      </Button>
    </Card>
  );
}
