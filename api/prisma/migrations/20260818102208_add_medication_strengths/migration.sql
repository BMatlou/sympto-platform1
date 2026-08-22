CREATE TABLE "MedicationStrength" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "dosageForm" TEXT,
    "route" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationStrength_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MedicationStrength" (
    "id",
    "medicationId",
    "strength",
    "dosageForm",
    "route"
)
SELECT
    gen_random_uuid()::text,
    "id",
    "strength",
    "dosageForm",
    "route"
FROM "Medication"
WHERE "strength" IS NOT NULL;

CREATE INDEX "MedicationStrength_medicationId_idx"
ON "MedicationStrength"("medicationId");

CREATE INDEX "MedicationStrength_active_idx"
ON "MedicationStrength"("active");

CREATE UNIQUE INDEX "MedicationStrength_medicationId_strength_dosageForm_route_key"
ON "MedicationStrength"(
    "medicationId",
    "strength",
    "dosageForm",
    "route"
);

ALTER TABLE "MedicationStrength"
ADD CONSTRAINT "MedicationStrength_medicationId_fkey"
FOREIGN KEY ("medicationId")
REFERENCES "Medication"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Medication"
DROP COLUMN "dosageForm",
DROP COLUMN "route",
DROP COLUMN "strength";