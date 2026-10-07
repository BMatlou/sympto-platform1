-- Bind Smart File clinical shares to the appointment that authorised them.
ALTER TABLE "DataAccessConsent"
ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;

ALTER TABLE "SmartFileShareSession"
ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;

CREATE INDEX IF NOT EXISTS "DataAccessConsent_appointmentId_idx"
ON "DataAccessConsent"("appointmentId");

CREATE INDEX IF NOT EXISTS "SmartFileShareSession_patientId_idx"
ON "SmartFileShareSession"("patientId");

CREATE INDEX IF NOT EXISTS "SmartFileShareSession_appointmentId_idx"
ON "SmartFileShareSession"("appointmentId");

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SmartFileShareSession_patientId_fkey'
  ) THEN
    ALTER TABLE "SmartFileShareSession"
    ADD CONSTRAINT "SmartFileShareSession_patientId_fkey"
    FOREIGN KEY ("patientId")
    REFERENCES "Patient"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DataAccessConsent_appointmentId_fkey'
  ) THEN
    ALTER TABLE "DataAccessConsent"
    ADD CONSTRAINT "DataAccessConsent_appointmentId_fkey"
    FOREIGN KEY ("appointmentId")
    REFERENCES "Appointment"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SmartFileShareSession_appointmentId_fkey'
  ) THEN
    ALTER TABLE "SmartFileShareSession"
    ADD CONSTRAINT "SmartFileShareSession_appointmentId_fkey"
    FOREIGN KEY ("appointmentId")
    REFERENCES "Appointment"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;
