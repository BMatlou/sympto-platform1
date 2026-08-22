/*
  Warnings:

  - Added the required column `category` to the `Allergy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Allergy` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AllergyCategory" AS ENUM ('FOOD', 'DRUG', 'ENVIRONMENT', 'INSECT', 'LATEX', 'OTHER');

-- CreateEnum
CREATE TYPE "RhesusFactor" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "DominantHand" AS ENUM ('RIGHT', 'LEFT', 'AMBIDEXTROUS');

-- CreateEnum
CREATE TYPE "SmokingStatus" AS ENUM ('NEVER', 'FORMER', 'OCCASIONAL', 'DAILY');

-- CreateEnum
CREATE TYPE "AlcoholConsumption" AS ENUM ('NEVER', 'OCCASIONAL', 'WEEKLY', 'DAILY');

-- CreateEnum
CREATE TYPE "ExerciseFrequency" AS ENUM ('NONE', 'ONCE_PER_WEEK', 'TWO_TO_THREE_PER_WEEK', 'FOUR_TO_FIVE_PER_WEEK', 'DAILY');

-- DropIndex
DROP INDEX "Allergy_name_key";

-- AlterTable
ALTER TABLE "Allergy" ADD COLUMN     "category" "AllergyCategory" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "HealthPassport" ADD COLUMN     "rhesusFactor" "RhesusFactor";

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "alcoholConsumption" "AlcoholConsumption",
ADD COLUMN     "dominantHand" "DominantHand",
ADD COLUMN     "exerciseFrequency" "ExerciseFrequency",
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "smokingStatus" "SmokingStatus";
