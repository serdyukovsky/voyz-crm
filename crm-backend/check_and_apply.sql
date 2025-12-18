-- Проверка и применение недостающих constraints и индексов

-- Проверка существующих constraints
DO $$
BEGIN
    -- Contact.email unique
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contacts_email_key'
    ) THEN
        ALTER TABLE "contacts" ADD CONSTRAINT "contacts_email_key" UNIQUE ("email");
        RAISE NOTICE 'Added contacts_email_key constraint';
    ELSE
        RAISE NOTICE 'contacts_email_key constraint already exists';
    END IF;

    -- Contact.phone unique
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contacts_phone_key'
    ) THEN
        ALTER TABLE "contacts" ADD CONSTRAINT "contacts_phone_key" UNIQUE ("phone");
        RAISE NOTICE 'Added contacts_phone_key constraint';
    ELSE
        RAISE NOTICE 'contacts_phone_key constraint already exists';
    END IF;

    -- Company.name unique
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'companies_name_key'
    ) THEN
        ALTER TABLE "companies" ADD CONSTRAINT "companies_name_key" UNIQUE ("name");
        RAISE NOTICE 'Added companies_name_key constraint';
    ELSE
        RAISE NOTICE 'companies_name_key constraint already exists';
    END IF;

    -- Company.email unique
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'companies_email_key'
    ) THEN
        ALTER TABLE "companies" ADD CONSTRAINT "companies_email_key" UNIQUE ("email");
        RAISE NOTICE 'Added companies_email_key constraint';
    ELSE
        RAISE NOTICE 'companies_email_key constraint already exists';
    END IF;
END $$;

-- Создание индексов (IF NOT EXISTS поддерживается для индексов)
CREATE INDEX IF NOT EXISTS "deals_pipelineId_stageId_idx" ON "deals"("pipelineId", "stageId");
CREATE INDEX IF NOT EXISTS "deals_companyId_idx" ON "deals"("companyId");
CREATE INDEX IF NOT EXISTS "deals_updatedAt_idx" ON "deals"("updatedAt");
CREATE INDEX IF NOT EXISTS "activities_dealId_createdAt_idx" ON "activities"("dealId", "createdAt");
