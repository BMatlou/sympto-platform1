ALTER TABLE "SymptomLogItem"
ADD COLUMN "location" TEXT;

CREATE INDEX "SymptomLogItem_location_idx"
ON "SymptomLogItem"("location");

CREATE TABLE "SymptomObservation" (
  "id" TEXT NOT NULL,
  "symptomLogId" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "severity" "SymptomSeverity" NOT NULL,
  "progression" "SymptomProgression",
  "frequency" "SymptomFrequency",
  "durationMinutes" INTEGER,
  "painScore" INTEGER,
  "stillPresent" BOOLEAN NOT NULL DEFAULT true,
  "suspectedTrigger" TEXT,
  "aggravatingFactors" TEXT,
  "relievingFactors" TEXT,
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "inputMode" TEXT NOT NULL DEFAULT 'FORM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SymptomObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SymptomObservation_symptomLogId_fkey"
    FOREIGN KEY ("symptomLogId") REFERENCES "SymptomLog"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SymptomObservation_symptomLogId_idx"
ON "SymptomObservation"("symptomLogId");

CREATE INDEX "SymptomObservation_observedAt_idx"
ON "SymptomObservation"("observedAt");

CREATE INDEX "SymptomObservation_severity_idx"
ON "SymptomObservation"("severity");

CREATE INDEX "SymptomObservation_progression_idx"
ON "SymptomObservation"("progression");

CREATE INDEX "SymptomObservation_stillPresent_idx"
ON "SymptomObservation"("stillPresent");
