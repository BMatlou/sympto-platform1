-- Distinguish an explicit organ-donor answer from the legacy Boolean default.
ALTER TABLE "HealthPassport"
ADD COLUMN "organDonorRecorded" BOOLEAN NOT NULL DEFAULT false;

-- Preserve explicit positive answers already stored. Legacy false values remain
-- unrecorded because there is no provenance proving the patient explicitly chose No.
UPDATE "HealthPassport"
SET "organDonorRecorded" = true
WHERE "organDonor" = true;
