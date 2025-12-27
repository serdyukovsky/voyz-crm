-- CreateIndex
-- Composite index for cursor-based pagination on Deal
CREATE INDEX IF NOT EXISTS "deals_updatedAt_id_idx" ON "deals"("updatedAt", "id");

-- CreateIndex
-- Composite index for cursor-based pagination on Task
CREATE INDEX IF NOT EXISTS "tasks_createdAt_id_idx" ON "tasks"("createdAt", "id");
