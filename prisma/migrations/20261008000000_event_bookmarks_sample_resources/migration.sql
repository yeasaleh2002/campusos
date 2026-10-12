-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "isSample" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventBookmark_userId_createdAt_idx" ON "EventBookmark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventBookmark_userId_eventId_key" ON "EventBookmark"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "EventBookmark" ADD CONSTRAINT "EventBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBookmark" ADD CONSTRAINT "EventBookmark_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
