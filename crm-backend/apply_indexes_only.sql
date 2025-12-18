-- Применение только недостающих индексов
-- Constraints уже существуют в БД

CREATE INDEX IF NOT EXISTS "deals_pipelineId_stageId_idx" ON "deals"("pipelineId", "stageId");
CREATE INDEX IF NOT EXISTS "deals_companyId_idx" ON "deals"("companyId");
CREATE INDEX IF NOT EXISTS "deals_updatedAt_idx" ON "deals"("updatedAt");
CREATE INDEX IF NOT EXISTS "activities_dealId_createdAt_idx" ON "activities"("dealId", "createdAt");
