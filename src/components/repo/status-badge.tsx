import type { HelpStatus, ConfidenceLevel } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_ICON, STATUS_BADGE_VARIANT, CONFIDENCE_LABEL } from "@/lib/display";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: HelpStatus;
  className?: string;
}) {
  const Icon = STATUS_ICON[status];
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} className={cn("text-[0.8rem]", className)}>
      <Icon className="size-3.5" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function ConfidenceBadge({ confidence, className }: { confidence: ConfidenceLevel; className?: string }) {
  return (
    <Badge variant={confidence === "VERIFIED" ? "success" : "outline"} className={cn("text-[0.75rem]", className)}>
      {CONFIDENCE_LABEL[confidence]}
    </Badge>
  );
}
