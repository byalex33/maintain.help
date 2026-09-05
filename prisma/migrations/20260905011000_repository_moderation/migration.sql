ALTER TABLE "Repository" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TYPE "RepositoryFeedbackType" ADD VALUE 'REPORT';
ALTER TABLE "RepositoryFeedback" ADD COLUMN "resolvedAt" TIMESTAMP(3);
