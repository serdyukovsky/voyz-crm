# CSV Import Analysis - 10,000 строк
## Анализ производительности и блокировок

---

## 1. СКОЛЬКО ЗАПРОСОВ БУДЕТ ВЫПОЛНЕНО

### Текущая реализация (если использовать `contactsService.create()`)

**Для каждой строки CSV (новый контакт):**

```typescript
// contacts.service.ts:create()
1. findUnique({ email })              // Проверка дубликата email
2. findUnique({ companyId })          // Проверка компании (если есть)
3. create({ ... })                    // Создание контакта
4. create({ activity })               // Создание activity записи
5. findMany({ contactId })            // getStats() внутри formatContactResponse()
```

**Итого: минимум 5 запросов на строку**

**Для существующего контакта (если делать update):**

```typescript
1. findUnique({ email })              // Поиск существующего
2. findUnique({ id })                 // Загрузка для сравнения (в update)
3. findUnique({ companyId })          // Проверка компании
4. update({ ... })                    // Обновление контакта
5. create({ activity })               // Activity для каждого измененного поля
6. findMany({ contactId })            // getStats()
```

**Итого: минимум 6-8 запросов на строку**

### Общее количество запросов для 10,000 строк:

**Сценарий 1: Все контакты новые (50% email, 50% phone)**
- 5,000 строк с email: 5,000 × 5 = **25,000 запросов**
- 5,000 строк с phone: 5,000 × 5 = **25,000 запросов**
- **ИТОГО: ~50,000 запросов**

**Сценарий 2: 30% существующих, 70% новых**
- 3,000 существующих: 3,000 × 7 = **21,000 запросов**
- 7,000 новых: 7,000 × 5 = **35,000 запросов**
- **ИТОГО: ~56,000 запросов**

**Сценарий 3: С учетом проверки phone (если нет email)**
- Дополнительная проверка phone: +10,000 запросов
- **ИТОГО: ~60,000-70,000 запросов**

### Время выполнения (оценка):

- Среднее время запроса: 5-10ms
- Последовательное выполнение: 60,000 × 7ms = **420 секунд = 7 минут**
- С учетом накладных расходов: **10-15 минут**

---

## 2. ГДЕ ВОЗНИКНУТ БЛОКИРОВКИ

### 🔴 КРИТИЧЕСКИЕ БЛОКИРОВКИ:

#### 2.1 Unique Constraints (email, phone)

**Проблема:**
```sql
-- При проверке существования:
SELECT * FROM contacts WHERE email = ? FOR UPDATE;  -- Неявная блокировка
-- При создании:
INSERT INTO contacts (email, ...) VALUES (?, ...);  -- Блокировка на unique index
```

**Где возникнет:**
- `contacts.service.ts:55` - `findUnique({ email })`
- `contacts.service.ts:260` - `findUnique({ email })` в update
- При массовом импорте: **конкуренция за одни и те же email/phone**

**Последствия:**
- Deadlocks при параллельной обработке
- Serialization errors
- Timeout при большом количестве одновременных запросов

---

#### 2.2 Индексы на email и phone

**Проблема:**
```sql
-- Каждый INSERT обновляет индекс:
CREATE INDEX contacts_email_idx ON contacts (email);
CREATE INDEX contacts_phone_idx ON contacts (phone);
```

**Где возникнет:**
- При каждом `create()` обновляются индексы
- При 10,000 INSERT: **10,000 обновлений индексов**
- Блокировки на уровне индексов

**Последствия:**
- Медленные INSERT операции
- Блокировки чтения при обновлении индексов
- Увеличение времени выполнения в 2-3 раза

---

#### 2.3 Foreign Key Constraints (companyId)

**Проблема:**
```sql
-- При проверке компании:
SELECT * FROM companies WHERE id = ?;  -- Блокировка на FK проверке
-- При создании контакта:
INSERT INTO contacts (company_id, ...) VALUES (?, ...);  -- FK проверка
```

**Где возникнет:**
- `contacts.service.ts:66` - `findUnique({ companyId })`
- При создании контакта с `companyId`

**Последствия:**
- Блокировки на таблице `companies`
- Замедление при множественных проверках одной компании

---

#### 2.4 Activity Table (если не batch)

**Проблема:**
```sql
-- При каждом создании контакта:
INSERT INTO activities (type, contact_id, ...) VALUES (?, ?, ...);
```

**Где возникнет:**
- `contacts.service.ts:99` - `activityService.create()`
- 10,000 INSERT в activities

**Последствия:**
- Блокировки на таблице activities
- Медленные INSERT (если нет batch)

---

#### 2.5 Transaction Locks (если использовать транзакции)

**Проблема:**
```sql
BEGIN;
  SELECT * FROM contacts WHERE email = ? FOR UPDATE;
  INSERT INTO contacts ...;
  INSERT INTO activities ...;
COMMIT;
```

**Где возникнет:**
- При использовании транзакций для каждой строки
- Долгие транзакции блокируют другие операции

**Последствия:**
- Deadlocks
- Timeout транзакций
- Блокировка других пользователей

---

### 🟡 СРЕДНИЕ БЛОКИРОВКИ:

#### 2.6 WebSocket Events

**Проблема:**
```typescript
// contacts.service.ts:109
this.websocketGateway.emitContactCreated(contact.id, contact);
```

**Где возникнет:**
- При каждом создании контакта
- 10,000 WebSocket событий

**Последствия:**
- Нагрузка на WebSocket сервер
- Медленная отправка событий
- Возможные timeout

---

#### 2.7 Stats Queries (getStats)

**Проблема:**
```sql
-- contacts.service.ts:389
SELECT * FROM deals WHERE contact_id = ?;
```

**Где возникнет:**
- В `formatContactResponse()` для каждого контакта
- 10,000 запросов к deals

**Последствия:**
- Блокировки на таблице deals
- Медленные запросы
- Избыточная нагрузка

---

## 3. ВЫДЕРЖИТ ЛИ ЭТО CODESPACES

### Ограничения Codespaces:

1. **CPU**: 2-4 cores (зависит от плана)
2. **Memory**: 4-8 GB RAM
3. **Timeout**: 30-60 минут для HTTP запросов
4. **Database connections**: Обычно 20-100 соединений
5. **Rate limiting**: Нет явных ограничений, но есть практические

### Анализ текущего подхода:

#### ❌ НЕ ВЫДЕРЖИТ при последовательном выполнении:

**Проблемы:**
1. **Timeout**: 10-15 минут выполнения превысит timeout HTTP запроса
2. **Memory**: 10,000 объектов в памяти (контакты + stats) = ~100-200 MB
3. **Database connections**: 50,000+ запросов создадут очередь
4. **CPU**: Последовательная обработка не использует многопоточность

**Вероятность успеха: 10-20%**

#### ⚠️ ВЫДЕРЖИТ с оптимизациями (частично):

**Если использовать:**
- Batch операции (createMany)
- Транзакции для групп
- Отключить WebSocket/Activity при импорте
- Параллельная обработка (но осторожно с блокировками)

**Вероятность успеха: 60-70%**

#### ✅ ВЫДЕРЖИТ с правильной архитектурой:

**Если использовать:**
- Queue system (Bull/BullMQ)
- Background job processing
- Batch операции (1000 строк за раз)
- Транзакции для batch
- Отключить все побочные эффекты

**Вероятность успеха: 95%+**

---

## 4. ЧТО НУЖНО ИЗМЕНИТЬ ДО ИМПОРТА

### 🔴 КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ (обязательно):

#### 4.1 Batch проверка существующих контактов

**Текущий код:**
```typescript
// Для каждой строки:
const existing = await this.prisma.contact.findUnique({
  where: { email: normalizedEmail },
});
```

**Исправление:**
```typescript
// Один раз для всех строк:
const emails = rows.map(r => normalizeEmail(r.email)).filter(Boolean);
const phones = rows.map(r => normalizePhone(r.phone)).filter(Boolean);

const existingContacts = await this.prisma.contact.findMany({
  where: {
    OR: [
      { email: { in: emails } },
      { phone: { in: phones } },
    ],
  },
  select: { id: true, email: true, phone: true },
});

// Создать Map для быстрого поиска
const contactsMap = new Map();
existingContacts.forEach(c => {
  if (c.email) contactsMap.set(`email:${c.email}`, c);
  if (c.phone) contactsMap.set(`phone:${c.phone}`, c);
});
```

**Выгода:**
- 10,000 запросов → 1 запрос
- Ускорение: **10,000x**

---

#### 4.2 Batch создание контактов (createMany)

**Текущий код:**
```typescript
// Для каждой строки:
const contact = await this.prisma.contact.create({ ... });
```

**Исправление:**
```typescript
// Batch создание:
const contactsToCreate = newContacts.map(row => ({
  fullName: sanitizeTextFields(row.fullName)!,
  email: normalizeEmail(row.email) || undefined,
  phone: normalizePhone(row.phone) || undefined,
  // ... другие поля
}));

await this.prisma.contact.createMany({
  data: contactsToCreate,
  skipDuplicates: true,  // Важно!
});
```

**Выгода:**
- 10,000 INSERT → 1 batch INSERT
- Ускорение: **100-1000x**

**Ограничение:**
- `createMany` не возвращает созданные записи
- Нужно делать отдельный запрос для получения IDs (если нужны)

---

#### 4.3 Batch создание activities

**Текущий код:**
```typescript
// Для каждого контакта:
await this.activityService.create({
  type: ActivityType.CONTACT_CREATED,
  userId,
  contactId: contact.id,
});
```

**Исправление:**
```typescript
// Batch создание:
const activities = createdContactIds.map(contactId => ({
  type: ActivityType.CONTACT_CREATED,
  userId,
  contactId,
  payload: { contactId },
}));

await this.prisma.activity.createMany({
  data: activities,
});
```

**Выгода:**
- 10,000 INSERT → 1 batch INSERT
- Ускорение: **100x**

---

#### 4.4 Отключить WebSocket события при импорте

**Текущий код:**
```typescript
// contacts.service.ts:109
this.websocketGateway.emitContactCreated(contact.id, contact);
```

**Исправление:**
```typescript
// Добавить флаг в метод:
async create(createContactDto: CreateContactDto, userId: string, options?: { skipWebSocket?: boolean }) {
  // ...
  if (!options?.skipWebSocket) {
    this.websocketGateway.emitContactCreated(contact.id, contact);
  }
}

// При импорте:
await this.contactsService.create(contactData, userId, { skipWebSocket: true });
```

**Выгода:**
- Уменьшение нагрузки на WebSocket
- Ускорение: **2-5x**

---

#### 4.5 Отключить getStats при импорте

**Текущий код:**
```typescript
// contacts.service.ts:112
return this.formatContactResponse(contact);  // Вызывает getStats()
```

**Исправление:**
```typescript
// Добавить флаг:
async create(..., options?: { skipStats?: boolean }) {
  const contact = await this.prisma.contact.create({ ... });
  
  if (options?.skipStats) {
    return { ...contact, stats: null };
  }
  
  return this.formatContactResponse(contact);
}
```

**Выгода:**
- 10,000 запросов к deals → 0
- Ускорение: **10x**

---

#### 4.6 Использовать транзакции для batch

**Исправление:**
```typescript
async importContacts(rows: ContactRow[], userId: string) {
  const BATCH_SIZE = 1000;  // Обрабатывать по 1000 строк
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    await this.prisma.$transaction(async (tx) => {
      // 1. Batch проверка существующих
      const existing = await this.batchFindExisting(tx, batch);
      
      // 2. Разделить на новые и обновляемые
      const { toCreate, toUpdate } = this.splitContacts(batch, existing);
      
      // 3. Batch создание
      if (toCreate.length > 0) {
        await tx.contact.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
      }
      
      // 4. Batch обновление (если нужно)
      if (toUpdate.length > 0) {
        // Использовать updateMany или цикл с условиями
        await this.batchUpdate(tx, toUpdate);
      }
      
      // 5. Batch создание activities
      const createdIds = await this.getCreatedIds(tx, batch);
      await tx.activity.createMany({
        data: createdIds.map(id => ({
          type: ActivityType.CONTACT_CREATED,
          userId,
          contactId: id,
        })),
      });
    }, {
      timeout: 30000,  // 30 секунд на batch
      isolationLevel: 'ReadCommitted',  // Меньше блокировок
    });
  }
}
```

**Выгода:**
- Гарантия целостности данных
- Меньше блокировок (короткие транзакции)
- Возможность отката при ошибке

---

### 🟡 ВАЖНЫЕ ИЗМЕНЕНИЯ (рекомендуется):

#### 4.7 Использовать Queue для фоновой обработки

**Исправление:**
```typescript
// Использовать Bull/BullMQ
@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('import') private importQueue: Queue,
  ) {}

  async createImportJob(data: ImportJobData) {
    const job = await this.prisma.importJob.create({ ... });
    
    // Добавить в очередь
    await this.importQueue.add('process-import', {
      jobId: job.id,
      fileUrl: data.fileUrl,
      userId: data.createdById,
    });
    
    return job;
  }
}

// Worker для обработки
@Processor('import')
export class ImportProcessor {
  @Process('process-import')
  async handleImport(job: Job) {
    const { jobId, fileUrl, userId } = job.data;
    
    // Обновить статус
    await this.updateJobStatus(jobId, 'processing');
    
    try {
      // Загрузить CSV
      const rows = await this.loadCSV(fileUrl);
      
      // Обработать batch'ами
      await this.importContacts(rows, userId);
      
      await this.updateJobStatus(jobId, 'completed');
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', error);
    }
  }
}
```

**Выгода:**
- Нет timeout HTTP запроса
- Возможность перезапуска при ошибке
- Прогресс обработки
- Не блокирует API

---

#### 4.8 Оптимизировать проверку компаний

**Текущий код:**
```typescript
// Для каждого контакта с companyId:
const company = await this.prisma.company.findUnique({
  where: { id: createContactDto.companyId },
});
```

**Исправление:**
```typescript
// Batch проверка компаний:
const companyIds = [...new Set(rows.map(r => r.companyId).filter(Boolean))];
const companies = await this.prisma.company.findMany({
  where: { id: { in: companyIds } },
  select: { id: true, name: true },
});

const companiesMap = new Map(companies.map(c => [c.id, c]));
```

**Выгода:**
- N запросов → 1 запрос
- Ускорение: **Nx**

---

#### 4.9 Использовать raw SQL для массовых операций

**Для очень больших импортов (100k+ строк):**

```typescript
// Использовать COPY FROM для PostgreSQL
async importContactsRaw(rows: ContactRow[]) {
  const values = rows.map(row => 
    `('${row.fullName}', '${row.email}', '${row.phone}', ...)`
  ).join(',');

  await this.prisma.$executeRawUnsafe(`
    INSERT INTO contacts (full_name, email, phone, ...)
    VALUES ${values}
    ON CONFLICT (email) DO UPDATE SET ...
  `);
}
```

**Выгода:**
- Максимальная производительность
- Минимум блокировок
- Ускорение: **10-100x** по сравнению с createMany

---

### 🟢 ОПЦИОНАЛЬНЫЕ ИЗМЕНЕНИЯ:

#### 4.10 Кеширование проверок

```typescript
// Кешировать результаты проверки существующих
const cache = new Map();

for (const row of rows) {
  const cacheKey = `email:${row.email}`;
  if (!cache.has(cacheKey)) {
    const existing = await this.prisma.contact.findUnique({ ... });
    cache.set(cacheKey, existing);
  }
}
```

---

#### 4.11 Параллельная обработка batch'ов

```typescript
// Обрабатывать несколько batch'ов параллельно (осторожно!)
const batches = chunkArray(rows, BATCH_SIZE);
await Promise.all(
  batches.map(batch => this.processBatch(batch))
);
```

**Внимание:** Может вызвать deadlocks при конкурентных обновлениях!

---

## 5. РЕКОМЕНДУЕМАЯ АРХИТЕКТУРА ИМПОРТА

```typescript
@Injectable()
export class ImportExportService {
  async importContacts(rows: ContactRow[], userId: string) {
    const BATCH_SIZE = 1000;
    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    // 1. Предварительная обработка (нормализация)
    const normalizedRows = rows.map(row => ({
      ...row,
      email: normalizeEmail(row.email),
      phone: normalizePhone(row.phone),
    }));

    // 2. Batch проверка существующих (один раз)
    const existingContacts = await this.batchFindExisting(normalizedRows);
    const existingMap = this.createExistingMap(existingContacts);

    // 3. Разделить на batch'и
    const batches = chunkArray(normalizedRows, BATCH_SIZE);

    // 4. Обработать каждый batch в транзакции
    for (const batch of batches) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const { toCreate, toUpdate } = this.splitBatch(batch, existingMap);

          // Batch создание
          if (toCreate.length > 0) {
            await tx.contact.createMany({
              data: toCreate,
              skipDuplicates: true,
            });
            results.created += toCreate.length;
          }

          // Batch обновление
          if (toUpdate.length > 0) {
            await this.batchUpdateContacts(tx, toUpdate);
            results.updated += toUpdate.length;
          }

          // Batch создание activities (опционально)
          // await this.batchCreateActivities(tx, createdIds, userId);
        }, {
          timeout: 30000,
          isolationLevel: 'ReadCommitted',
        });
      } catch (error) {
        results.errors.push({ batch, error });
      }
    }

    return results;
  }

  private async batchFindExisting(rows: ContactRow[]) {
    const emails = rows.map(r => r.email).filter(Boolean);
    const phones = rows.map(r => r.phone).filter(Boolean);

    return this.prisma.contact.findMany({
      where: {
        OR: [
          { email: { in: emails } },
          { phone: { in: phones } },
        ],
      },
      select: { id: true, email: true, phone: true },
    });
  }

  private createExistingMap(contacts: Contact[]) {
    const map = new Map();
    contacts.forEach(c => {
      if (c.email) map.set(`email:${c.email}`, c);
      if (c.phone) map.set(`phone:${c.phone}`, c);
    });
    return map;
  }

  private splitBatch(batch: ContactRow[], existingMap: Map) {
    const toCreate = [];
    const toUpdate = [];

    for (const row of batch) {
      const key = row.email ? `email:${row.email}` : `phone:${row.phone}`;
      const existing = existingMap.get(key);

      if (existing) {
        toUpdate.push({ ...row, id: existing.id });
      } else {
        toCreate.push(row);
      }
    }

    return { toCreate, toUpdate };
  }
}
```

---

## SUMMARY

### Текущее состояние:
- ❌ **50,000-70,000 запросов** для 10,000 строк
- ❌ **10-15 минут** выполнения
- ❌ **Множественные блокировки** (unique constraints, индексы, FK)
- ❌ **НЕ ВЫДЕРЖИТ Codespaces** (timeout, память, соединения)

### После исправлений:
- ✅ **~100-200 запросов** (batch операции)
- ✅ **30-60 секунд** выполнения
- ✅ **Минимум блокировок** (короткие транзакции)
- ✅ **ВЫДЕРЖИТ Codespaces** (с queue системой)

### Обязательные изменения:
1. ✅ Batch проверка существующих контактов
2. ✅ Batch создание (createMany)
3. ✅ Batch создание activities
4. ✅ Отключить WebSocket при импорте
5. ✅ Отключить getStats при импорте
6. ✅ Использовать транзакции для batch'ов

### Рекомендуемые изменения:
1. ✅ Queue система для фоновой обработки
2. ✅ Batch проверка компаний
3. ✅ Raw SQL для очень больших импортов

---

**Приоритет**: Критический - импорт не будет работать без этих изменений

