# ЭТАП 4: SQL УРОВЕНЬ (ИНДЕКСЫ И ЗАПРОСЫ)

## ТЕКУЩИЕ ИНДЕКСЫ

### Deal Model:

```prisma
model Deal {
  // ...
  
  @@index([pipelineId])
  @@index([stageId])
  @@index([pipelineId, stageId])
  @@index([assignedToId])
  @@index([createdById])
  @@index([contactId])
  @@index([companyId])
  @@index([createdAt])
  @@index([updatedAt])
  @@map("deals")
}
```

### Task Model:

```prisma
model Task {
  // ...
  
  @@index([dealId])
  @@index([contactId])
  @@index([assignedToId])
  @@index([status])
  @@index([deadline])
  @@index([type])
  @@map("tasks")
}
```

---

## АНАЛИЗ ИСПОЛЬЗОВАНИЯ ИНДЕКСОВ

### ✅ Хорошие индексы (используются):

1. **`@@index([pipelineId])`** - для фильтрации по pipeline
2. **`@@index([stageId])`** - для фильтрации по stage
3. **`@@index([pipelineId, stageId])`** - для комбинированной фильтрации
4. **`@@index([assignedToId])`** - для фильтрации по назначенному
5. **`@@index([contactId])`** - для фильтрации по контакту
6. **`@@index([companyId])`** - для фильтрации по компании

### ❌ Проблемные индексы:

1. **`@@index([createdAt])`** - используется редко (только для истории)
2. **`@@index([updatedAt])`** - используется для сортировки, но не достаточно для пагинации

---

## КРИТИЧЕСКАЯ ПРОБЛЕМА: СОРТИРОВКА БЕЗ ОПТИМАЛЬНОГО ИНДЕКСА

### Текущая ситуация:

```typescript
orderBy: { updatedAt: 'desc' }
```

**Индекс:** `@@index([updatedAt])`

**Проблема:**
- Для простой сортировки индекс работает
- Но для **cursor-based пагинации** нужен составной индекс `(updatedAt, id)`

**SQL без пагинации:**
```sql
SELECT * FROM deals 
WHERE pipelineId = 'xxx'
ORDER BY updatedAt DESC;
-- ✅ Использует индекс [updatedAt]
```

**SQL с cursor-based пагинацией:**
```sql
SELECT * FROM deals 
WHERE pipelineId = 'xxx'
  AND (updatedAt < '2024-01-01' OR (updatedAt = '2024-01-01' AND id < 'deal-id'))
ORDER BY updatedAt DESC, id DESC;
-- ❌ НЕ может использовать индекс [updatedAt] эффективно
-- Нужен составной индекс [updatedAt, id]
```

---

## РЕШЕНИЕ: СОСТАВНОЙ ИНДЕКС ДЛЯ ПАГИНАЦИИ

### Для Deal:

```prisma
model Deal {
  // ...
  
  @@index([updatedAt, id]) // для cursor-based пагинации
  @@index([pipelineId, updatedAt, id]) // для фильтрации + пагинации
  @@map("deals")
}
```

**Почему нужен:**
1. `ORDER BY updatedAt DESC, id DESC` использует индекс
2. `WHERE updatedAt < X AND id < Y` использует индекс
3. Комбинация `WHERE pipelineId = X AND updatedAt < Y AND id < Z` использует индекс

**Альтернатива:** Только `[updatedAt, id]` может быть достаточно, если фильтрация по pipelineId редкая.

### Для Task:

```prisma
model Task {
  // ...
  
  @@index([createdAt, id]) // для cursor-based пагинации
  @@map("tasks")
}
```

---

## ПРОБЛЕМА: ПОИСК ПО ТЕКСТУ БЕЗ ИНДЕКСА

### Текущая ситуация:

```typescript
if (filters?.search) {
  where.OR = [
    { title: { contains: filters.search, mode: 'insensitive' } },
    { description: { contains: filters.search, mode: 'insensitive' } },
  ];
}
```

**SQL:**
```sql
WHERE title ILIKE '%search%' 
   OR description ILIKE '%search%'
```

**Проблема:**
- `ILIKE '%...%'` не может использовать обычный индекс
- Полное сканирование таблицы (full table scan)
- При 10000+ записей = очень медленно

---

## РЕШЕНИЕ: FULL-TEXT SEARCH

### Вариант 1: PostgreSQL Full-Text Search (GIN индекс)

```prisma
// В миграции SQL
CREATE INDEX deals_title_search_idx ON deals USING GIN (to_tsvector('english', title));
CREATE INDEX deals_description_search_idx ON deals USING GIN (to_tsvector('english', description));
```

**Использование:**
```typescript
// В Prisma нужно использовать raw query
const deals = await this.prisma.$queryRaw`
  SELECT * FROM deals
  WHERE to_tsvector('english', title) @@ to_tsquery('english', ${searchTerm})
     OR to_tsvector('english', description) @@ to_tsquery('english', ${searchTerm})
  ORDER BY updatedAt DESC
`;
```

**Плюсы:**
- Очень быстро
- Поддержка русского языка
- Ранжирование результатов

**Минусы:**
- Сложнее реализация
- Требует raw SQL

---

### Вариант 2: Ограничить поиск (быстрое решение)

```typescript
if (filters?.search && filters.search.length >= 3) {
  // Только начало слова (может использовать индекс)
  const searchPattern = `${filters.search}%`;
  where.OR = [
    { title: { startsWith: searchPattern, mode: 'insensitive' } },
    // Опционально: description только если title не нашли
  ];
}
```

**SQL:**
```sql
WHERE title ILIKE 'search%' -- может использовать индекс если он есть
```

**Индекс:**
```prisma
@@index([title]) // для startsWith
```

**Плюсы:**
- Простая реализация
- Работает с существующим кодом

**Минусы:**
- Только поиск с начала слова
- Не ищет в середине текста

---

### Вариант 3: Триграммы (PostgreSQL pg_trgm)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX deals_title_trgm_idx ON deals USING GIN (title gin_trgm_ops);
CREATE INDEX deals_description_trgm_idx ON deals USING GIN (description gin_trgm_ops);
```

**Использование:**
```typescript
// Raw query
const deals = await this.prisma.$queryRaw`
  SELECT * FROM deals
  WHERE title ILIKE ${`%${searchTerm}%`}
     OR description ILIKE ${`%${searchTerm}%`}
  ORDER BY similarity(title, ${searchTerm}) DESC
  LIMIT 100
`;
```

**Плюсы:**
- Работает с ILIKE
- Поддержка похожести (similarity)
- Не требует изменений в коде

**Минусы:**
- Требует расширение pg_trgm
- Больше места на диске

---

## АНАЛИЗ ИСПОЛЬЗОВАНИЯ ИНДЕКСОВ В ЗАПРОСАХ

### Запрос 1: findAll() для deals

```typescript
where: {
  pipelineId: 'xxx',
  stageId: 'yyy',
}
orderBy: { updatedAt: 'desc' }
```

**Текущие индексы:**
- `[pipelineId]` ✅
- `[stageId]` ✅
- `[pipelineId, stageId]` ✅
- `[updatedAt]` ✅ (для сортировки)

**Проблема:**
- Для cursor-based пагинации нужен `[updatedAt, id]`
- Для фильтрации + пагинации идеален `[pipelineId, updatedAt, id]`

---

### Запрос 2: Поиск по тексту

```typescript
where: {
  OR: [
    { title: { contains: 'search', mode: 'insensitive' } },
    { description: { contains: 'search', mode: 'insensitive' } },
  ]
}
```

**Текущие индексы:**
- ❌ Нет индекса для полнотекстового поиска

**Проблема:**
- Full table scan при поиске
- Медленно на больших таблицах

---

## РЕКОМЕНДУЕМЫЕ ИНДЕКСЫ

### Критичные (обязательно):

1. **`@@index([updatedAt, id])` на Deal**
   - Для cursor-based пагинации
   - Улучшение: 10-100x при пагинации

2. **`@@index([createdAt, id])` на Task**
   - Аналогично для tasks

### Желательные:

3. **`@@index([pipelineId, updatedAt, id])` на Deal**
   - Если фильтрация по pipelineId частая
   - Улучшение: 2-5x при фильтрации + пагинации

4. **Full-text search индекс на Deal.title и Deal.description**
   - Если поиск используется часто
   - Улучшение: 10-100x при поиске

### Опциональные (удалить если не используются):

5. **`@@index([createdAt])` на Deal**
   - Используется редко
   - Можно удалить (экономия места)

---

## ПЛАН ДОБАВЛЕНИЯ ИНДЕКСОВ

### Шаг 1: Добавить составные индексы для пагинации

```prisma
model Deal {
  // ...
  
  @@index([updatedAt, id]) // для cursor-based пагинации
  @@index([pipelineId, updatedAt, id]) // опционально, если фильтрация частая
}

model Task {
  // ...
  
  @@index([createdAt, id]) // для cursor-based пагинации
}
```

**Миграция:**
```bash
npx prisma migrate dev --name add_pagination_indexes
```

**Время создания:** ~10-30 секунд на 10000 записей
**Размер индекса:** ~5-10% от размера таблицы

---

### Шаг 2: Добавить full-text search (если поиск используется часто)

**SQL миграция:**
```sql
-- Для английского текста
CREATE INDEX deals_title_fts_idx ON deals USING GIN (to_tsvector('english', title));
CREATE INDEX deals_description_fts_idx ON deals USING GIN (to_tsvector('english', description));

-- Или для русского
CREATE INDEX deals_title_fts_idx ON deals USING GIN (to_tsvector('russian', title));
CREATE INDEX deals_description_fts_idx ON deals USING GIN (to_tsvector('russian', description));
```

**Время создания:** ~30-60 секунд на 10000 записей
**Размер индекса:** ~20-30% от размера таблицы

---

## РИСКИ ДОБАВЛЕНИЯ ИНДЕКСОВ

### Риск 1: Замедление INSERT/UPDATE

**Влияние:**
- При каждом INSERT/UPDATE нужно обновлять индексы
- Для составного индекса `[updatedAt, id]` влияние минимальное (id не меняется, updatedAt обновляется автоматически)

**Mitigation:**
- Тестирование на dev окружении
- Мониторинг времени записи

**Rollback:**
```sql
DROP INDEX deals_updatedAt_id_idx;
```

---

### Риск 2: Увеличение размера БД

**Влияние:**
- Каждый индекс занимает место
- Для 10000 записей: ~5-10 MB на индекс

**Mitigation:**
- Обычно не критично (размер БД не должен быть проблемой)

---

### Риск 3: Блокировки при создании индекса

**Влияние:**
- Создание индекса на больших таблицах может заблокировать таблицу
- Для 10000 записей: ~10-30 секунд блокировки

**Mitigation:**
- Создавать индекс в нерабочее время
- Использовать `CREATE INDEX CONCURRENTLY` (PostgreSQL)

**Безопасное создание:**
```sql
CREATE INDEX CONCURRENTLY deals_updatedAt_id_idx ON deals(updatedAt, id);
```

**Rollback:**
```sql
DROP INDEX CONCURRENTLY deals_updatedAt_id_idx;
```

---

## ОЦЕНКА ЭФФЕКТИВНОСТИ

### До добавления индексов (cursor-based пагинация):

```sql
-- Без индекса [updatedAt, id]
SELECT * FROM deals 
WHERE pipelineId = 'xxx'
  AND (updatedAt < '2024-01-01' OR (updatedAt = '2024-01-01' AND id < 'deal-id'))
ORDER BY updatedAt DESC, id DESC
LIMIT 50;

-- Время: ~500-1000ms (full scan + sort)
```

### После добавления индексов:

```sql
-- С индексом [pipelineId, updatedAt, id]
-- Время: ~10-50ms (index scan)
```

**Улучшение: 10-100x**

---

## ЧЕКЛИСТ

- [ ] Добавить `@@index([updatedAt, id])` на Deal
- [ ] Добавить `@@index([createdAt, id])` на Task
- [ ] Опционально: `@@index([pipelineId, updatedAt, id])` на Deal
- [ ] Создать миграцию
- [ ] Тестирование производительности
- [ ] Мониторинг размера БД
- [ ] Мониторинг времени INSERT/UPDATE

---

## ВЫВОДЫ

1. **Составные индексы обязательны** для cursor-based пагинации
2. **Full-text search** нужен если поиск используется часто
3. **Риски минимальны** (индексы на часто меняющихся полях)
4. **Улучшение 10-100x** при правильных индексах

