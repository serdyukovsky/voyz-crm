# Анализ производительности: Deals и Tasks

## ШАГ 1: КАРТА СИСТЕМЫ

### 1.1. Загрузка списка сделок (`GET /deals`)

**Контроллер:** `DealsController.findAll()`
**Сервис:** `DealsService.findAll()`

**Поток выполнения:**

1. **Prisma запрос #1** (строки 261-285):
   ```typescript
   prisma.deal.findMany({
     include: {
       stage, pipeline (со stages), createdBy, assignedTo,
       contact (с company), company, customFieldValues (с customField)
     }
   })
   ```
   - **Таблицы:** `deals`, `stages`, `pipelines`, `users` (2x), `contacts`, `companies`, `custom_field_values`, `custom_fields`
   - **Связи:** JOIN через foreign keys
   - **Результат:** N сделок со всеми связанными данными

2. **Для каждой сделки** (строка 293):
   ```typescript
   Promise.all(deals.map((deal) => this.formatDealResponse(deal)))
   ```

3. **Внутри `formatDealResponse()` для каждой сделки:**

   **Если есть contact:**
   - **Prisma запрос #2-N+1** (строка 357):
     ```typescript
     getContactStats(contactId) → prisma.deal.findMany({ where: { contactId } })
     ```
     - **Таблицы:** `deals`
     - **Проблема:** N+1 запрос (для каждой сделки с контактом)

   **Если есть company:**
   - **Prisma запрос #3-N+1** (строка 407):
     ```typescript
     getCompanyStats(companyId) → prisma.deal.findMany({ where: { companyId } })
     ```
     - **Таблицы:** `deals`
     - **Проблема:** N+1 запрос (для каждой сделки с компанией)

   **Для каждой сделки:**
   - **Prisma запрос #4-N+1** (строка 493):
     ```typescript
     customFieldsService.findByEntity('deal') → prisma.customField.findMany({ where: { entityType: 'deal' } })
     ```
     - **Таблицы:** `custom_fields`
     - **Проблема:** КРИТИЧЕСКАЯ - один и тот же запрос повторяется N раз!

**Итого для списка из N сделок:**
- **Минимум:** 1 + N + N + N = **3N + 1 запросов**
- **Если все сделки с контактами и компаниями:** 1 + N + N + N = **3N + 1 запросов**
- **Реальность:** Обычно 50-100 сделок = **150-300+ запросов к БД**

---

### 1.2. Создание сделки (`POST /deals`)

**Контроллер:** `DealsController.create()`
**Сервис:** `DealsService.create()`

**Поток выполнения:**

1. **Prisma запрос #1** (строка 51):
   ```typescript
   prisma.stage.findUnique({ include: { pipeline: true } })
   ```
   - **Таблицы:** `stages`, `pipelines`

2. **Prisma запрос #2** (строка 70):
   ```typescript
   generateDealNumber() → prisma.deal.findMany({ where: { number: { startsWith } } })
   ```
   - **Таблицы:** `deals`
   - **Проблема:** Поиск по `startsWith` без индекса может быть медленным

3. **Prisma запрос #3** (строка 1020):
   ```typescript
   generateDealNumber() → prisma.deal.findUnique({ where: { number } })
   ```
   - **Таблицы:** `deals`
   - **Проверка уникальности**

4. **Prisma запрос #4** (строка 74):
   ```typescript
   prisma.deal.create({ include: { stage, pipeline, createdBy, assignedTo, contact (с company), company } })
   ```
   - **Таблицы:** `deals`, `stages`, `pipelines`, `users` (2x), `contacts`, `companies`

5. **Prisma запрос #5** (строка 97):
   ```typescript
   activityService.create() → prisma.activity.create()
   ```
   - **Таблицы:** `activities`

6. **Prisma запрос #6-7** (строки 115-122):
   ```typescript
   prisma.stage.findUnique({ select: { name } })
   prisma.pipeline.findUnique({ select: { name } })
   ```
   - **Таблицы:** `stages`, `pipelines`
   - **Проблема:** Лишние запросы - stage и pipeline уже загружены в шаге 4!

7. **Prisma запрос #8** (строка 147):
   ```typescript
   formatDealResponse() → getContactStats() (если есть contact)
   ```
   - **Таблицы:** `deals`

8. **Prisma запрос #9** (строка 147):
   ```typescript
   formatDealResponse() → getCompanyStats() (если есть company)
   ```
   - **Таблицы:** `deals`

9. **Prisma запрос #10** (строка 147):
   ```typescript
   formatDealResponse() → customFieldsService.findByEntity('deal')
   ```
   - **Таблицы:** `custom_fields`

**Итого:** **10 запросов** для создания одной сделки (можно сократить до 5-6)

---

### 1.3. Загрузка списка задач (`GET /tasks`)

**Контроллер:** `TasksController.findAll()`
**Сервис:** `TasksService.findAll()`

**Поток выполнения:**

1. **Prisma запрос #1** (строки 100-118):
   ```typescript
   prisma.task.findMany({
     include: {
       deal (с stage, contact), contact (с company), assignedTo, createdBy
     }
   })
   ```
   - **Таблицы:** `tasks`, `deals`, `stages`, `contacts`, `companies`, `users` (2x)
   - **Результат:** N задач со всеми связанными данными

2. **Для каждой задачи с контактом** (строки 121-150):
   ```typescript
   Promise.all(tasks.map(async (task) => {
     if (task.contact) {
       const contactStats = await this.getContactStats(task.contact.id);
     }
   }))
   ```

3. **Внутри `getContactStats()` для каждой задачи:**
   - **Prisma запрос #2-N+1** (строка 154):
     ```typescript
     prisma.deal.findMany({ where: { contactId } })
     ```
     - **Таблицы:** `deals`
     - **Проблема:** N+1 запрос (для каждой задачи с контактом)

**Итого для списка из N задач:**
- **Минимум:** 1 + N = **N + 1 запросов**
- **Если все задачи с контактами:** **N + 1 запросов**
- **Реальность:** Обычно 20-50 задач = **20-50+ запросов к БД**

---

## ШАГ 2: АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ

### 2.1. КРИТИЧЕСКИЕ ПРОБЛЕМЫ (N+1 запросы)

#### Проблема #1: `customFieldsService.findByEntity('deal')` в цикле
**Файл:** `deals.service.ts:493`
**Место:** `formatDealResponse()` вызывается для каждой сделки
**Влияние:** КРИТИЧЕСКОЕ
- Один и тот же запрос повторяется N раз
- Для 100 сделок = 100 одинаковых запросов к `custom_fields`
- **Решение:** Загрузить один раз перед циклом и передать в `formatDealResponse()`

#### Проблема #2: `getContactStats()` в цикле
**Файлы:** 
- `deals.service.ts:357` (в `formatDealResponse()`)
- `tasks.service.ts:128` (в `findAll()`)
**Влияние:** ВЫСОКОЕ
- Для каждой сделки/задачи с контактом делается отдельный запрос
- Для 100 сделок с контактами = 100 запросов к `deals`
- **Решение:** Batch-запрос для всех уникальных contactId

#### Проблема #3: `getCompanyStats()` в цикле
**Файл:** `deals.service.ts:407` (в `formatDealResponse()`)
**Влияние:** ВЫСОКОЕ
- Для каждой сделки с компанией делается отдельный запрос
- Для 100 сделок с компаниями = 100 запросов к `deals`
- **Решение:** Batch-запрос для всех уникальных companyId

---

### 2.2. ЛИШНИЕ ЗАПРОСЫ

#### Проблема #4: Дублирование загрузки stage/pipeline для логирования
**Файл:** `deals.service.ts:115-122` (в `create()`)
**Влияние:** СРЕДНЕЕ
- Stage и pipeline уже загружены в основном запросе (строка 74)
- Делаются дополнительные запросы только для получения `name`
- **Решение:** Использовать уже загруженные данные

#### Проблема #5: Дублирование загрузки stage/pipeline для логирования
**Файл:** `deals.service.ts:835-842` (в `update()`)
**Влияние:** СРЕДНЕЕ
- Stage и pipeline уже загружены в основном запросе (строка 669)
- Делаются дополнительные запросы только для получения `name`
- **Решение:** Использовать уже загруженные данные

#### Проблема #6: Дублирование загрузки deal/contact для логирования
**Файл:** `tasks.service.ts:55-62` (в `create()`)
**Влияние:** НИЗКОЕ
- Deal и contact уже загружены в основном запросе (строка 20)
- Делаются дополнительные запросы только для получения `title`/`fullName`
- **Решение:** Использовать уже загруженные данные

---

### 2.3. ПРОБЛЕМЫ С ИНДЕКСАМИ

#### Проблема #7: Поиск по `startsWith` без индекса
**Файл:** `deals.service.ts:997-1007` (в `generateDealNumber()`)
**Влияние:** СРЕДНЕЕ
- Запрос: `where: { number: { startsWith: datePrefix } }`
- Индекс на `number` есть (unique), но `startsWith` может не использовать его эффективно
- **Решение:** Рассмотреть составной индекс или другой подход

---

### 2.4. ЛОГИРОВАНИЕ И DEBUG

#### Проблема #8: Избыточные console.log
**Влияние:** СРЕДНЕЕ (нагрузка на I/O, засорение логов)
- **Всего найдено:** 368 вхождений `console.log/error/warn/debug`
- **Критические места:**
  - `deals.service.ts`: 20+ console.log в hot paths
  - `tasks.service.ts`: 15+ console.log в hot paths
  - `deals.controller.ts`: 10+ console.log
  - `formatDealResponse()`: 5+ console.log внутри цикла (строки 494, 499, 506, 510, 559)

**Проблемные паттерны:**
1. Логи внутри циклов (строки 494, 499, 506, 510, 559 в `formatDealResponse()`)
2. Логи в каждом запросе (все методы `create()`, `update()`, `findAll()`)
3. Детальные логи с JSON.stringify (строки 49, 385 в `deals.service.ts`)

**Решение:** 
- Удалить debug-логи из production
- Оставить только error-логи через logger
- Использовать structured logging с уровнями

---

## ШАГ 3: ПЛАН ИСПРАВЛЕНИЙ

### Приоритет 1: КРИТИЧЕСКИЕ (N+1 запросы)

#### Исправление #1: Кеширование customFields в findAll()
**Файл:** `deals.service.ts`
**Риск:** LOW
**Rollback:** Вернуть вызов внутри `formatDealResponse()`

**Изменения:**
1. Загрузить `customFields` один раз перед циклом в `findAll()`
2. Передать в `formatDealResponse()` как параметр
3. Использовать переданное значение вместо запроса к БД

#### Исправление #2: Batch-запрос для contactStats
**Файлы:** `deals.service.ts`, `tasks.service.ts`
**Риск:** LOW
**Rollback:** Вернуть вызов `getContactStats()` для каждой сделки/задачи

**Изменения:**
1. Собрать все уникальные `contactId` из списка
2. Сделать один запрос: `prisma.deal.groupBy({ by: ['contactId'], _count: true, _sum: { amount: true } })`
3. Или: `prisma.deal.findMany({ where: { contactId: { in: contactIds } } })` и группировать в памяти
4. Передать stats в `formatDealResponse()`

#### Исправление #3: Batch-запрос для companyStats
**Файл:** `deals.service.ts`
**Риск:** LOW
**Rollback:** Вернуть вызов `getCompanyStats()` для каждой сделки

**Изменения:** Аналогично исправлению #2

---

### Приоритет 2: ВЫСОКИЕ (лишние запросы)

#### Исправление #4: Использовать уже загруженные stage/pipeline
**Файл:** `deals.service.ts:115-122` (в `create()`)
**Риск:** LOW
**Rollback:** Вернуть отдельные запросы

**Изменения:** Использовать `deal.stage.name` и `deal.pipeline.name` вместо запросов

#### Исправление #5: Использовать уже загруженные stage/pipeline
**Файл:** `deals.service.ts:835-842` (в `update()`)
**Риск:** LOW
**Rollback:** Вернуть отдельные запросы

**Изменения:** Использовать `deal.stage.name` и `deal.pipeline.name` вместо запросов

---

### Приоритет 3: СРЕДНИЕ (логирование)

#### Исправление #6: Удалить console.log из production
**Риск:** LOW (только удаление логов)
**Rollback:** Вернуть console.log

**Изменения:**
1. Удалить все `console.log` из hot paths
2. Оставить только `console.error` для критических ошибок
3. Заменить на structured logger с уровнями (если есть)

**Файлы для очистки:**
- `deals.service.ts`: удалить строки 21, 38, 72, 73, 93, 106, 340, 494, 499, 506, 510, 559
- `deals.controller.ts`: удалить строки 36, 38, 41-52, 55-56
- `tasks.service.ts`: удалить строки 230, 232, 307, 308, 320, 323, 325, 344, 346, 349, 355, 385, 387, 393
- `formatDealResponse()`: удалить все console.log внутри метода

---

## ШАГ 4: ОЦЕНКА ВЛИЯНИЯ

### До исправлений (для 100 сделок):
- **Запросов к БД:** ~300+
- **Время:** ~2-5 секунд (зависит от БД)
- **Нагрузка:** Высокая

### После исправлений (для 100 сделок):
- **Запросов к БД:** ~5-10
- **Время:** ~200-500ms (улучшение в 10x)
- **Нагрузка:** Низкая

---

## ШАГ 5: ПОРЯДОК ВНЕДРЕНИЯ

1. **Сначала:** Исправление #1 (customFields) - самое критичное
2. **Затем:** Исправления #2 и #3 (batch-запросы для stats)
3. **Потом:** Исправления #4 и #5 (убрать лишние запросы)
4. **В конце:** Исправление #6 (очистка логов)

**Важно:** Тестировать после каждого исправления!

