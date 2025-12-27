-- CreateExtension
-- Для полнотекстового поиска с триграммами
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
-- GIN триграмм индекс для поиска по названию сделки (contains с insensitive)
CREATE INDEX IF NOT EXISTS "deals_title_gin_idx" ON "deals" USING gin ("title" gin_trgm_ops);

-- CreateIndex
-- GIN триграмм индекс для поиска по имени контакта (contains с insensitive)
CREATE INDEX IF NOT EXISTS "contacts_fullname_gin_idx" ON "contacts" USING gin ("fullName" gin_trgm_ops);

-- CreateIndex
-- GIN индекс для массива тегов контактов (для оператора has)
CREATE INDEX IF NOT EXISTS "contacts_tags_gin_idx" ON "contacts" USING gin ("tags");

-- CreateIndex
-- GIN индекс для массива тегов сделок (для оператора has, если будет использоваться)
CREATE INDEX IF NOT EXISTS "deals_tags_gin_idx" ON "deals" USING gin ("tags");

