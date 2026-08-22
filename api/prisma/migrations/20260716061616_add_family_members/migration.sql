-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('MALE', 'FEMALE', 'INTERSEX');

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "ownerPatientId" TEXT NOT NULL,
    "memberPatientId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "canViewRecords" BOOLEAN NOT NULL DEFAULT true,
    "canManageAppointments" BOOLEAN NOT NULL DEFAULT false,
    "canReceiveAlerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyMember_ownerPatientId_idx" ON "FamilyMember"("ownerPatientId");

-- CreateIndex
CREATE INDEX "FamilyMember_memberPatientId_idx" ON "FamilyMember"("memberPatientId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_ownerPatientId_memberPatientId_key" ON "FamilyMember"("ownerPatientId", "memberPatientId");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_ownerPatientId_fkey" FOREIGN KEY ("ownerPatientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_memberPatientId_fkey" FOREIGN KEY ("memberPatientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
