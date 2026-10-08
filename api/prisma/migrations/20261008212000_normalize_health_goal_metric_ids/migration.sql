-- Normalize the health-goal metric table primary keys.
--
-- Older local/prototype databases can contain these feature tables with TEXT
-- primary-key columns even though the canonical migrations define UUID IDs.
-- The application treats these IDs as opaque strings, so normalize the storage
-- back to the canonical UUID type and keep existing valid UUID values intact.
-- Invalid legacy values are replaced because these feature-table PKs are not
-- referenced by application foreign keys.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  current_type text;
BEGIN
  SELECT c.udt_name
    INTO current_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'HealthGoalMetricEvent'
    AND c.column_name = 'id';

  IF current_type IS NOT NULL AND current_type <> 'uuid' THEN
    EXECUTE $sql$
      UPDATE "HealthGoalMetricEvent"
      SET "id" = gen_random_uuid()::text
      WHERE "id" IS NULL
         OR "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "HealthGoalMetricEvent"
        ALTER COLUMN "id" TYPE UUID
        USING "id"::uuid
    $sql$;
  END IF;

  IF current_type IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "HealthGoalMetricEvent" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()';
    EXECUTE 'ALTER TABLE "HealthGoalMetricEvent" ALTER COLUMN "id" SET NOT NULL';
  END IF;
END $$;

DO $$
DECLARE
  current_type text;
BEGIN
  SELECT c.udt_name
    INTO current_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'HealthGoalMetricConfig'
    AND c.column_name = 'id';

  IF current_type IS NOT NULL AND current_type <> 'uuid' THEN
    EXECUTE $sql$
      UPDATE "HealthGoalMetricConfig"
      SET "id" = gen_random_uuid()::text
      WHERE "id" IS NULL
         OR "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    $sql$;

    EXECUTE $sql$
      ALTER TABLE "HealthGoalMetricConfig"
        ALTER COLUMN "id" TYPE UUID
        USING "id"::uuid
    $sql$;
  END IF;

  IF current_type IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "HealthGoalMetricConfig" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()';
    EXECUTE 'ALTER TABLE "HealthGoalMetricConfig" ALTER COLUMN "id" SET NOT NULL';
  END IF;
END $$;
