CREATE TYPE "MedicationClinicalRelationType" AS ENUM ('SIDE_EFFECT', 'RELIEVES_SYMPTOM', 'MAY_MASK_SYMPTOM');

CREATE TABLE "MedicationClinicalReference" (
  "id" TEXT NOT NULL,
  "medicationId" TEXT NOT NULL,
  "symptomId" TEXT NOT NULL,
  "relationType" "MedicationClinicalRelationType" NOT NULL,
  "evidenceLevel" TEXT,
  "source" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationClinicalReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MedicationClinicalReference_medicationId_symptomId_relationType_key" ON "MedicationClinicalReference"("medicationId", "symptomId", "relationType");
CREATE INDEX "MedicationClinicalReference_medicationId_idx" ON "MedicationClinicalReference"("medicationId");
CREATE INDEX "MedicationClinicalReference_symptomId_idx" ON "MedicationClinicalReference"("symptomId");
CREATE INDEX "MedicationClinicalReference_relationType_idx" ON "MedicationClinicalReference"("relationType");
CREATE INDEX "MedicationClinicalReference_active_idx" ON "MedicationClinicalReference"("active");
