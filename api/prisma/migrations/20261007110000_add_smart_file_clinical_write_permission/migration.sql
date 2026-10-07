-- Allow explicit clinical Smart File shares to append clinician-authored records.
ALTER TABLE "DataAccessConsent"
ADD COLUMN IF NOT EXISTS "canUpdateClinicalRecords" BOOLEAN NOT NULL DEFAULT false;
