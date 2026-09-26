-- Additive wearable data layer. Existing clinical/manual data is unchanged.

CREATE TYPE "WearableProvider" AS ENUM (
  'BLUETOOTH_LE',
  'APPLE_HEALTHKIT',
  'HEALTH_CONNECT',
  'SAMSUNG_HEALTH',
  'GARMIN',
  'FITBIT',
  'OURA',
  'POLAR',
  'SYMPTO_WEARABLE',
  'OTHER'
);

CREATE TYPE "WearableConnectionStatus" AS ENUM (
  'CONNECTED',
  'PAUSED',
  'DISCONNECTED',
  'ERROR'
);

CREATE TYPE "SleepStageType" AS ENUM (
  'AWAKE',
  'LIGHT',
  'DEEP',
  'REM',
  'UNKNOWN'
);

CREATE TABLE "WearableConnection" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "provider" "WearableProvider" NOT NULL,
  "status" "WearableConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "externalAccountId" TEXT,
  "permissions" JSONB,
  "metadata" JSONB,
  "connectedAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WearableConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WearableConnection_patientId_provider_key"
  ON "WearableConnection"("patientId", "provider");
CREATE INDEX "WearableConnection_patientId_idx"
  ON "WearableConnection"("patientId");
CREATE INDEX "WearableConnection_provider_idx"
  ON "WearableConnection"("provider");
CREATE INDEX "WearableConnection_status_idx"
  ON "WearableConnection"("status");

ALTER TABLE "WearableConnection"
  ADD CONSTRAINT "WearableConnection_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WearableDevice"
  ADD COLUMN "connectionId" TEXT;

CREATE INDEX "WearableDevice_connectionId_idx"
  ON "WearableDevice"("connectionId");

ALTER TABLE "WearableDevice"
  ADD CONSTRAINT "WearableDevice_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "WearableConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeviceMeasurement"
  ADD COLUMN "connectionId" TEXT,
  ADD COLUMN "metricKey" TEXT,
  ADD COLUMN "secondaryValue" DECIMAL(12,4),
  ADD COLUMN "secondaryUnit" TEXT,
  ADD COLUMN "externalRecordId" TEXT;

CREATE INDEX "DeviceMeasurement_metricKey_idx"
  ON "DeviceMeasurement"("metricKey");
CREATE INDEX "DeviceMeasurement_connectionId_idx"
  ON "DeviceMeasurement"("connectionId");
CREATE INDEX "DeviceMeasurement_externalRecordId_idx"
  ON "DeviceMeasurement"("externalRecordId");
CREATE INDEX "DeviceMeasurement_deviceId_source_externalRecordId_idx"
  ON "DeviceMeasurement"("deviceId", "source", "externalRecordId");

ALTER TABLE "DeviceMeasurement"
  ADD CONSTRAINT "DeviceMeasurement_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "WearableConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeviceSyncLog"
  ADD COLUMN "connectionId" TEXT;

CREATE INDEX "DeviceSyncLog_connectionId_idx"
  ON "DeviceSyncLog"("connectionId");
CREATE INDEX "DeviceSyncLog_deviceId_syncStartedAt_idx"
  ON "DeviceSyncLog"("deviceId", "syncStartedAt");

ALTER TABLE "DeviceSyncLog"
  ADD CONSTRAINT "DeviceSyncLog_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "WearableConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SleepSession" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "deviceId" TEXT,
  "connectionId" TEXT,
  "externalRecordId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "sleepScore" DECIMAL(6,2),
  "source" TEXT,
  "timezone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SleepSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SleepSession_patientId_startedAt_idx"
  ON "SleepSession"("patientId", "startedAt");
CREATE INDEX "SleepSession_deviceId_idx"
  ON "SleepSession"("deviceId");
CREATE INDEX "SleepSession_connectionId_idx"
  ON "SleepSession"("connectionId");
CREATE INDEX "SleepSession_externalRecordId_idx"
  ON "SleepSession"("externalRecordId");

ALTER TABLE "SleepSession"
  ADD CONSTRAINT "SleepSession_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SleepSession"
  ADD CONSTRAINT "SleepSession_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "WearableDevice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SleepSession"
  ADD CONSTRAINT "SleepSession_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "WearableConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SleepStage" (
  "id" TEXT NOT NULL,
  "sleepSessionId" TEXT NOT NULL,
  "stage" "SleepStageType" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  CONSTRAINT "SleepStage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SleepStage_sleepSessionId_startedAt_idx"
  ON "SleepStage"("sleepSessionId", "startedAt");

ALTER TABLE "SleepStage"
  ADD CONSTRAINT "SleepStage_sleepSessionId_fkey"
  FOREIGN KEY ("sleepSessionId") REFERENCES "SleepSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkoutSession" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "deviceId" TEXT,
  "connectionId" TEXT,
  "externalRecordId" TEXT,
  "activityType" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "distance" DECIMAL(12,3),
  "distanceUnit" TEXT,
  "calories" DECIMAL(12,2),
  "averageHeartRate" INTEGER,
  "maximumHeartRate" INTEGER,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutSession_patientId_startedAt_idx"
  ON "WorkoutSession"("patientId", "startedAt");
CREATE INDEX "WorkoutSession_deviceId_idx"
  ON "WorkoutSession"("deviceId");
CREATE INDEX "WorkoutSession_connectionId_idx"
  ON "WorkoutSession"("connectionId");
CREATE INDEX "WorkoutSession_externalRecordId_idx"
  ON "WorkoutSession"("externalRecordId");

ALTER TABLE "WorkoutSession"
  ADD CONSTRAINT "WorkoutSession_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession"
  ADD CONSTRAINT "WorkoutSession_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "WearableDevice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession"
  ADD CONSTRAINT "WorkoutSession_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "WearableConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WearableWellnessMetric" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "deviceId" TEXT,
  "connectionId" TEXT,
  "externalRecordId" TEXT,
  "metricKey" TEXT NOT NULL,
  "value" DECIMAL(12,4) NOT NULL,
  "unit" TEXT,
  "measuredAt" TIMESTAMP(3) NOT NULL,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WearableWellnessMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WearableWellnessMetric_patientId_metricKey_measuredAt_idx"
  ON "WearableWellnessMetric"("patientId", "metricKey", "measuredAt");
CREATE INDEX "WearableWellnessMetric_deviceId_idx"
  ON "WearableWellnessMetric"("deviceId");
CREATE INDEX "WearableWellnessMetric_connectionId_idx"
  ON "WearableWellnessMetric"("connectionId");
CREATE INDEX "WearableWellnessMetric_externalRecordId_idx"
  ON "WearableWellnessMetric"("externalRecordId");

ALTER TABLE "WearableWellnessMetric"
  ADD CONSTRAINT "WearableWellnessMetric_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WearableWellnessMetric"
  ADD CONSTRAINT "WearableWellnessMetric_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "WearableDevice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WearableWellnessMetric"
  ADD CONSTRAINT "WearableWellnessMetric_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "WearableConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
