-- CreateEnum
-- AlterTable
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_email_key" UNIQUE ("email");
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_phone_key" UNIQUE ("phone");

-- AlterTable
ALTER TABLE "companies" ADD CONSTRAINT "companies_name_key" UNIQUE ("name");
ALTER TABLE "companies" ADD CONSTRAINT "companies_email_key" UNIQUE ("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deals_pipelineId_stageId_idx" ON "deals"("pipelineId", "stageId");
CREATE INDEX IF NOT EXISTS "deals_companyId_idx" ON "deals"("companyId");
CREATE INDEX IF NOT EXISTS "deals_updatedAt_idx" ON "deals"("updatedAt");
CREATE INDEX IF NOT EXISTS "activities_dealId_createdAt_idx" ON "activities"("dealId", "createdAt");
