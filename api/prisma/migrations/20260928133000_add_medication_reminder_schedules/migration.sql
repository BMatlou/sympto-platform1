-- Create recurring medication reminder schedules without altering existing notification delivery tables.

CREATE TABLE "MedicationReminderSchedule" (
  "id" TEXT NOT NULL,
  "patientMedicationId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "daysOfWeek" INTEGER[] NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MedicationReminderSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationReminderSlot" (
  "id" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "doseIndex" INTEGER NOT NULL,
  "time" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MedicationReminderSlot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification"
  ADD COLUMN "medicationReminderSlotId" TEXT;

CREATE UNIQUE INDEX "MedicationReminderSchedule_patientMedicationId_key"
  ON "MedicationReminderSchedule"("patientMedicationId");

CREATE INDEX "MedicationReminderSchedule_enabled_idx"
  ON "MedicationReminderSchedule"("enabled");

CREATE UNIQUE INDEX "MedicationReminderSlot_scheduleId_doseIndex_key"
  ON "MedicationReminderSlot"("scheduleId", "doseIndex");

CREATE INDEX "MedicationReminderSlot_scheduleId_idx"
  ON "MedicationReminderSlot"("scheduleId");

CREATE INDEX "Notification_medicationReminderSlotId_idx"
  ON "Notification"("medicationReminderSlotId");

ALTER TABLE "MedicationReminderSchedule"
  ADD CONSTRAINT "MedicationReminderSchedule_patientMedicationId_fkey"
  FOREIGN KEY ("patientMedicationId") REFERENCES "PatientMedication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicationReminderSlot"
  ADD CONSTRAINT "MedicationReminderSlot_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "MedicationReminderSchedule"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_medicationReminderSlotId_fkey"
  FOREIGN KEY ("medicationReminderSlotId") REFERENCES "MedicationReminderSlot"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
