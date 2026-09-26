CREATE TABLE "RepositoryLikeNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepositoryLikeNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepositoryLikeNotification_recipientId_actorId_repositoryId_key" ON "RepositoryLikeNotification"("recipientId", "actorId", "repositoryId");
-- Prisma cannot declare NULLS FIRST on an index; keep this aligned with the inbox ordering.
CREATE INDEX "RepositoryLikeNotification_recipientId_readAt_createdAt_id_idx" ON "RepositoryLikeNotification"("recipientId", "readAt" ASC NULLS FIRST, "createdAt" DESC, "id" DESC);
CREATE INDEX "RepositoryLikeNotification_actorId_idx" ON "RepositoryLikeNotification"("actorId");
CREATE INDEX "RepositoryLikeNotification_repositoryId_idx" ON "RepositoryLikeNotification"("repositoryId");
ALTER TABLE "RepositoryLikeNotification" ADD CONSTRAINT "RepositoryLikeNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepositoryLikeNotification" ADD CONSTRAINT "RepositoryLikeNotification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepositoryLikeNotification" ADD CONSTRAINT "RepositoryLikeNotification_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
