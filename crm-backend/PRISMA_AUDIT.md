# Prisma Schema Audit Report
## CRM Backend - Структурированный анализ

---

## 1. DATABASE PROVIDER

### Current State
- **Provider**: PostgreSQL
- **URL**: `env("DATABASE_URL")`

### Оценка пригодности

✅ **Bulk Insert**: PostgreSQL отлично поддерживает:
- `COPY FROM` для массовых вставок (10k-100k строк)
- Batch inserts через транзакции
- Партиционирование для больших таблиц

✅ **Транзакции**: ACID-совместимость, поддержка:
- Nested transactions (savepoints)
- Isolation levels
- Rollback capabilities

✅ **CSV Import (10k-100k строк)**: Оптимально для:
- `COPY FROM STDIN` (самый быстрый способ)
- Batch processing в транзакциях
- Параллельная обработка с `pg_bulkload`

**Вердикт**: PostgreSQL — отличный выбор для CRM с массовыми операциями.

---

## 2. ОЦЕНКА КЛЮЧЕВЫХ МОДЕЛЕЙ

### 2.1 Deal Model

**Текущая структура:**
- `id`: UUID (PK)
- `number`: String @unique — уникальный номер сделки
- Foreign keys: `pipelineId`, `stageId`, `createdById`, `assignedToId`, `contactId`, `companyId`
- Индексы на всех FK и `createdAt`

**Проблемы:**
1. ❌ **Нет индекса на `companyId`** — используется в связях, но нет индекса
2. ❌ **Нет индекса на `updatedAt`** — для сортировки по последним изменениям
3. ❌ **Нет индекса на `expectedCloseAt`** — для фильтрации по датам закрытия
4. ❌ **Нет индекса на `closedAt`** — для аналитики закрытых сделок
5. ⚠️ **Нет composite index** для частых запросов: `[pipelineId, stageId]`, `[assignedToId, stageId]`
6. ⚠️ **Нет индекса на `amount`** — для сортировки/фильтрации по сумме

**Уникальные идентификаторы:**
- ✅ `id` (UUID) — безопасен для обновлений
- ✅ `number` (String @unique) — может быть проблемой при импорте, если не генерируется автоматически

**Безопасность обновлений:**
- ✅ Безопасно: используется UUID как PK
- ⚠️ Риск: `number` должен быть уникальным, нужна валидация при импорте

---

### 2.2 Contact Model

**Текущая структура:**
- `id`: UUID (PK)
- `email`: String? (nullable, с индексом)
- `phone`: String? (nullable, с индексом)
- `companyName`: String? (nullable, с индексом)
- `companyId`: String? (FK, с индексом)
- Composite index: `[email, phone]`

**Проблемы:**
1. ❌ **Нет unique constraint на `email`** — возможны дубликаты контактов
2. ❌ **Нет unique constraint на `phone`** — возможны дубликаты
3. ❌ **Нет composite unique на `[email, phone]`** — для предотвращения дублей
4. ⚠️ **Дублирование данных**: `companyName` хранится в Contact, хотя есть связь с Company
5. ❌ **Нет индекса на `updatedAt`** — для сортировки по последним изменениям
6. ⚠️ **Массив `tags`** — нет индекса GIN для полнотекстового поиска

**Уникальные идентификаторы:**
- ✅ `id` (UUID) — безопасен
- ❌ `email` — не уникален, возможны дубликаты
- ❌ `phone` — не уникален, возможны дубликаты

**Безопасность обновлений:**
- ✅ Безопасно по `id`
- ⚠️ **RISK DATA CORRUPTION**: При импорте CSV без проверки уникальности `email`/`phone` возможны дубликаты

---

### 2.3 Company Model

**Текущая структура:**
- `id`: UUID (PK)
- `name`: String (с индексом, но не unique)
- `email`: String? (nullable, с индексом)
- `phone`: String? (nullable, без индекса)

**Проблемы:**
1. ❌ **Нет unique constraint на `name`** — возможны дубликаты компаний
2. ❌ **Нет unique constraint на `email`** — возможны дубликаты
3. ❌ **Нет индекса на `phone`** — используется для поиска, но нет индекса
4. ❌ **Нет индекса на `updatedAt`** — для сортировки
5. ⚠️ **Нет composite unique на `[name, email]`** — для предотвращения дублей

**Уникальные идентификаторы:**
- ✅ `id` (UUID) — безопасен
- ❌ `name` — не уникален, возможны дубликаты

**Безопасность обновлений:**
- ✅ Безопасно по `id`
- ⚠️ **RISK DATA CORRUPTION**: При импорте возможны дубликаты компаний с одинаковым `name`

---

### 2.4 CustomField Model

**Текущая структура:**
- `id`: UUID (PK)
- `key`: String @unique — уникальный ключ поля
- `@@unique([key, entityType])` — composite unique

**Проблемы:**
1. ⚠️ **Дублирование unique constraints**: `key @unique` + `@@unique([key, entityType])` — избыточно
2. ❌ **Нет индекса на `order`** — для сортировки полей в UI
3. ❌ **Нет индекса на `group`** — для группировки полей

**Уникальные идентификаторы:**
- ✅ `id` (UUID) — безопасен
- ✅ `key` — уникален
- ✅ `[key, entityType]` — composite unique (избыточно с `key @unique`)

**Безопасность обновлений:**
- ✅ Безопасно

---

### 2.5 CustomFieldValue Model

**Текущая структура:**
- `id`: UUID (PK)
- `@@unique([customFieldId, dealId])` — один value на field+deal
- `@@unique([customFieldId, contactId])` — один value на field+contact
- Индексы на `customFieldId`, `dealId`, `contactId`

**Проблемы:**
1. ⚠️ **Неполная уникальность**: Нет проверки, что `dealId` и `contactId` не заполнены одновременно
2. ❌ **Нет индекса на `entityType, entityId`** — хотя есть поля, но индекс не оптимален для запросов
3. ⚠️ **Избыточные поля**: `entityId` и `entityType` дублируют `dealId`/`contactId`

**Уникальные идентификаторы:**
- ✅ `id` (UUID) — безопасен
- ✅ Composite unique constraints — предотвращают дубликаты

**Безопасность обновлений:**
- ✅ Безопасно

---

### 2.6 Pipeline / Stage Models

**Текущая структура:**
- Pipeline: `id`, `isDefault` (с индексом)
- Stage: `id`, `pipelineId`, `order` (composite unique: `[pipelineId, order]`)

**Проблемы:**
1. ❌ **Нет индекса на `order` в Pipeline** — для сортировки пайплайнов
2. ❌ **Нет индекса на `order` в Stage** — хотя есть composite unique, отдельный индекс может помочь
3. ⚠️ **Нет проверки уникальности `isDefault`** — может быть несколько default pipelines

**Уникальные идентификаторы:**
- ✅ `id` (UUID) — безопасен
- ✅ `[pipelineId, order]` — composite unique для порядка стадий

**Безопасность обновлений:**
- ✅ Безопасно

---

## 3. УНИКАЛЬНЫЕ ИДЕНТИФИКАТОРЫ И БЕЗОПАСНОСТЬ ОБНОВЛЕНИЙ

### Используемые уникальные идентификаторы:

| Модель | Primary Key | Unique Fields | Безопасность обновлений |
|--------|-------------|---------------|-------------------------|
| **User** | `id` (UUID) | `email` | ✅ Безопасно |
| **Deal** | `id` (UUID) | `number` | ✅ Безопасно (но `number` должен быть уникальным) |
| **Contact** | `id` (UUID) | ❌ Нет | ⚠️ **RISK**: Нет unique на `email`/`phone` |
| **Company** | `id` (UUID) | ❌ Нет | ⚠️ **RISK**: Нет unique на `name`/`email` |
| **CustomField** | `id` (UUID) | `key`, `[key, entityType]` | ✅ Безопасно |
| **Pipeline** | `id` (UUID) | ❌ Нет | ✅ Безопасно |
| **Stage** | `id` (UUID) | `[pipelineId, order]` | ✅ Безопасно |

### Риски data corruption:

1. **Contact**: 
   - ❌ Дубликаты по `email` при импорте CSV
   - ❌ Дубликаты по `phone` при импорте CSV
   - **Решение**: Добавить `@@unique([email])` и `@@unique([phone])` или composite unique

2. **Company**:
   - ❌ Дубликаты по `name` при импорте CSV
   - ❌ Дубликаты по `email` при импорте CSV
   - **Решение**: Добавить `@@unique([name])` или composite unique

3. **Deal**:
   - ⚠️ `number` должен генерироваться автоматически или проверяться на уникальность при импорте
   - **Решение**: Автогенерация или валидация

4. **Pipeline**:
   - ⚠️ Может быть несколько `isDefault = true`
   - **Решение**: Добавить partial unique index или constraint

---

## 4. НАЙДЕННЫЕ ПРОБЛЕМЫ

### 4.1 Отсутствие индексов

**Критические (для производительности):**

1. **Deal**:
   - ❌ `companyId` — используется в связях, но нет индекса
   - ❌ `updatedAt` — для сортировки по последним изменениям
   - ❌ `expectedCloseAt` — для фильтрации по датам
   - ❌ `closedAt` — для аналитики
   - ❌ `amount` — для сортировки/фильтрации
   - ❌ Composite: `[pipelineId, stageId]` — частый запрос
   - ❌ Composite: `[assignedToId, stageId]` — частый запрос

2. **Contact**:
   - ❌ `updatedAt` — для сортировки

3. **Company**:
   - ❌ `phone` — используется, но нет индекса
   - ❌ `updatedAt` — для сортировки

4. **CustomField**:
   - ❌ `order` — для сортировки в UI
   - ❌ `group` — для группировки

5. **Task**:
   - ❌ `createdById` — используется, но нет индекса
   - ❌ `createdAt` — для сортировки

6. **Pipeline**:
   - ❌ `order` — для сортировки

### 4.2 Отсутствие unique constraints

**Критические (для data integrity):**

1. **Contact**:
   - ❌ `email` — должен быть unique (или nullable unique)
   - ❌ `phone` — должен быть unique (или nullable unique)
   - ❌ Composite: `[email, phone]` — для предотвращения дублей

2. **Company**:
   - ❌ `name` — должен быть unique (или с учетом регистра)
   - ❌ `email` — должен быть unique (или nullable unique)

3. **Pipeline**:
   - ❌ `isDefault` — должен быть только один default pipeline (partial unique index)

### 4.3 Потенциальные N+1 паттерны

**Рисковые места:**

1. **Deal → Contact, Company, User, Pipeline, Stage**:
   - При загрузке списка сделок может быть N+1 на связанные сущности
   - **Решение**: Использовать `include` или `select` с нужными полями

2. **Contact → Company, CustomFieldValues**:
   - При загрузке контактов может быть N+1 на компанию и кастомные поля
   - **Решение**: Eager loading или batch loading

3. **CustomFieldValue → CustomField**:
   - При загрузке значений может быть N+1 на определения полей
   - **Решение**: Batch loading

**Рекомендация**: Использовать Prisma `include` или `select` для предотвращения N+1.

### 4.4 Плохие связи

**Анализ связей:**

1. **Deal ↔ Contact**: 
   - ✅ 1:N (один контакт на сделку) — правильно
   - ⚠️ Но в реальности может быть M:N (несколько контактов на сделку)
   - **Рекомендация**: Рассмотреть junction table `DealContact`

2. **Deal ↔ Company**:
   - ✅ 1:N (одна компания на сделку) — правильно

3. **Contact ↔ Company**:
   - ✅ N:1 (много контактов на компанию) — правильно
   - ⚠️ Но `companyName` дублируется в Contact — нарушение нормализации

4. **CustomFieldValue**:
   - ⚠️ Поля `entityId` и `entityType` дублируют `dealId`/`contactId`
   - **Рекомендация**: Убрать избыточные поля или использовать полиморфную связь

---

## 5. РЕКОМЕНДАЦИИ

### 5.1 ОБЯЗАТЕЛЬНО ИСПРАВИТЬ (Before Import)

#### Критические для data integrity:

1. **Contact Model**:
   ```prisma
   // Добавить unique constraints
   email     String?  @unique
   phone     String?  @unique
   // Или composite unique для предотвращения дублей
   @@unique([email, phone])
   ```

2. **Company Model**:
   ```prisma
   // Добавить unique constraint
   name      String   @unique
   email     String?  @unique
   ```

3. **Deal Model**:
   ```prisma
   // Добавить недостающие индексы
   @@index([companyId])
   @@index([updatedAt])
   @@index([expectedCloseAt])
   @@index([closedAt])
   @@index([amount])
   @@index([pipelineId, stageId])
   @@index([assignedToId, stageId])
   ```

4. **Pipeline Model**:
   ```prisma
   // Обеспечить единственный default pipeline
   // В PostgreSQL: CREATE UNIQUE INDEX ON pipelines (is_default) WHERE is_default = true;
   // В Prisma это можно сделать через raw SQL в миграции
   ```

5. **Contact Model**:
   ```prisma
   // Убрать дублирование companyName или сделать его computed
   // companyName String? // УДАЛИТЬ - дублирует Company.name
   ```

#### Критические для производительности:

6. **Company Model**:
   ```prisma
   @@index([phone])
   @@index([updatedAt])
   ```

7. **CustomField Model**:
   ```prisma
   @@index([order])
   @@index([group])
   ```

8. **Task Model**:
   ```prisma
   @@index([createdById])
   @@index([createdAt])
   ```

9. **Pipeline Model**:
   ```prisma
   @@index([order])
   ```

---

### 5.2 ЖЕЛАТЕЛЬНО УЛУЧШИТЬ

1. **Убрать избыточные unique constraints**:
   ```prisma
   // CustomField: убрать @unique на key, оставить только @@unique([key, entityType])
   key         String  // Убрать @unique
   @@unique([key, entityType])
   ```

2. **Оптимизировать CustomFieldValue**:
   ```prisma
   // Убрать entityId и entityType, использовать только dealId/contactId
   // Или сделать полиморфную связь правильно
   ```

3. **Добавить GIN индексы для массивов**:
   ```prisma
   // Contact.tags, Deal.tags
   // В миграции: CREATE INDEX ON contacts USING GIN (tags);
   ```

4. **Добавить partial индексы для частых запросов**:
   ```prisma
   // Например, только активные сделки
   // CREATE INDEX ON deals (stage_id) WHERE closed_at IS NULL;
   ```

5. **Рассмотреть M:N связь Deal ↔ Contact**:
   ```prisma
   model DealContact {
     id      String @id @default(uuid())
     dealId  String
     contactId String
     role    String? // "primary", "secondary", etc.
     
     deal    Deal    @relation(fields: [dealId], references: [id], onDelete: Cascade)
     contact Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)
     
     @@unique([dealId, contactId])
     @@index([dealId])
     @@index([contactId])
   }
   ```

6. **Добавить soft delete** (опционально):
   ```prisma
   deletedAt DateTime?
   @@index([deletedAt])
   ```

---

### 5.3 МОЖНО ОСТАВИТЬ КАК ЕСТЬ

1. ✅ Структура связей User ↔ Deal, User ↔ Task — корректна
2. ✅ Индексы на Activity, Comment, File — достаточны
3. ✅ Структура Pipeline ↔ Stage — корректна
4. ✅ RefreshToken индексы — оптимальны
5. ✅ CustomFieldValue unique constraints — корректны

---

## SUMMARY

### Current State
- ✅ PostgreSQL — отличный выбор для CRM
- ✅ Базовая структура моделей корректна
- ✅ Большинство связей правильно спроектированы
- ⚠️ Недостаточно unique constraints для предотвращения дублей
- ⚠️ Недостаточно индексов для производительности

### Problems
1. **Data Integrity**: Отсутствие unique constraints на Contact.email/phone, Company.name
2. **Performance**: Отсутствие индексов на часто используемых полях (companyId, updatedAt, amount)
3. **Data Duplication**: companyName в Contact дублирует Company.name
4. **N+1 Risks**: Потенциальные проблемы при загрузке связанных данных

### Required Changes (Before Import)
1. ✅ Добавить `@unique` на Contact.email и Contact.phone
2. ✅ Добавить `@unique` на Company.name и Company.email
3. ✅ Добавить индексы на Deal.companyId, Deal.updatedAt, Deal.amount
4. ✅ Добавить индекс на Company.phone
5. ✅ Убрать или нормализовать Contact.companyName

### Optional Improvements
1. Рассмотреть M:N связь Deal ↔ Contact
2. Добавить GIN индексы для массивов (tags)
3. Добавить partial индексы для активных записей
4. Оптимизировать CustomFieldValue (убрать entityId/entityType)

---

**Дата аудита**: 2024
**Статус**: Требуются критические изменения перед массовым импортом данных

