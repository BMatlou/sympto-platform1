-- Patient numbers are persistent, read-only patient identifiers.
-- Backfill existing patients first, then guarantee future Patient rows receive one.

UPDATE "Patient"
SET "patientNumber" = 'PT-' || upper(substr(replace("id"::text, '-', ''), 1, 12))
WHERE "patientNumber" IS NULL;

CREATE OR REPLACE FUNCTION set_patient_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."patientNumber" IS NULL OR NEW."patientNumber" = '' THEN
    NEW."patientNumber" := 'PT-' || upper(substr(replace(NEW."id"::text, '-', ''), 1, 12));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Patient_set_patient_number" ON "Patient";

CREATE TRIGGER "Patient_set_patient_number"
BEFORE INSERT ON "Patient"
FOR EACH ROW
EXECUTE FUNCTION set_patient_number();
