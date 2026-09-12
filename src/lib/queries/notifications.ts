import "server-only";
import { db } from "@/lib/db";
import { PUBLIC_REPOSITORY } from "./repositories";

export async function getNotifications(userId: string) {
  const notifications = await db.repositoryLikeNotification.findMany({
    where: { recipientId: userId, like: { liked: true, repository: {
      ...PUBLIC_REPOSITORY,
      maintainers: { some: { userId, verifiedAt: { not: null } } },
    } } },
    select: { id: true, readAt: true, createdAt: true, like: { select: {
      user: { select: { githubLogin: true } },
      repository: { select: { owner: true, name: true, fullName: true } },
    } } },
    orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });
  return notifications.map(({ id, readAt, createdAt, like }) => ({
    id, unread: readAt === null, createdAt: createdAt.toISOString(),
    actor: like.user.githubLogin ?? "Someone", repository: like.repository.fullName,
    href: `/${encodeURIComponent(like.repository.owner)}/${encodeURIComponent(like.repository.name)}`,
  }));
}
