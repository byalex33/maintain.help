-- CreateEnum
CREATE TYPE "RepositoryAvailability" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'PRIVATE', 'DELETED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClassificationVerdict" AS ENUM ('CORRECT', 'FALSE_POSITIVE', 'FALSE_NEGATIVE', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "RepositoryFeedbackType" AS ENUM ('NEED_CONTRIBUTORS', 'NEED_COMAINTAINERS', 'NEED_SUCCESSOR', 'NOT_LOOKING', 'INTENTIONALLY_STABLE', 'INACCURATE');

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN "analysisError" TEXT,
ADD COLUMN "analysisVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "availability" "RepositoryAvailability" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "nextAnalysisAt" TIMESTAMP(3);

ALTER TABLE "RepositoryMetricSnapshot" ADD COLUMN "analysisVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RepositoryStatus" ADD COLUMN "analysisVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "RepositoryClassificationReview" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "verdict" "ClassificationVerdict" NOT NULL,
    "expectedStatus" "HelpStatus",
    "notes" TEXT,
    "falsePositive" BOOLEAN NOT NULL DEFAULT false,
    "falseNegative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepositoryClassificationReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RepositoryFeedback" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RepositoryFeedbackType" NOT NULL,
    "notes" TEXT,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepositoryFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepositoryClassificationReview_repositoryId_createdAt_idx" ON "RepositoryClassificationReview"("repositoryId", "createdAt");
CREATE INDEX "RepositoryFeedback_repositoryId_createdAt_idx" ON "RepositoryFeedback"("repositoryId", "createdAt");
CREATE INDEX "RepositoryFeedback_userId_createdAt_idx" ON "RepositoryFeedback"("userId", "createdAt");
CREATE INDEX "Repository_nextAnalysisAt_idx" ON "Repository"("nextAnalysisAt");

ALTER TABLE "RepositoryClassificationReview" ADD CONSTRAINT "RepositoryClassificationReview_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepositoryClassificationReview" ADD CONSTRAINT "RepositoryClassificationReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RepositoryFeedback" ADD CONSTRAINT "RepositoryFeedback_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepositoryFeedback" ADD CONSTRAINT "RepositoryFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
