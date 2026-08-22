/*
  Warnings:

  - You are about to drop the column `reportedById` on the `SecurityIncident` table. All the data in the column will be lost.
  - Added the required column `type` to the `SecurityIncident` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `severity` on the `SecurityIncident` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SecurityIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityIncidentType" AS ENUM ('FAILED_LOGIN', 'ACCOUNT_LOCKED', 'PASSWORD_RESET', 'UNAUTHORIZED_ACCESS', 'TOKEN_REUSE', 'TOKEN_THEFT', 'SUSPICIOUS_ACTIVITY', 'DATA_EXPORT', 'PRIVILEGE_ESCALATION', 'SECURITY_POLICY_VIOLATION', 'OTHER');

-- DropForeignKey
ALTER TABLE "DataAccessConsent" DROP CONSTRAINT "DataAccessConsent_grantedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "DataAccessConsent" DROP CONSTRAINT "DataAccessConsent_patientId_fkey";

-- DropForeignKey
ALTER TABLE "SecurityIncident" DROP CONSTRAINT "SecurityIncident_reportedById_fkey";

-- AlterTable
ALTER TABLE "DataAccessConsent" ADD COLUMN     "canViewAIReports" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewAppointments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewHealthPassport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewImaging" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewInsurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewInvoices" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewLabResults" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewMedicalRecords" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewPrescriptions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewWearables" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "purpose" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MedicalRecord" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "bloodType" "BloodType",
ADD COLUMN     "chronicConditions" TEXT,
ADD COLUMN     "currentMedications" TEXT,
ADD COLUMN     "familyHistory" TEXT,
ADD COLUMN     "immunizationNotes" TEXT,
ADD COLUMN     "organDonor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pastMedicalHistory" TEXT,
ADD COLUMN     "socialHistory" TEXT,
ADD COLUMN     "surgicalHistory" TEXT;

-- AlterTable
ALTER TABLE "SecurityIncident" DROP COLUMN "reportedById",
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "practitionerId" TEXT,
ADD COLUMN     "type" "SecurityIncidentType" NOT NULL,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
DROP COLUMN "severity",
ADD COLUMN     "severity" "SecurityIncidentSeverity" NOT NULL;

-- CreateIndex
CREATE INDEX "DataAccessConsent_patientId_idx" ON "DataAccessConsent"("patientId");

-- CreateIndex
CREATE INDEX "DataAccessConsent_grantedToUserId_idx" ON "DataAccessConsent"("grantedToUserId");

-- CreateIndex
CREATE INDEX "DataAccessConsent_expiresAt_idx" ON "DataAccessConsent"("expiresAt");

-- CreateIndex
CREATE INDEX "SecurityIncident_userId_idx" ON "SecurityIncident"("userId");

-- CreateIndex
CREATE INDEX "SecurityIncident_practitionerId_idx" ON "SecurityIncident"("practitionerId");

-- CreateIndex
CREATE INDEX "SecurityIncident_severity_idx" ON "SecurityIncident"("severity");

-- CreateIndex
CREATE INDEX "SecurityIncident_type_idx" ON "SecurityIncident"("type");

-- CreateIndex
CREATE INDEX "SecurityIncident_createdAt_idx" ON "SecurityIncident"("createdAt");

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataAccessConsent" ADD CONSTRAINT "DataAccessConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataAccessConsent" ADD CONSTRAINT "DataAccessConsent_grantedToUserId_fkey" FOREIGN KEY ("grantedToUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
