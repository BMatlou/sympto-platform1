CREATE TABLE "MedicationAdherenceGoal" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "targetPercent" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "windowDays" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationAdherenceGoal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MedicationAdherenceGoal_patientId_idx" ON "MedicationAdherenceGoal"("patientId");
CREATE INDEX "MedicationAdherenceGoal_dates_idx" ON "MedicationAdherenceGoal"("startDate","endDate");
