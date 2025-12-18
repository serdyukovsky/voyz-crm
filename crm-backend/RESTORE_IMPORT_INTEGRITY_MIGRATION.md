# Миграция: restore_import_integrity

## Изменения в schema.prisma

### 1. Unique Constraints (восстановлены для CSV импорта)

**Contact:**
- `@@unique([email])` - предотвращает дубликаты email
- `@@unique([phone])` - предотвращает дубликаты phone
- Примечание: для nullable полей @@unique позволяет множественные NULL, но обеспечивает уникальность не-NULL значений

**Company:**
- `name String @unique` - предотвращает дубликаты названий компаний
- `@@unique([email])` - предотвращает дубликаты email

### 2. Индексы (восстановлены для оптимизации)

**Deal:**
- `@@index([pipelineId, stageId])` - composite индекс для запросов по pipeline и stage
- `@@index([companyId])` - индекс для фильтрации по компании
- `@@index([updatedAt])` - индекс для сортировки по дате обновления

**Activity:**
- `@@index([dealId, createdAt])` - composite индекс для запросов по сделке с сортировкой по дате

## SQL для ручного применения (если миграция не применилась автоматически)

```sql
-- Unique constraints
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_email_key" UNIQUE ("email");
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_phone_key" UNIQUE ("phone");
ALTER TABLE "companies" ADD CONSTRAINT "companies_name_key" UNIQUE ("name");
ALTER TABLE "companies" ADD CONSTRAINT "companies_email_key" UNIQUE ("email");

-- Indexes
CREATE INDEX IF NOT EXISTS "deals_pipelineId_stageId_idx" ON "deals"("pipelineId", "stageId");
CREATE INDEX IF NOT EXISTS "deals_companyId_idx" ON "deals"("companyId");
CREATE INDEX IF NOT EXISTS "deals_updatedAt_idx" ON "deals"("updatedAt");
CREATE INDEX IF NOT EXISTS "activities_dealId_createdAt_idx" ON "activities"("dealId", "createdAt");
```

## Потенциальные конфликты

⚠️ **ВНИМАНИЕ:** Если в БД уже есть дубликаты email, phone или company.name, миграция упадет.

Перед применением проверьте:
```sql
-- Проверка дубликатов email в contacts
SELECT email, COUNT(*) FROM contacts WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1;

-- Проверка дубликатов phone в contacts
SELECT phone, COUNT(*) FROM contacts WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*) > 1;

-- Проверка дубликатов name в companies
SELECT name, COUNT(*) FROM companies GROUP BY name HAVING COUNT(*) > 1;

-- Проверка дубликатов email в companies
SELECT email, COUNT(*) FROM companies WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1;
```

Если найдены дубликаты, их нужно разрешить перед применением миграции.
