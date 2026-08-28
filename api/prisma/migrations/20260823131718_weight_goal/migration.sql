-- AlterTable
ALTER TABLE "MedicationStrength" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Medication_searchable_idx" ON "Medication"("searchable");
