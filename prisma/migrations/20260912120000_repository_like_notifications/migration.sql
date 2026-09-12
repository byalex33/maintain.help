CREATE TABLE "RepositoryLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "liked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepositoryLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RepositoryLikeNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "likeId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepositoryLikeNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepositoryLike_userId_repositoryId_key" ON "RepositoryLike"("userId", "repositoryId");
CREATE UNIQUE INDEX "RepositoryLikeNotification_recipientId_likeId_key" ON "RepositoryLikeNotification"("recipientId", "likeId");
CREATE INDEX "RepositoryLikeNotification_recipientId_createdAt_idx" ON "RepositoryLikeNotification"("recipientId", "createdAt");
ALTER TABLE "RepositoryLike" ADD CONSTRAINT "RepositoryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepositoryLike" ADD CONSTRAINT "RepositoryLike_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepositoryLikeNotification" ADD CONSTRAINT "RepositoryLikeNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepositoryLikeNotification" ADD CONSTRAINT "RepositoryLikeNotification_likeId_fkey" FOREIGN KEY ("likeId") REFERENCES "RepositoryLike"("id") ON DELETE CASCADE ON UPDATE CASCADE;
