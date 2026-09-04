-- CreateEnum
CREATE TYPE "HelpStatus" AS ENUM ('ACTIVELY_ASKING', 'SEEKING_MAINTAINERS', 'LIKELY_NEEDS_HELP', 'MAINTENANCE_MODE', 'HEALTHY');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('VERIFIED', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "HelpCategory" AS ENUM ('CODE', 'DOCUMENTATION', 'TESTING', 'ISSUE_TRIAGE', 'PR_REVIEW', 'DESIGN', 'TRANSLATION', 'DEVOPS_CI', 'SECURITY', 'MAINTAINER', 'CO_MAINTAINER');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('EXPLICIT_STATEMENT', 'LABEL', 'METRIC', 'INFERENCE');

-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('README', 'CONTRIBUTING', 'GITHUB_ISSUE', 'GITHUB_DISCUSSION', 'REPOSITORY_METADATA', 'COMMIT_ACTIVITY', 'PULL_REQUESTS', 'RELEASES', 'CALCULATED_METRIC');

-- CreateEnum
CREATE TYPE "WantedHelpStatus" AS ENUM ('NEED_CONTRIBUTORS', 'NEED_COMAINTAINERS', 'NEED_MAINTAINER', 'NEED_PR_REVIEWERS', 'NEED_ISSUE_TRIAGE', 'NEED_DOCUMENTATION_HELP', 'NOT_LOOKING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubId" TEXT,
    "githubLogin" TEXT,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "githubId" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "homepage" TEXT,
    "primaryLanguage" TEXT,
    "languages" JSONB,
    "topics" TEXT[],
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "watchers" INTEGER NOT NULL DEFAULT 0,
    "openIssueCount" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isFork" BOOLEAN NOT NULL DEFAULT false,
    "createdAtGithub" TIMESTAMP(3) NOT NULL,
    "pushedAt" TIMESTAMP(3),
    "latestReleaseTag" TEXT,
    "latestReleaseAt" TIMESTAMP(3),
    "license" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "status" "HelpStatus" NOT NULL DEFAULT 'HEALTHY',
    "statusConfidence" "ConfidenceLevel" NOT NULL DEFAULT 'LOW',
    "statusVerified" BOOLEAN NOT NULL DEFAULT false,
    "statusReason" TEXT,
    "capacityPressureScore" INTEGER,
    "beginnerFriendlyScore" INTEGER,
    "isBeginnerFriendly" BOOLEAN NOT NULL DEFAULT false,
    "isFixture" BOOLEAN NOT NULL DEFAULT false,
    "isIndexed" BOOLEAN NOT NULL DEFAULT true,
    "lastAnalyzedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryStatus" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "status" "HelpStatus" NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryHelpCategory" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "category" "HelpCategory" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryHelpCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryEvidence" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceType" "EvidenceSourceType" NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryMetricSnapshot" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stars" INTEGER NOT NULL,
    "forks" INTEGER NOT NULL,
    "openIssues" INTEGER NOT NULL,
    "openPullRequests" INTEGER NOT NULL,
    "newIssuesLast90d" INTEGER NOT NULL DEFAULT 0,
    "closedIssuesLast90d" INTEGER NOT NULL DEFAULT 0,
    "newPullRequestsLast90d" INTEGER NOT NULL DEFAULT 0,
    "closedPullRequestsLast90d" INTEGER NOT NULL DEFAULT 0,
    "commitsLast30d" INTEGER NOT NULL DEFAULT 0,
    "commitsLast90d" INTEGER NOT NULL DEFAULT 0,
    "commitsLast365d" INTEGER NOT NULL DEFAULT 0,
    "activeMaintainersLast90d" INTEGER NOT NULL DEFAULT 0,
    "activeMaintainersLast365d" INTEGER NOT NULL DEFAULT 0,
    "medianOpenIssueAgeDays" DOUBLE PRECISION,
    "medianOpenPrAgeDays" DOUBLE PRECISION,
    "medianPrReviewTimeHours" DOUBLE PRECISION,
    "daysSinceLastCommit" INTEGER,
    "daysSinceLastRelease" INTEGER,
    "helpWantedIssueCount" INTEGER NOT NULL DEFAULT 0,
    "goodFirstIssueCount" INTEGER NOT NULL DEFAULT 0,
    "capacityPressureScore" INTEGER,
    "beginnerFriendlyScore" INTEGER,

    CONSTRAINT "RepositoryMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubIssue" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubIssueId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "labels" TEXT[],
    "isPullRequest" BOOLEAN NOT NULL DEFAULT false,
    "createdAtGithub" TIMESTAMP(3) NOT NULL,
    "updatedAtGithub" TIMESTAMP(3) NOT NULL,
    "closedAtGithub" TIMESTAMP(3),
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "category" "HelpCategory",

    CONSTRAINT "GitHubIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryMaintainer" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "userId" TEXT,
    "githubLogin" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'maintainer',
    "commitsLast365d" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryMaintainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintainerRequest" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WantedHelpStatus" NOT NULL,
    "skillsWanted" TEXT[],
    "message" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintainerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedRepository" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRepository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubLogin_key" ON "User"("githubLogin");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE INDEX "Repository_owner_name_idx" ON "Repository"("owner", "name");

-- CreateIndex
CREATE INDEX "Repository_status_idx" ON "Repository"("status");

-- CreateIndex
CREATE INDEX "Repository_stars_idx" ON "Repository"("stars");

-- CreateIndex
CREATE INDEX "Repository_primaryLanguage_idx" ON "Repository"("primaryLanguage");

-- CreateIndex
CREATE INDEX "RepositoryStatus_repositoryId_createdAt_idx" ON "RepositoryStatus"("repositoryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryHelpCategory_repositoryId_category_key" ON "RepositoryHelpCategory"("repositoryId", "category");

-- CreateIndex
CREATE INDEX "RepositoryEvidence_repositoryId_idx" ON "RepositoryEvidence"("repositoryId");

-- CreateIndex
CREATE INDEX "RepositoryMetricSnapshot_repositoryId_capturedAt_idx" ON "RepositoryMetricSnapshot"("repositoryId", "capturedAt");

-- CreateIndex
CREATE INDEX "GitHubIssue_repositoryId_state_idx" ON "GitHubIssue"("repositoryId", "state");

-- CreateIndex
CREATE INDEX "GitHubIssue_repositoryId_isPullRequest_state_idx" ON "GitHubIssue"("repositoryId", "isPullRequest", "state");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubIssue_repositoryId_githubIssueId_key" ON "GitHubIssue"("repositoryId", "githubIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryMaintainer_repositoryId_githubLogin_key" ON "RepositoryMaintainer"("repositoryId", "githubLogin");

-- CreateIndex
CREATE INDEX "MaintainerRequest_repositoryId_idx" ON "MaintainerRequest"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedRepository_userId_repositoryId_key" ON "SavedRepository"("userId", "repositoryId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryStatus" ADD CONSTRAINT "RepositoryStatus_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryHelpCategory" ADD CONSTRAINT "RepositoryHelpCategory_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryEvidence" ADD CONSTRAINT "RepositoryEvidence_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryMetricSnapshot" ADD CONSTRAINT "RepositoryMetricSnapshot_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubIssue" ADD CONSTRAINT "GitHubIssue_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryMaintainer" ADD CONSTRAINT "RepositoryMaintainer_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryMaintainer" ADD CONSTRAINT "RepositoryMaintainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintainerRequest" ADD CONSTRAINT "MaintainerRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintainerRequest" ADD CONSTRAINT "MaintainerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRepository" ADD CONSTRAINT "SavedRepository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRepository" ADD CONSTRAINT "SavedRepository_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
