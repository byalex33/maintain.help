import { HelpStatus, ConfidenceLevel, HelpCategory, WantedHelpStatus } from "@/generated/prisma/enums";
import {
  HandHelping,
  UserSearch,
  TrendingDown,
  Wrench,
  CircleCheck,
  Code,
  BookOpen,
  FlaskConical,
  ListChecks,
  GitPullRequest,
  Palette,
  Languages,
  Cog,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export const STATUS_LABEL: Record<HelpStatus, string> = {
  ACTIVELY_ASKING: "Actively asking for help",
  SEEKING_MAINTAINERS: "Seeking maintainers",
  LIKELY_NEEDS_HELP: "Likely needs help",
  MAINTENANCE_MODE: "Maintenance mode",
  HEALTHY: "Healthy",
};

export const STATUS_DESCRIPTION: Record<HelpStatus, string> = {
  ACTIVELY_ASKING: "The maintainers have explicitly said they want contributor help.",
  SEEKING_MAINTAINERS: "The maintainers have explicitly said they're looking for maintainers or a successor.",
  LIKELY_NEEDS_HELP: "maintain.help detected signs of maintainer capacity pressure. This is an inference, not a statement from the maintainers.",
  MAINTENANCE_MODE: "The maintainers have said this project is only receiving limited or critical-fix-only maintenance.",
  HEALTHY: "No significant signals of maintainer capacity problems were detected.",
};

export const STATUS_ICON: Record<HelpStatus, LucideIcon> = {
  ACTIVELY_ASKING: HandHelping,
  SEEKING_MAINTAINERS: UserSearch,
  LIKELY_NEEDS_HELP: TrendingDown,
  MAINTENANCE_MODE: Wrench,
  HEALTHY: CircleCheck,
};

export const STATUS_BADGE_VARIANT: Record<HelpStatus, "info" | "warning" | "danger" | "secondary" | "success"> = {
  ACTIVELY_ASKING: "info",
  SEEKING_MAINTAINERS: "warning",
  LIKELY_NEEDS_HELP: "danger",
  MAINTENANCE_MODE: "secondary",
  HEALTHY: "success",
};

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  VERIFIED: "Verified",
  HIGH: "High confidence",
  MEDIUM: "Medium confidence",
  LOW: "Low confidence",
};

export const HELP_CATEGORY_LABEL: Record<HelpCategory, string> = {
  CODE: "Code",
  DOCUMENTATION: "Documentation",
  TESTING: "Testing",
  ISSUE_TRIAGE: "Issue triage",
  PR_REVIEW: "PR review",
  DESIGN: "Design",
  TRANSLATION: "Translation",
  DEVOPS_CI: "DevOps / CI",
  SECURITY: "Security",
  MAINTAINER: "Maintainer",
  CO_MAINTAINER: "Co-maintainer",
};

export const HELP_CATEGORY_ICON: Record<HelpCategory, LucideIcon> = {
  CODE: Code,
  DOCUMENTATION: BookOpen,
  TESTING: FlaskConical,
  ISSUE_TRIAGE: ListChecks,
  PR_REVIEW: GitPullRequest,
  DESIGN: Palette,
  TRANSLATION: Languages,
  DEVOPS_CI: Cog,
  SECURITY: ShieldCheck,
  MAINTAINER: UserCog,
  CO_MAINTAINER: Users,
};

export const WANTED_HELP_STATUS_LABEL: Record<WantedHelpStatus, string> = {
  NEED_CONTRIBUTORS: "We need contributors",
  NEED_COMAINTAINERS: "We need co-maintainers",
  NEED_MAINTAINER: "We need a new maintainer",
  NEED_PR_REVIEWERS: "We need PR reviewers",
  NEED_ISSUE_TRIAGE: "We need issue triage help",
  NEED_DOCUMENTATION_HELP: "We need documentation help",
  NOT_LOOKING: "We're not currently looking for help",
};

export function formatStars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

export function formatRelativeDays(days: number | null): string {
  if (days === null) return "unknown";
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 30) return `${Math.round(days)} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${(days / 365).toFixed(1)} years ago`;
}
