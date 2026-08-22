-- CreateEnum
CREATE TYPE "HealthGoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ON_HOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HealthGoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HealthGoalCategory" AS ENUM ('WEIGHT', 'EXERCISE', 'NUTRITION', 'BLOOD_PRESSURE', 'BLOOD_GLUCOSE', 'CHOLESTEROL', 'MEDICATION', 'SLEEP', 'MENTAL_HEALTH', 'HYDRATION', 'SMOKING', 'ALCOHOL', 'HEART_RATE', 'OTHER');

-- CreateEnum
CREATE TYPE "HealthGoalProgressStatus" AS ENUM ('ON_TRACK', 'IMPROVING', 'STAGNANT', 'DECLINING', 'ACHIEVED');

-- CreateEnum
CREATE TYPE "RiskAssessmentType" AS ENUM ('FALL_RISK', 'CARDIOVASCULAR', 'DIABETES', 'STROKE', 'MENTAL_HEALTH', 'MALNUTRITION', 'PREGNANCY', 'CANCER', 'GENERAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "SymptomAttachmentType" AS ENUM ('PHOTO', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LAB_REPORT', 'IMAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "SymptomAttachmentCategory" AS ENUM ('GENERAL', 'RASH', 'WOUND', 'SWELLING', 'EYE', 'EAR', 'NOSE', 'THROAT', 'MOUTH', 'SKIN', 'STOOL', 'URINE', 'VOMIT', 'RESPIRATORY');

-- CreateEnum
CREATE TYPE "ClinicalEpisodeAttachmentType" AS ENUM ('DOCUMENT', 'PHOTO', 'VIDEO', 'AUDIO', 'LAB_REPORT', 'IMAGING', 'REFERRAL', 'CONSENT', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ClinicalEpisodeType" AS ENUM ('ACUTE', 'CHRONIC', 'FOLLOW_UP', 'EMERGENCY', 'SURGICAL', 'MATERNITY', 'MENTAL_HEALTH', 'TELEMEDICINE', 'PREVENTIVE', 'WELLNESS', 'REHABILITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ClinicalEpisodeStatus" AS ENUM ('ACTIVE', 'ONGOING', 'RESOLVED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EpisodePriority" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "SymptomLogStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SymptomSeverity" AS ENUM ('NONE', 'MILD', 'MODERATE', 'SEVERE', 'VERY_SEVERE');

-- CreateEnum
CREATE TYPE "SymptomFrequency" AS ENUM ('CONSTANT', 'INTERMITTENT', 'OCCASIONAL', 'RARE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SymptomProgression" AS ENUM ('IMPROVING', 'STABLE', 'WORSENING', 'FLUCTUATING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PainCharacter" AS ENUM ('SHARP', 'DULL', 'THROBBING', 'STABBING', 'BURNING', 'CRAMPING', 'PRESSURE', 'TIGHTNESS', 'ACHING', 'OTHER');

-- CreateEnum
CREATE TYPE "HealthJournalMood" AS ENUM ('VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD');

-- CreateEnum
CREATE TYPE "SleepQuality" AS ENUM ('VERY_POOR', 'POOR', 'FAIR', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "EnergyLevel" AS ENUM ('VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH');

-- AlterTable
ALTER TABLE "AIAnalysis" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "CarePlan" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "ClinicalNote" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "ClinicalVital" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "ImagingOrder" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "ImagingStudy" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "LabResult" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "clinicalEpisodeId" TEXT;

-- CreateTable
CREATE TABLE "SymptomLog" (
    "id" TEXT NOT NULL,
    "clinicalEpisodeId" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "status" "SymptomLogStatus" NOT NULL DEFAULT 'ACTIVE',
    "overallSeverity" "SymptomSeverity",
    "progression" "SymptomProgression",
    "startedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymptomLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomLogItem" (
    "id" TEXT NOT NULL,
    "symptomLogId" TEXT NOT NULL,
    "aiSymptomId" TEXT NOT NULL,
    "severity" "SymptomSeverity" NOT NULL DEFAULT 'MILD',
    "progression" "SymptomProgression",
    "frequency" "SymptomFrequency",
    "painCharacter" "PainCharacter",
    "painScore" INTEGER,
    "durationMinutes" INTEGER,
    "onsetAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "intermittent" BOOLEAN NOT NULL DEFAULT false,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "suspectedTrigger" TEXT,
    "aggravatingFactors" TEXT,
    "relievingFactors" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomLogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthJournal" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "practitionerId" TEXT,
    "title" TEXT,
    "journal" TEXT NOT NULL,
    "mood" "HealthJournalMood",
    "sleepQuality" "SleepQuality",
    "sleepHours" DECIMAL(4,2),
    "energyLevel" "EnergyLevel",
    "stressLevel" INTEGER,
    "exerciseMinutes" INTEGER,
    "waterIntakeMl" INTEGER,
    "weightKg" DECIMAL(6,2),
    "temperature" DECIMAL(4,1),
    "bloodPressureSystolic" INTEGER,
    "bloodPressureDiastolic" INTEGER,
    "heartRate" INTEGER,
    "oxygenSaturation" DECIMAL(5,2),
    "respiratoryRate" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomTrigger" (
    "id" TEXT NOT NULL,
    "symptomLogId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "description" TEXT,
    "suspected" BOOLEAN NOT NULL DEFAULT true,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "exposureAt" TIMESTAMP(3),
    "occurredBeforeHours" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationEffect" (
    "id" TEXT NOT NULL,
    "symptomLogId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "effectiveness" INTEGER,
    "improved" BOOLEAN,
    "improvementPercentage" INTEGER,
    "startedMedicationAt" TIMESTAMP(3),
    "improvementObservedAt" TIMESTAMP(3),
    "stoppedMedicationAt" TIMESTAMP(3),
    "sideEffects" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIObservation" (
    "id" TEXT NOT NULL,
    "symptomLogId" TEXT NOT NULL,
    "aiAnalysisId" TEXT,
    "observation" TEXT NOT NULL,
    "confidenceScore" DECIMAL(5,2),
    "recommendation" TEXT,
    "requiresAttention" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalEpisode" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "appointmentId" TEXT,
    "practitionerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ClinicalEpisodeType" NOT NULL,
    "status" "ClinicalEpisodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "EpisodePriority" NOT NULL DEFAULT 'ROUTINE',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalEpisodeAttachment" (
    "id" TEXT NOT NULL,
    "clinicalEpisodeId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "type" "ClinicalEpisodeAttachmentType" NOT NULL,
    "description" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalEpisodeAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomLogAttachment" (
    "id" TEXT NOT NULL,
    "symptomLogId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "type" "SymptomAttachmentType" NOT NULL,
    "category" "SymptomAttachmentCategory",
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomLogAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthGoal" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "practitionerId" TEXT,
    "carePlanId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "HealthGoalCategory" NOT NULL,
    "priority" "HealthGoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "HealthGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetValue" DECIMAL(12,2),
    "currentValue" DECIMAL(12,2),
    "unit" TEXT,
    "targetDate" TIMESTAMP(3),
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthGoalProgress" (
    "id" TEXT NOT NULL,
    "healthGoalId" TEXT NOT NULL,
    "currentValue" DECIMAL(12,2),
    "progressPercent" DECIMAL(5,2),
    "status" "HealthGoalProgressStatus" NOT NULL,
    "notes" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthGoalProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "practitionerId" TEXT,
    "clinicalEpisodeId" TEXT,
    "assessmentType" "RiskAssessmentType" NOT NULL,
    "overallRisk" "RiskLevel" NOT NULL,
    "score" DECIMAL(6,2),
    "notes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessmentResult" (
    "id" TEXT NOT NULL,
    "riskAssessmentId" TEXT NOT NULL,
    "factor" TEXT NOT NULL,
    "value" TEXT,
    "score" DECIMAL(6,2),
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientBaseline" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "weightKg" DECIMAL(6,2),
    "heightCm" DECIMAL(6,2),
    "bmi" DECIMAL(5,2),
    "systolicPressure" INTEGER,
    "diastolicPressure" INTEGER,
    "restingHeartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" DECIMAL(5,2),
    "bodyTemperature" DECIMAL(4,1),
    "bloodGlucose" DECIMAL(6,2),
    "cholesterol" DECIMAL(6,2),
    "notes" TEXT,
    "establishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SymptomLog_clinicalEpisodeId_idx" ON "SymptomLog"("clinicalEpisodeId");

-- CreateIndex
CREATE INDEX "SymptomLog_status_idx" ON "SymptomLog"("status");

-- CreateIndex
CREATE INDEX "SymptomLog_overallSeverity_idx" ON "SymptomLog"("overallSeverity");

-- CreateIndex
CREATE INDEX "SymptomLog_startedAt_idx" ON "SymptomLog"("startedAt");

-- CreateIndex
CREATE INDEX "SymptomLogItem_symptomLogId_idx" ON "SymptomLogItem"("symptomLogId");

-- CreateIndex
CREATE INDEX "SymptomLogItem_aiSymptomId_idx" ON "SymptomLogItem"("aiSymptomId");

-- CreateIndex
CREATE INDEX "SymptomLogItem_severity_idx" ON "SymptomLogItem"("severity");

-- CreateIndex
CREATE INDEX "SymptomLogItem_progression_idx" ON "SymptomLogItem"("progression");

-- CreateIndex
CREATE INDEX "SymptomLogItem_onsetAt_idx" ON "SymptomLogItem"("onsetAt");

-- CreateIndex
CREATE INDEX "HealthJournal_patientId_idx" ON "HealthJournal"("patientId");

-- CreateIndex
CREATE INDEX "HealthJournal_encounterId_idx" ON "HealthJournal"("encounterId");

-- CreateIndex
CREATE INDEX "HealthJournal_practitionerId_idx" ON "HealthJournal"("practitionerId");

-- CreateIndex
CREATE INDEX "HealthJournal_createdAt_idx" ON "HealthJournal"("createdAt");

-- CreateIndex
CREATE INDEX "HealthJournal_mood_idx" ON "HealthJournal"("mood");

-- CreateIndex
CREATE INDEX "HealthJournal_energyLevel_idx" ON "HealthJournal"("energyLevel");

-- CreateIndex
CREATE INDEX "SymptomTrigger_symptomLogId_idx" ON "SymptomTrigger"("symptomLogId");

-- CreateIndex
CREATE INDEX "SymptomTrigger_trigger_idx" ON "SymptomTrigger"("trigger");

-- CreateIndex
CREATE INDEX "SymptomTrigger_suspected_idx" ON "SymptomTrigger"("suspected");

-- CreateIndex
CREATE INDEX "SymptomTrigger_confirmed_idx" ON "SymptomTrigger"("confirmed");

-- CreateIndex
CREATE INDEX "SymptomTrigger_exposureAt_idx" ON "SymptomTrigger"("exposureAt");

-- CreateIndex
CREATE INDEX "MedicationEffect_symptomLogId_idx" ON "MedicationEffect"("symptomLogId");

-- CreateIndex
CREATE INDEX "MedicationEffect_medicationId_idx" ON "MedicationEffect"("medicationId");

-- CreateIndex
CREATE INDEX "MedicationEffect_prescriptionId_idx" ON "MedicationEffect"("prescriptionId");

-- CreateIndex
CREATE INDEX "MedicationEffect_improved_idx" ON "MedicationEffect"("improved");

-- CreateIndex
CREATE INDEX "MedicationEffect_startedMedicationAt_idx" ON "MedicationEffect"("startedMedicationAt");

-- CreateIndex
CREATE INDEX "AIObservation_symptomLogId_idx" ON "AIObservation"("symptomLogId");

-- CreateIndex
CREATE INDEX "AIObservation_aiAnalysisId_idx" ON "AIObservation"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "AIObservation_requiresAttention_idx" ON "AIObservation"("requiresAttention");

-- CreateIndex
CREATE INDEX "AIObservation_reviewed_idx" ON "AIObservation"("reviewed");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_patientId_idx" ON "ClinicalEpisode"("patientId");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_encounterId_idx" ON "ClinicalEpisode"("encounterId");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_appointmentId_idx" ON "ClinicalEpisode"("appointmentId");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_practitionerId_idx" ON "ClinicalEpisode"("practitionerId");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_type_idx" ON "ClinicalEpisode"("type");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_status_idx" ON "ClinicalEpisode"("status");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_priority_idx" ON "ClinicalEpisode"("priority");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_startedAt_idx" ON "ClinicalEpisode"("startedAt");

-- CreateIndex
CREATE INDEX "ClinicalEpisodeAttachment_attachmentId_idx" ON "ClinicalEpisodeAttachment"("attachmentId");

-- CreateIndex
CREATE INDEX "ClinicalEpisodeAttachment_type_idx" ON "ClinicalEpisodeAttachment"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalEpisodeAttachment_clinicalEpisodeId_attachmentId_key" ON "ClinicalEpisodeAttachment"("clinicalEpisodeId", "attachmentId");

-- CreateIndex
CREATE INDEX "SymptomLogAttachment_attachmentId_idx" ON "SymptomLogAttachment"("attachmentId");

-- CreateIndex
CREATE INDEX "SymptomLogAttachment_type_idx" ON "SymptomLogAttachment"("type");

-- CreateIndex
CREATE INDEX "SymptomLogAttachment_category_idx" ON "SymptomLogAttachment"("category");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomLogAttachment_symptomLogId_attachmentId_key" ON "SymptomLogAttachment"("symptomLogId", "attachmentId");

-- CreateIndex
CREATE INDEX "HealthGoal_patientId_idx" ON "HealthGoal"("patientId");

-- CreateIndex
CREATE INDEX "HealthGoal_carePlanId_idx" ON "HealthGoal"("carePlanId");

-- CreateIndex
CREATE INDEX "HealthGoal_status_idx" ON "HealthGoal"("status");

-- CreateIndex
CREATE INDEX "HealthGoal_category_idx" ON "HealthGoal"("category");

-- CreateIndex
CREATE INDEX "HealthGoal_targetDate_idx" ON "HealthGoal"("targetDate");

-- CreateIndex
CREATE INDEX "HealthGoalProgress_healthGoalId_idx" ON "HealthGoalProgress"("healthGoalId");

-- CreateIndex
CREATE INDEX "HealthGoalProgress_status_idx" ON "HealthGoalProgress"("status");

-- CreateIndex
CREATE INDEX "HealthGoalProgress_measuredAt_idx" ON "HealthGoalProgress"("measuredAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_patientId_idx" ON "RiskAssessment"("patientId");

-- CreateIndex
CREATE INDEX "RiskAssessment_assessmentType_idx" ON "RiskAssessment"("assessmentType");

-- CreateIndex
CREATE INDEX "RiskAssessment_overallRisk_idx" ON "RiskAssessment"("overallRisk");

-- CreateIndex
CREATE INDEX "RiskAssessment_assessedAt_idx" ON "RiskAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "RiskAssessmentResult_riskAssessmentId_idx" ON "RiskAssessmentResult"("riskAssessmentId");

-- CreateIndex
CREATE INDEX "RiskAssessmentResult_factor_idx" ON "RiskAssessmentResult"("factor");

-- CreateIndex
CREATE UNIQUE INDEX "PatientBaseline_patientId_key" ON "PatientBaseline"("patientId");

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalVital" ADD CONSTRAINT "ClinicalVital_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingOrder" ADD CONSTRAINT "ImagingOrder_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingStudy" ADD CONSTRAINT "ImagingStudy_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomLog" ADD CONSTRAINT "SymptomLog_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomLogItem" ADD CONSTRAINT "SymptomLogItem_symptomLogId_fkey" FOREIGN KEY ("symptomLogId") REFERENCES "SymptomLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomLogItem" ADD CONSTRAINT "SymptomLogItem_aiSymptomId_fkey" FOREIGN KEY ("aiSymptomId") REFERENCES "AISymptom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthJournal" ADD CONSTRAINT "HealthJournal_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthJournal" ADD CONSTRAINT "HealthJournal_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthJournal" ADD CONSTRAINT "HealthJournal_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomTrigger" ADD CONSTRAINT "SymptomTrigger_symptomLogId_fkey" FOREIGN KEY ("symptomLogId") REFERENCES "SymptomLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationEffect" ADD CONSTRAINT "MedicationEffect_symptomLogId_fkey" FOREIGN KEY ("symptomLogId") REFERENCES "SymptomLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationEffect" ADD CONSTRAINT "MedicationEffect_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationEffect" ADD CONSTRAINT "MedicationEffect_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIObservation" ADD CONSTRAINT "AIObservation_symptomLogId_fkey" FOREIGN KEY ("symptomLogId") REFERENCES "SymptomLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIObservation" ADD CONSTRAINT "AIObservation_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "AIAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisodeAttachment" ADD CONSTRAINT "ClinicalEpisodeAttachment_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisodeAttachment" ADD CONSTRAINT "ClinicalEpisodeAttachment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomLogAttachment" ADD CONSTRAINT "SymptomLogAttachment_symptomLogId_fkey" FOREIGN KEY ("symptomLogId") REFERENCES "SymptomLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomLogAttachment" ADD CONSTRAINT "SymptomLogAttachment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGoal" ADD CONSTRAINT "HealthGoal_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGoal" ADD CONSTRAINT "HealthGoal_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGoal" ADD CONSTRAINT "HealthGoal_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGoalProgress" ADD CONSTRAINT "HealthGoalProgress_healthGoalId_fkey" FOREIGN KEY ("healthGoalId") REFERENCES "HealthGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_clinicalEpisodeId_fkey" FOREIGN KEY ("clinicalEpisodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessmentResult" ADD CONSTRAINT "RiskAssessmentResult_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "RiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBaseline" ADD CONSTRAINT "PatientBaseline_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
