/*
  Warnings:

  - You are about to drop the column `currency` on the `Country` table. All the data in the column will be lost.
  - You are about to drop the column `profilePhotoUrl` on the `Person` table. All the data in the column will be lost.
  - Made the column `dialCode` on table `Country` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'BILLING', 'SHIPPING', 'TEMPORARY', 'PRACTICE', 'HOSPITAL', 'EMERGENCY', 'OTHER');

-- AlterTable
ALTER TABLE "Country" DROP COLUMN "currency",
ADD COLUMN     "continent" TEXT,
ADD COLUMN     "currencyCode" TEXT,
ADD COLUMN     "currencyName" TEXT,
ADD COLUMN     "flagEmoji" TEXT,
ADD COLUMN     "flagImageUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "numericCode" TEXT,
ADD COLUMN     "officialName" TEXT,
ALTER COLUMN "dialCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "Person" DROP COLUMN "profilePhotoUrl";

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "suburb" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "countryId" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonAddress" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonAddress_personId_idx" ON "PersonAddress"("personId");

-- CreateIndex
CREATE INDEX "PersonAddress_addressId_idx" ON "PersonAddress"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonAddress_personId_addressId_type_key" ON "PersonAddress"("personId", "addressId", "type");

-- CreateIndex
CREATE INDEX "Country_iso3_idx" ON "Country"("iso3");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAddress" ADD CONSTRAINT "PersonAddress_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAddress" ADD CONSTRAINT "PersonAddress_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;
