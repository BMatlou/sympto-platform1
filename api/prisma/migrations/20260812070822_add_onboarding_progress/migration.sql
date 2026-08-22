/*
  Warnings:

  - The values [EMERGENCY] on the enum `EpisodePriority` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
BEGIN;
CREATE TYPE "EpisodePriority_new" AS ENUM ('ROUTINE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');
ALTER TABLE "public"."ClinicalEpisode" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "ClinicalEpisode" ALTER COLUMN "priority" TYPE "EpisodePriority_new" USING ("priority"::text::"EpisodePriority_new");
ALTER TYPE "EpisodePriority" RENAME TO "EpisodePriority_old";
ALTER TYPE "EpisodePriority_new" RENAME TO "EpisodePriority";
DROP TYPE "public"."EpisodePriority_old";
ALTER TABLE "ClinicalEpisode" ALTER COLUMN "priority" SET DEFAULT 'ROUTINE';
COMMIT;

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_userId_key" ON "onboarding_progress"("userId");

-- CreateIndex
CREATE INDEX "onboarding_progress_status_idx" ON "onboarding_progress"("status");

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
