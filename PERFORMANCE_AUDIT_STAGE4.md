# Stage 4: SQL Level - Индексы

## Анализ текущих индексов

### Deal модель

**Текущие индексы:**
- `@@index([pipelineId])` ✅
- `@@index([stageId])` ✅
- `@@index([pipelineId, stageId])` ✅
- `@@index([assignedToId])` ✅
- `@@index([createdById])` ✅
- `@@index([contactId])` ✅
- `@@index([companyId])` ✅
- `@@index([createdAt])` ✅
- `@@index([updatedAt])` ✅
- `@@index([updatedAt, id])` ✅ - для курсорной пагинации
- `@@index([closedAt])` ✅

**WHERE условия в запросах:**
- `pipelineId` ✅
- `stageId` ✅
- `assignedToId` ✅
- `contactId` ✅
- `companyId` ✅
- `title: { contains: ..., mode: 'insensitive' }` ⚠️ - требуется GIN триграмм индекс
- `description: { contains: ..., mode: 'insensitive' }` ⚠️ - требуется GIN триграмм индекс
- `number: { startsWith: ... }` ❌ - нет индекса (но используется редко)
- `closedAt` ✅

**ORDER BY:**
- `updatedAt desc, id desc` ✅ - есть композитный индекс

### Task модель

**Текущие индексы:**
- `@@index([dealId])` ✅
- `@@index([contactId])` ✅
- `@@index([assignedToId])` ✅
- `@@index([status])` ✅
- `@@index([deadline])` ✅
- `@@index([type])` ✅
- `@@index([createdAt, id])` ✅ - для курсорной пагинации

**WHERE условия:**
- Все покрыты индексами ✅

**ORDER BY:**
- `createdAt desc, id desc` ✅ - есть композитный индекс

### Contact модель

**Текущие индексы:**
- `@@index([email])` ✅
- `@@index([phone])` ✅
- `@@index([companyName])` ✅
- `@@index([companyId])` ✅
- `@@index([createdAt])` ✅
- `@@index([fullName])` ✅ - B-tree индекс (не эффективен для contains)
- `@@index([email, phone])` ✅

**WHERE условия:**
- `fullName: { contains: ..., mode: 'insensitive' }` ⚠️ - требуется GIN триграмм индекс
- `email: { contains: ..., mode: 'insensitive' }` ⚠️ - B-tree достаточно (обычно точный поиск)
- `phone: { contains: ... }` ⚠️ - B-tree достаточно (обычно точный поиск)
- `companyId` ✅
- `tags: { has: ... }` ⚠️ - требуется GIN индекс для массива

**ORDER BY:**
- `createdAt desc` ✅

## Реализованные оптимизации

### Миграция: `20251227211518_add_search_indexes`

**Добавленные индексы:**

1. **GIN триграмм индекс на `deals.title`**
   - Зачем: ускоряет поиск `title: { contains: ..., mode: 'insensitive' }`
   - Ускоряет: поиск сделок по названию (самый частый поисковый запрос)
   - Риск: небольшое замедление INSERT/UPDATE на deals (GIN индексы больше чем B-tree)
   - Размер: зависит от длины title, обычно ~20-30% от размера данных
   - Rollback: `DROP INDEX IF EXISTS "deals_title_gin_idx";`

2. **GIN триграмм индекс на `contacts.fullName`**
   - Зачем: ускоряет поиск `fullName: { contains: ..., mode: 'insensitive' }`
   - Ускоряет: поиск контактов по имени
   - Риск: небольшое замедление INSERT/UPDATE на contacts
   - Rollback: `DROP INDEX IF NOT EXISTS "contacts_fullname_gin_idx";`

3. **GIN индекс на `contacts.tags` (массив)**
   - Зачем: ускоряет `tags: { has: ... }`
   - Ускоряет: фильтрацию контактов по тегам
   - Риск: минимальный (массивы не изменяются часто)
   - Rollback: `DROP INDEX IF NOT EXISTS "contacts_tags_gin_idx";`

4. **GIN индекс на `deals.tags` (массив)**
   - Зачем: подготовка для будущего использования фильтрации по тегам
   - Ускоряет: фильтрацию сделок по тегам (если будет реализовано)
   - Риск: минимальный
   - Rollback: `DROP INDEX IF NOT EXISTS "deals_tags_gin_idx";`

5. **Extension `pg_trgm`**
   - Зачем: необходим для триграмм индексов
   - Применяется: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

## Почему быстрее

### Триграмм индексы (GIN)

**Было:**
- `title: { contains: 'test', mode: 'insensitive' }` → Sequential scan (full table scan) или очень медленный B-tree scan
- Для каждой записи выполняется `LIKE '%test%'` без индекса
- Время: O(n) где n = количество записей

**Стало:**
- `title: { contains: 'test', mode: 'insensitive' }` → Index scan с триграммами
- PostgreSQL разбивает поисковый запрос на триграммы ('tes', 'est') и использует GIN индекс
- Время: O(log n + k) где k = количество совпадений

**Ускорение:** 10-100x для таблиц с >1000 записей

### GIN индексы для массивов

**Было:**
- `tags: { has: 'important' }` → Sequential scan с проверкой каждого массива
- Время: O(n)

**Стало:**
- `tags: { has: 'important' }` → Index scan через GIN индекс
- Время: O(log n + k)

**Ускорение:** 10-50x для таблиц с >1000 записей

## Риски

### Write Performance

1. **GIN индексы больше B-tree** (~20-30% от размера данных)
2. **INSERT/UPDATE медленнее** на 5-10% из-за поддержки GIN индекса
3. **Оптимистическая оценка:** для таблиц с <10K записей разница незаметна, для >100K может быть заметна

### Рекомендации по мониторингу

После применения миграции мониторить:
- Время выполнения INSERT/UPDATE на deals и contacts
- Размер индексов: `SELECT pg_size_pretty(pg_relation_size('deals_title_gin_idx'));`
- Использование индексов: `EXPLAIN ANALYZE` для поисковых запросов

## Откат (Rollback)

Если индексы вызывают проблемы:

```sql
-- Откатить индексы
DROP INDEX IF EXISTS "deals_title_gin_idx";
DROP INDEX IF EXISTS "contacts_fullname_gin_idx";
DROP INDEX IF EXISTS "contacts_tags_gin_idx";
DROP INDEX IF EXISTS "deals_tags_gin_idx";

-- Extension можно оставить (не влияет на производительность если не используется)
-- DROP EXTENSION IF EXISTS pg_trgm;
```

## Не реализовано (низкий приоритет)

1. **GIN триграмм индекс на `deals.description`**
   - Причина: description может быть очень большим (тексты), индекс будет тяжелым
   - Рекомендация: добавить только если поиск по description часто используется и медленный
   - Можно добавить частичный индекс только на короткие description: `CREATE INDEX ... WHERE length(description) < 500;`

2. **Композитные индексы для частых комбинаций**
   - `assignedToId + updatedAt` - только если часто фильтруют по assignedTo и сортируют по updatedAt
   - Текущие композитные индексы достаточны

3. **Индекс на `deals.number` для startsWith**
   - Не критично - используется только для генерации номера (1 запрос)
   - B-tree индекс на unique поле достаточно

## Результаты Stage 4

✅ **Реализовано:**
- 4 GIN индекса для поиска и фильтрации
- Extension pg_trgm для триграмм

✅ **Ожидаемый эффект:**
- Поиск сделок по названию: **10-100x быстрее**
- Поиск контактов по имени: **10-100x быстрее**
- Фильтрация по тегам: **10-50x быстрее**
- Небольшое замедление INSERT/UPDATE: **~5-10%**

✅ **Применение миграции:**
```bash
cd crm-backend
npx prisma migrate deploy
# или
npx prisma db execute --file prisma/migrations/20251227211518_add_search_indexes/migration.sql
```
