ALTER TABLE "HealthGoal"
ADD COLUMN "patientMedicationId" TEXT;

CREATE INDEX "HealthGoal_patientMedicationId_idx"
ON "HealthGoal"("patientMedicationId");

ALTER TABLE "HealthGoal"
ADD CONSTRAINT "HealthGoal_patientMedicationId_fkey"
FOREIGN KEY ("patientMedicationId")
REFERENCES "PatientMedication"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
