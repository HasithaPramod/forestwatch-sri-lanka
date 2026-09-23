-- AlterTable
ALTER TABLE "officer_inspections" ADD COLUMN "clientUuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "officer_inspections_clientUuid_key" ON "officer_inspections"("clientUuid");
