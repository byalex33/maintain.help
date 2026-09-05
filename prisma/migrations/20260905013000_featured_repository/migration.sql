ALTER TABLE "Repository" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Repository_single_featured" ON "Repository" ("isFeatured") WHERE "isFeatured" = true;
