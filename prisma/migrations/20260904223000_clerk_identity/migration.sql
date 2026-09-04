-- Preserve local user IDs and all saved repositories, claims and reviews.
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
