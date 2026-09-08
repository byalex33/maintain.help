ALTER TABLE "Repository" ADD COLUMN "analysisFailureCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "RepositoryAnalysisLease" (
    "key" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RepositoryAnalysisLease_pkey" PRIMARY KEY ("key")
);
