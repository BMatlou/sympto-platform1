CREATE TABLE "MedicationAdherenceLog" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "medicationId" TEXT NOT NULL,
  "notificationId" TEXT,
  "action" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3),
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationAdherenceLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicationAdherenceLog_patientId_recordedAt_idx"
  ON "MedicationAdherenceLog"("patientId", "recordedAt");
CREATE INDEX "MedicationAdherenceLog_medicationId_recordedAt_idx"
  ON "MedicationAdherenceLog"("medicationId", "recordedAt");
CREATE INDEX "MedicationAdherenceLog_notificationId_idx"
  ON "MedicationAdherenceLog"("notificationId");
