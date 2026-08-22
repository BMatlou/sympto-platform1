/*
  Warnings:

  - You are about to drop the column `name` on the `AISymptom` table. All the data in the column will be lost.
  - The `category` column on the `Allergy` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `dialCode` on the `Country` table. All the data in the column will be lost.
  - You are about to drop the column `flagEmoji` on the `Country` table. All the data in the column will be lost.
  - You are about to drop the column `flagImageUrl` on the `Country` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Country` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `Country` table. All the data in the column will be lost.
  - You are about to drop the column `loincCode` on the `ImagingProcedure` table. All the data in the column will be lost.
  - You are about to drop the column `disease` on the `Immunization` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `InsuranceProvider` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `InsuranceProvider` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `LabDiscipline` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturer` on the `Medication` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `PatientAllergy` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosedAt` on the `PatientAllergy` table. All the data in the column will be lost.
  - The `severity` column on the `PatientAllergy` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `active` on the `PatientCondition` table. All the data in the column will be lost.
  - You are about to drop the column `primary` on the `PatientDiagnosis` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `PatientMedication` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `Procedure` table. All the data in the column will be lost.
  - You are about to drop the column `aiSymptomId` on the `SymptomLogItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[snomedCode]` on the table `Allergy` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[snomedCode]` on the table `Condition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[numericCode]` on the table `Country` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[icd10Code]` on the table `Diagnosis` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[snomedCode]` on the table `Diagnosis` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[snomedCode]` on the table `ImagingProcedure` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cvxCode]` on the table `Immunization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[loincCode]` on the table `LabTest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rxNormCode]` on the table `Medication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cptCode]` on the table `Procedure` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[snomedCode]` on the table `Procedure` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Specialty` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `VitalType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `symptomId` to the `AISymptom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Condition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Diagnosis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Immunization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Medication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PatientAllergy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PatientCondition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `healthPassportId` to the `PatientDiagnosis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PatientDiagnosis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PatientMedication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `healthPassportId` to the `PatientProcedure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PatientProcedure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Procedure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Specialty` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SpecimenContainer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SpecimenType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symptomId` to the `SymptomLogItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `VitalType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `VitalType` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "ProcedureStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'REMISSION', 'RECURRENT');

-- CreateEnum
CREATE TYPE "DiagnosisSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ImmunizationStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'REMISSION', 'RECURRENT');

-- CreateEnum
CREATE TYPE "ConditionSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- DropForeignKey
ALTER TABLE "PatientDiagnosis" DROP CONSTRAINT "PatientDiagnosis_encounterId_fkey";

-- DropForeignKey
ALTER TABLE "PatientProcedure" DROP CONSTRAINT "PatientProcedure_encounterId_fkey";

-- DropForeignKey
ALTER TABLE "SymptomLogItem" DROP CONSTRAINT "SymptomLogItem_aiSymptomId_fkey";

-- DropIndex
DROP INDEX "Condition_name_key";

-- DropIndex
DROP INDEX "Country_iso2_idx";

-- DropIndex
DROP INDEX "Country_iso3_idx";

-- DropIndex
DROP INDEX "Specialty_name_key";

-- DropIndex
DROP INDEX "SymptomLogItem_aiSymptomId_idx";

-- DropIndex
DROP INDEX "VitalType_name_key";

-- AlterTable
ALTER TABLE "AISymptom" DROP COLUMN "name",
ADD COLUMN     "symptomId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Allergy" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "common" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "severity" "AllergySeverity",
ADD COLUMN     "snomedCode" TEXT,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "Condition" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bodySystem" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "chronic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "communicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reportable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "snomedCode" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Country" DROP COLUMN "dialCode",
DROP COLUMN "flagEmoji",
DROP COLUMN "flagImageUrl",
DROP COLUMN "isActive",
DROP COLUMN "timezone",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "phoneCode" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subregion" TEXT;

-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bodySystem" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "chronic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "communicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reportable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "snomedCode" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ImagingProcedure" DROP COLUMN "loincCode",
ADD COLUMN     "bodyPart" TEXT,
ADD COLUMN     "contrastRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preparationInstructions" TEXT,
ADD COLUMN     "radiationDoseApplicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "snomedCode" TEXT;

-- AlterTable
ALTER TABLE "Immunization" DROP COLUMN "disease",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "cvxCode" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "diseaseProtected" TEXT,
ADD COLUMN     "dosageSchedule" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "InsuranceProvider" DROP COLUMN "address",
DROP COLUMN "type",
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shortName" TEXT;

-- AlterTable
ALTER TABLE "LabCategory" ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "LabDiscipline" DROP COLUMN "type",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "LabMethod" ADD COLUMN     "methodology" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "LabPanel" ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "LabTest" ADD COLUMN     "fastingRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "specimenRequired" TEXT,
ADD COLUMN     "turnaroundHours" INTEGER;

-- AlterTable
ALTER TABLE "LabUnit" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Medication" DROP COLUMN "manufacturer",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "controlled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "prescriptionRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "route" TEXT,
ADD COLUMN     "rxNormCode" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PatientAllergy" DROP COLUMN "active",
DROP COLUMN "diagnosedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastReaction" TIMESTAMP(3),
ADD COLUMN     "onsetDate" TIMESTAMP(3),
ADD COLUMN     "reactionNotes" TEXT,
ADD COLUMN     "status" "AllergyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedBy" TEXT,
DROP COLUMN "severity",
ADD COLUMN     "severity" "AllergySeverity" NOT NULL DEFAULT 'MILD';

-- AlterTable
ALTER TABLE "PatientCondition" DROP COLUMN "active",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "diagnosedBy" TEXT,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "primaryCondition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "severity" "ConditionSeverity",
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "status" "ConditionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "treatmentPlan" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PatientDiagnosis" DROP COLUMN "primary",
ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "diagnosedAt" TIMESTAMP(3),
ADD COLUMN     "diagnosedBy" TEXT,
ADD COLUMN     "healthPassportId" TEXT NOT NULL,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "primaryDiagnosis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "severity" "DiagnosisSeverity",
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "status" "DiagnosisStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "treatmentPlan" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "encounterId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PatientMedication" DROP COLUMN "active",
ADD COLUMN     "adherencePercentage" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "effectiveness" TEXT,
ADD COLUMN     "indication" TEXT,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "missedDoses" INTEGER,
ADD COLUMN     "ongoing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sideEffects" TEXT,
ADD COLUMN     "status" "MedicationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PatientProcedure" ADD COLUMN     "complications" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "facility" TEXT,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "healthPassportId" TEXT NOT NULL,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "performer" TEXT,
ADD COLUMN     "status" "ProcedureStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "encounterId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Procedure" DROP COLUMN "code",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bodySystem" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "cptCode" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invasive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "snomedCode" TEXT,
ADD COLUMN     "surgical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Specialty" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SpecimenContainer" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SpecimenType" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SymptomLogItem" DROP COLUMN "aiSymptomId",
ADD COLUMN     "aISymptomId" TEXT,
ADD COLUMN     "symptomId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "VitalType" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "decimalPlaces" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "normalMax" DOUBLE PRECISION,
ADD COLUMN     "normalMin" DOUBLE PRECISION,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "HealthJournalSettings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "trackSymptoms" BOOLEAN NOT NULL DEFAULT true,
    "trackMood" BOOLEAN NOT NULL DEFAULT true,
    "trackSleep" BOOLEAN NOT NULL DEFAULT true,
    "trackWater" BOOLEAN NOT NULL DEFAULT false,
    "trackNutrition" BOOLEAN NOT NULL DEFAULT false,
    "trackExercise" BOOLEAN NOT NULL DEFAULT false,
    "trackMedications" BOOLEAN NOT NULL DEFAULT true,
    "trackVitals" BOOLEAN NOT NULL DEFAULT false,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "morningReminder" TEXT,
    "afternoonReminder" TEXT,
    "eveningReminder" TEXT,
    "weeklySummary" BOOLEAN NOT NULL DEFAULT true,
    "monthlySummary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthJournalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Symptom" (
    "id" TEXT NOT NULL,
    "snomedCode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "bodySystem" TEXT,
    "common" BOOLEAN NOT NULL DEFAULT false,
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Symptom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthJournalSettings_patientId_key" ON "HealthJournalSettings"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Symptom_snomedCode_key" ON "Symptom"("snomedCode");

-- CreateIndex
CREATE INDEX "Symptom_name_idx" ON "Symptom"("name");

-- CreateIndex
CREATE INDEX "Symptom_category_idx" ON "Symptom"("category");

-- CreateIndex
CREATE INDEX "Symptom_bodySystem_idx" ON "Symptom"("bodySystem");

-- CreateIndex
CREATE INDEX "Symptom_common_idx" ON "Symptom"("common");

-- CreateIndex
CREATE INDEX "AISymptom_assessmentId_idx" ON "AISymptom"("assessmentId");

-- CreateIndex
CREATE INDEX "AISymptom_symptomId_idx" ON "AISymptom"("symptomId");

-- CreateIndex
CREATE UNIQUE INDEX "Allergy_snomedCode_key" ON "Allergy"("snomedCode");

-- CreateIndex
CREATE INDEX "Allergy_name_idx" ON "Allergy"("name");

-- CreateIndex
CREATE INDEX "Allergy_category_idx" ON "Allergy"("category");

-- CreateIndex
CREATE INDEX "Allergy_common_idx" ON "Allergy"("common");

-- CreateIndex
CREATE INDEX "Allergy_active_idx" ON "Allergy"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Condition_snomedCode_key" ON "Condition"("snomedCode");

-- CreateIndex
CREATE INDEX "Condition_name_idx" ON "Condition"("name");

-- CreateIndex
CREATE INDEX "Condition_category_idx" ON "Condition"("category");

-- CreateIndex
CREATE INDEX "Condition_bodySystem_idx" ON "Condition"("bodySystem");

-- CreateIndex
CREATE INDEX "Condition_chronic_idx" ON "Condition"("chronic");

-- CreateIndex
CREATE INDEX "Condition_active_idx" ON "Condition"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Country_numericCode_key" ON "Country"("numericCode");

-- CreateIndex
CREATE INDEX "Country_continent_idx" ON "Country"("continent");

-- CreateIndex
CREATE INDEX "Country_region_idx" ON "Country"("region");

-- CreateIndex
CREATE INDEX "Country_active_idx" ON "Country"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Diagnosis_icd10Code_key" ON "Diagnosis"("icd10Code");

-- CreateIndex
CREATE UNIQUE INDEX "Diagnosis_snomedCode_key" ON "Diagnosis"("snomedCode");

-- CreateIndex
CREATE INDEX "Diagnosis_name_idx" ON "Diagnosis"("name");

-- CreateIndex
CREATE INDEX "Diagnosis_category_idx" ON "Diagnosis"("category");

-- CreateIndex
CREATE INDEX "Diagnosis_bodySystem_idx" ON "Diagnosis"("bodySystem");

-- CreateIndex
CREATE INDEX "Diagnosis_active_idx" ON "Diagnosis"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ImagingProcedure_snomedCode_key" ON "ImagingProcedure"("snomedCode");

-- CreateIndex
CREATE INDEX "ImagingProcedure_name_idx" ON "ImagingProcedure"("name");

-- CreateIndex
CREATE INDEX "ImagingProcedure_modality_idx" ON "ImagingProcedure"("modality");

-- CreateIndex
CREATE INDEX "ImagingProcedure_bodyPart_idx" ON "ImagingProcedure"("bodyPart");

-- CreateIndex
CREATE INDEX "ImagingProcedure_active_idx" ON "ImagingProcedure"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Immunization_cvxCode_key" ON "Immunization"("cvxCode");

-- CreateIndex
CREATE INDEX "Immunization_name_idx" ON "Immunization"("name");

-- CreateIndex
CREATE INDEX "Immunization_category_idx" ON "Immunization"("category");

-- CreateIndex
CREATE INDEX "Immunization_diseaseProtected_idx" ON "Immunization"("diseaseProtected");

-- CreateIndex
CREATE INDEX "Immunization_active_idx" ON "Immunization"("active");

-- CreateIndex
CREATE INDEX "InsuranceProvider_name_idx" ON "InsuranceProvider"("name");

-- CreateIndex
CREATE INDEX "InsuranceProvider_countryId_idx" ON "InsuranceProvider"("countryId");

-- CreateIndex
CREATE INDEX "InsuranceProvider_active_idx" ON "InsuranceProvider"("active");

-- CreateIndex
CREATE INDEX "LabCategory_disciplineId_idx" ON "LabCategory"("disciplineId");

-- CreateIndex
CREATE INDEX "LabCategory_name_idx" ON "LabCategory"("name");

-- CreateIndex
CREATE INDEX "LabCategory_active_idx" ON "LabCategory"("active");

-- CreateIndex
CREATE INDEX "LabDiscipline_name_idx" ON "LabDiscipline"("name");

-- CreateIndex
CREATE INDEX "LabDiscipline_category_idx" ON "LabDiscipline"("category");

-- CreateIndex
CREATE INDEX "LabDiscipline_active_idx" ON "LabDiscipline"("active");

-- CreateIndex
CREATE INDEX "LabMethod_name_idx" ON "LabMethod"("name");

-- CreateIndex
CREATE INDEX "LabMethod_active_idx" ON "LabMethod"("active");

-- CreateIndex
CREATE INDEX "LabPanel_name_idx" ON "LabPanel"("name");

-- CreateIndex
CREATE INDEX "LabPanel_active_idx" ON "LabPanel"("active");

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_loincCode_key" ON "LabTest"("loincCode");

-- CreateIndex
CREATE INDEX "LabTest_name_idx" ON "LabTest"("name");

-- CreateIndex
CREATE INDEX "LabTest_loincCode_idx" ON "LabTest"("loincCode");

-- CreateIndex
CREATE INDEX "LabTest_categoryId_idx" ON "LabTest"("categoryId");

-- CreateIndex
CREATE INDEX "LabTest_active_idx" ON "LabTest"("active");

-- CreateIndex
CREATE INDEX "LabUnit_symbol_idx" ON "LabUnit"("symbol");

-- CreateIndex
CREATE INDEX "LabUnit_active_idx" ON "LabUnit"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_rxNormCode_key" ON "Medication"("rxNormCode");

-- CreateIndex
CREATE INDEX "Medication_name_idx" ON "Medication"("name");

-- CreateIndex
CREATE INDEX "Medication_genericName_idx" ON "Medication"("genericName");

-- CreateIndex
CREATE INDEX "Medication_brandName_idx" ON "Medication"("brandName");

-- CreateIndex
CREATE INDEX "Medication_category_idx" ON "Medication"("category");

-- CreateIndex
CREATE INDEX "Medication_active_idx" ON "Medication"("active");

-- CreateIndex
CREATE INDEX "PatientAllergy_healthPassportId_idx" ON "PatientAllergy"("healthPassportId");

-- CreateIndex
CREATE INDEX "PatientAllergy_allergyId_idx" ON "PatientAllergy"("allergyId");

-- CreateIndex
CREATE INDEX "PatientAllergy_severity_idx" ON "PatientAllergy"("severity");

-- CreateIndex
CREATE INDEX "PatientAllergy_status_idx" ON "PatientAllergy"("status");

-- CreateIndex
CREATE INDEX "PatientCondition_healthPassportId_idx" ON "PatientCondition"("healthPassportId");

-- CreateIndex
CREATE INDEX "PatientCondition_conditionId_idx" ON "PatientCondition"("conditionId");

-- CreateIndex
CREATE INDEX "PatientCondition_status_idx" ON "PatientCondition"("status");

-- CreateIndex
CREATE INDEX "PatientCondition_severity_idx" ON "PatientCondition"("severity");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_healthPassportId_idx" ON "PatientDiagnosis"("healthPassportId");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_diagnosisId_idx" ON "PatientDiagnosis"("diagnosisId");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_encounterId_idx" ON "PatientDiagnosis"("encounterId");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_status_idx" ON "PatientDiagnosis"("status");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_severity_idx" ON "PatientDiagnosis"("severity");

-- CreateIndex
CREATE INDEX "PatientMedication_healthPassportId_idx" ON "PatientMedication"("healthPassportId");

-- CreateIndex
CREATE INDEX "PatientMedication_medicationId_idx" ON "PatientMedication"("medicationId");

-- CreateIndex
CREATE INDEX "PatientMedication_status_idx" ON "PatientMedication"("status");

-- CreateIndex
CREATE INDEX "PatientMedication_ongoing_idx" ON "PatientMedication"("ongoing");

-- CreateIndex
CREATE INDEX "PatientProcedure_healthPassportId_idx" ON "PatientProcedure"("healthPassportId");

-- CreateIndex
CREATE INDEX "PatientProcedure_procedureId_idx" ON "PatientProcedure"("procedureId");

-- CreateIndex
CREATE INDEX "PatientProcedure_encounterId_idx" ON "PatientProcedure"("encounterId");

-- CreateIndex
CREATE INDEX "PatientProcedure_status_idx" ON "PatientProcedure"("status");

-- CreateIndex
CREATE INDEX "PatientProcedure_performedAt_idx" ON "PatientProcedure"("performedAt");

-- CreateIndex
CREATE INDEX "Procedure_name_idx" ON "Procedure"("name");

-- CreateIndex
CREATE INDEX "Procedure_category_idx" ON "Procedure"("category");

-- CreateIndex
CREATE INDEX "Procedure_bodySystem_idx" ON "Procedure"("bodySystem");

-- CreateIndex
CREATE INDEX "Procedure_surgical_idx" ON "Procedure"("surgical");

-- CreateIndex
CREATE INDEX "Procedure_active_idx" ON "Procedure"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_cptCode_key" ON "Procedure"("cptCode");

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_snomedCode_key" ON "Procedure"("snomedCode");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_code_key" ON "Specialty"("code");

-- CreateIndex
CREATE INDEX "Specialty_name_idx" ON "Specialty"("name");

-- CreateIndex
CREATE INDEX "Specialty_category_idx" ON "Specialty"("category");

-- CreateIndex
CREATE INDEX "Specialty_active_idx" ON "Specialty"("active");

-- CreateIndex
CREATE INDEX "SpecimenContainer_name_idx" ON "SpecimenContainer"("name");

-- CreateIndex
CREATE INDEX "SpecimenType_name_idx" ON "SpecimenType"("name");

-- CreateIndex
CREATE INDEX "SymptomLogItem_symptomId_idx" ON "SymptomLogItem"("symptomId");

-- CreateIndex
CREATE UNIQUE INDEX "VitalType_code_key" ON "VitalType"("code");

-- CreateIndex
CREATE INDEX "VitalType_name_idx" ON "VitalType"("name");

-- CreateIndex
CREATE INDEX "VitalType_category_idx" ON "VitalType"("category");

-- CreateIndex
CREATE INDEX "VitalType_active_idx" ON "VitalType"("active");

-- AddForeignKey
ALTER TABLE "HealthJournalSettings" ADD CONSTRAINT "HealthJournalSettings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_healthPassportId_fkey" FOREIGN KEY ("healthPassportId") REFERENCES "HealthPassport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProcedure" ADD CONSTRAINT "PatientProcedure_healthPassportId_fkey" FOREIGN KEY ("healthPassportId") REFERENCES "HealthPassport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProcedure" ADD CONSTRAINT "PatientProcedure_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceProvider" ADD CONSTRAINT "InsuranceProvider_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISymptom" ADD CONSTRAINT "AISymptom_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "Symptom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomLogItem" ADD CONSTRAINT "SymptomLogItem_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "Symptom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomLogItem" ADD CONSTRAINT "SymptomLogItem_aISymptomId_fkey" FOREIGN KEY ("aISymptomId") REFERENCES "AISymptom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
