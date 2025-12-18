-- AlterTable
-- Add unique constraint on contacts.email
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_email_key" ON "contacts"("email") WHERE "email" IS NOT NULL;

-- AlterTable
-- Add unique constraint on contacts.phone
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_phone_key" ON "contacts"("phone") WHERE "phone" IS NOT NULL;

-- AlterTable
-- Add unique constraint on companies.name
CREATE UNIQUE INDEX IF NOT EXISTS "companies_name_key" ON "companies"("name");

-- AlterTable
-- Add unique constraint on companies.email
CREATE UNIQUE INDEX IF NOT EXISTS "companies_email_key" ON "companies"("email") WHERE "email" IS NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "companies_phone_idx" ON "companies"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deals_companyId_idx" ON "deals"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deals_updatedAt_idx" ON "deals"("updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deals_pipelineId_stageId_idx" ON "deals"("pipelineId", "stageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_createdById_idx" ON "tasks"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_createdAt_idx" ON "tasks"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activities_dealId_createdAt_idx" ON "activities"("dealId", "createdAt");

