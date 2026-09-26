CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "message" VARCHAR(240) NOT NULL,
    "linkLabel" VARCHAR(60),
    "linkUrl" VARCHAR(2048),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "revision" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Announcement_singleton" CHECK ("id" = 'site')
);
