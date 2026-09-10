CREATE TABLE "SmartFileShareSession" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartFileShareSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmartFileShareSession_qrToken_key" ON "SmartFileShareSession"("qrToken");
CREATE UNIQUE INDEX "SmartFileShareSession_shortCode_key" ON "SmartFileShareSession"("shortCode");
