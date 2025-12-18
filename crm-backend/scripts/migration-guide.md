# Руководство по применению миграции prepare_import

## Шаг 1: Проверка дубликатов

Выполните SQL запросы из `check-duplicates.sql`:

```bash
psql -d crm -f scripts/check-duplicates.sql
```

Или через Prisma Studio / любой SQL клиент.

## Шаг 2: Обработка дубликатов

### Если дубликаты НЕ найдены:
✅ Можно сразу применять миграцию.

### Если дубликаты найдены:

#### Вариант A: Удалить дубликаты (если они точно лишние)

1. **Сделайте backup базы данных:**
   ```bash
   pg_dump crm > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Просмотрите дубликаты:**
   ```sql
   -- Выполните SELECT запросы из fix-duplicates.sql
   ```

3. **Удалите дубликаты:**
   ```sql
   -- Раскомментируйте DELETE запросы в fix-duplicates.sql
   -- Выполните их по одному, проверяя результат
   ```

#### Вариант B: Обновить дубликаты (безопаснее)

Для contacts можно обновить email/phone дубликатов, добавив суффикс:

```sql
-- См. UPDATE запросы в fix-duplicates.sql
```

#### Вариант C: Объединить данные вручную

Для companies лучше вручную проверить и объединить связанные данные (deals, contacts).

## Шаг 3: Применение миграции

После очистки дубликатов:

```bash
npx prisma migrate dev --name prepare_import
```

Или если миграция уже создана:

```bash
npx prisma migrate deploy
```

## Шаг 4: Проверка после миграции

Убедитесь, что constraints применены:

```sql
-- Проверка unique constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name
FROM pg_constraint
WHERE conname LIKE '%email%' OR conname LIKE '%phone%' OR conname LIKE '%name%'
ORDER BY table_name, constraint_name;
```

## Важно

- ⚠️ **Всегда делайте backup** перед удалением данных
- ⚠️ **Проверяйте связанные данные** (deals, contacts) перед удалением companies
- ⚠️ **Тестируйте на dev/staging** перед production

