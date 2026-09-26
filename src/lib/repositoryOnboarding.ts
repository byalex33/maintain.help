import { z } from "zod";

export const HELP_TAGS = [
  { id: "DOCUMENTATION", label: "Docs", description: "Guides and examples" },
  { id: "DESIGN", label: "Design", description: "Interfaces and UX" },
  { id: "CODE", label: "Code", description: "Features and fixes" },
  { id: "PR_REVIEW", label: "PR review", description: "A second pair of eyes" },
  { id: "ISSUE_TRIAGE", label: "Issue triage", description: "Make sense of the backlog" },
  { id: "TESTING", label: "Testing", description: "Catch bugs before release" },
  { id: "TRANSLATION", label: "Translation", description: "Reach more people" },
  { id: "DEVOPS_CI", label: "DevOps & CI", description: "Builds and releases" },
] as const;

export const onboardingSchema = z.object({
  status: z.enum(["NEED_CONTRIBUTORS", "NEED_COMAINTAINERS", "NEED_MAINTAINER"]),
  message: z.string().trim().min(1, "Tell contributors what you need.").max(2000),
  tags: z.array(z.enum(["DOCUMENTATION", "DESIGN", "CODE", "PR_REVIEW", "ISSUE_TRIAGE", "TESTING", "TRANSLATION", "DEVOPS_CI"])).min(1).max(8),
});
