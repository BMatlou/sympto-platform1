/*
  Warnings:

  - You are about to drop the column `emoji` on the `Country` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `PatientImmunization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Country" DROP COLUMN "emoji",
ADD COLUMN     "flagEmoji" TEXT,
ADD COLUMN     "flagImageUrl" TEXT;

-- AlterTable
ALTER TABLE "PatientImmunization" ADD COLUMN     "adverseReaction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adverseReactionNotes" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "nextDueDate" TIMESTAMP(3),
ADD COLUMN     "route" TEXT,
ADD COLUMN     "site" TEXT,
ADD COLUMN     "status" "ImmunizationStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "PatientImmunization_healthPassportId_idx" ON "PatientImmunization"("healthPassportId");

-- CreateIndex
CREATE INDEX "PatientImmunization_immunizationId_idx" ON "PatientImmunization"("immunizationId");

-- CreateIndex
CREATE INDEX "PatientImmunization_status_idx" ON "PatientImmunization"("status");

-- CreateIndex
CREATE INDEX "PatientImmunization_administeredAt_idx" ON "PatientImmunization"("administeredAt");
