import "server-only";
import { db } from "@/lib/db";
import { PUBLIC_REPOSITORY } from "./repositories";
import { claimValidSince } from "@/lib/claims";

export async function getNotifications(userId: string) {
  const notifications = await db.repositoryLikeNotification.findMany({
    where: { recipientId: userId, repository: {
      ...PUBLIC_REPOSITORY,
      // Expired claims stop surfacing likes, matching how the claim stops overriding status.
      maintainers: { some: { userId, verifiedAt: { gte: claimValidSince() } } },
    } },
    select: { id: true, readAt: true, createdAt: true,
      actor: { select: { githubLogin: true } },
      repository: { select: { owner: true, name: true, fullName: true } },
    },
    orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });
  return notifications.map(({ id, readAt, createdAt, actor, repository }) => ({
    id, unread: readAt === null, createdAt: createdAt.toISOString(),
    actor: actor.githubLogin ?? "Someone", repository: repository.fullName,
    href: `/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`,
  }));
}
