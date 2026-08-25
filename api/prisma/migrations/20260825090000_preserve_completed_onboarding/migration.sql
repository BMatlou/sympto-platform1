/*
  Preserve completed onboarding when a completed user's profile is edited.

  Profile/Health Profile edits are not onboarding progress. Older profile
  update code could downgrade a completed record to IN_PROGRESS. Repair any
  such records that still have completedAt, then enforce the invariant at the
  database level so future profile edits cannot reopen onboarding.
*/

-- Repair completed records that were accidentally downgraded while retaining
-- their original completion timestamp.
UPDATE "onboarding_progress"
SET
  "status" = 'COMPLETED',
  "currentStep" = 11,
  "completionPercentage" = 100
WHERE "status" <> 'COMPLETED'
  AND "completedAt" IS NOT NULL;

CREATE OR REPLACE FUNCTION "preserve_completed_onboarding"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = 'COMPLETED' THEN
    NEW."status" := 'COMPLETED';
    NEW."currentStep" := OLD."currentStep";
    NEW."completionPercentage" := OLD."completionPercentage";
    NEW."completedAt" := OLD."completedAt";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "preserve_completed_onboarding_trigger"
ON "onboarding_progress";

CREATE TRIGGER "preserve_completed_onboarding_trigger"
BEFORE UPDATE ON "onboarding_progress"
FOR EACH ROW
EXECUTE FUNCTION "preserve_completed_onboarding"();
