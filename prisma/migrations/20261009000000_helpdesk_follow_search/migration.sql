-- CreateEnum
CREATE TYPE "FollowTargetType" AS ENUM ('DEPARTMENT', 'COURSE', 'CLUB');

-- CreateEnum
CREATE TYPE "ChatFeedback" AS ENUM ('HELPFUL', 'NOT_HELPFUL');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "feedback" "ChatFeedback",
ADD COLUMN     "feedbackAt" TIMESTAMP(3),
ADD COLUMN     "intent" VARCHAR(40);

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "token" VARCHAR(64) NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "KnowledgeEntry" ADD COLUMN     "isSample" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "FollowTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchTerm" (
    "term" VARCHAR(100) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchTerm_pkey" PRIMARY KEY ("term")
);

-- CreateIndex
CREATE INDEX "Follow_targetType_targetId_idx" ON "Follow"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_targetType_targetId_key" ON "Follow"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "SearchTerm_count_idx" ON "SearchTerm"("count");

-- CreateIndex
CREATE INDEX "ChatMessage_feedback_createdAt_idx" ON "ChatMessage"("feedback", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatSession_token_key" ON "ChatSession"("token");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
