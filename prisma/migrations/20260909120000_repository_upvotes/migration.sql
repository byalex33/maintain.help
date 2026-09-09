CREATE TABLE "RepositoryUpvote" (
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepositoryUpvote_pkey" PRIMARY KEY ("userId", "repositoryId")
);
CREATE INDEX "RepositoryUpvote_repositoryId_idx" ON "RepositoryUpvote"("repositoryId");
ALTER TABLE "RepositoryUpvote" ADD CONSTRAINT "RepositoryUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepositoryUpvote" ADD CONSTRAINT "RepositoryUpvote_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
