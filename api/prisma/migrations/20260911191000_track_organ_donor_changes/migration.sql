CREATE OR REPLACE FUNCTION "mark_health_passport_organ_donor_recorded"()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."organDonor" IS DISTINCT FROM OLD."organDonor" THEN
    NEW."organDonorRecorded" := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "HealthPassport_organDonorRecorded" ON "HealthPassport";
CREATE TRIGGER "HealthPassport_organDonorRecorded"
BEFORE UPDATE OF "organDonor" ON "HealthPassport"
FOR EACH ROW
EXECUTE FUNCTION "mark_health_passport_organ_donor_recorded"();
