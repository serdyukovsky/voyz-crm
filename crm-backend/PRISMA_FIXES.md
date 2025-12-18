# Prisma Schema - Required Fixes
## Конкретные изменения для применения

---

## 1. CONTACT MODEL - Критические исправления

### Добавить unique constraints:

```prisma
model Contact {
  id        String   @id @default(uuid())
  fullName  String
  email     String?  @unique  // ИЗМЕНЕНО: добавлен @unique
  phone     String?  @unique  // ИЗМЕНЕНО: добавлен @unique
  position  String?
  // companyName String? // УДАЛИТЬ: дублирует Company.name
  companyId String?
  tags      String[] @default([])
  notes     String?
  social    Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  company   Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)
  deals     Deal[]
  tasks     Task[]
  comments  Comment[]
  activities Activity[]
  files     File[]
  customFieldValues CustomFieldValue[]

  @@index([email])
  @@index([phone])
  // @@index([companyName]) // УДАЛИТЬ: поле удалено
  @@index([companyId])
  @@index([createdAt])
  @@index([fullName])
  @@index([email, phone]) // Composite index for search
  @@index([updatedAt]) // ДОБАВЛЕНО: для сортировки
  @@map("contacts")
}
```

**Альтернатива** (если нужны nullable unique):
```prisma
// В PostgreSQL nullable unique работает только для NULL значений
// Если нужна уникальность только для не-NULL значений:
// CREATE UNIQUE INDEX contacts_email_unique ON contacts (email) WHERE email IS NOT NULL;
// CREATE UNIQUE INDEX contacts_phone_unique ON contacts (phone) WHERE phone IS NOT NULL;
```

---

## 2. COMPANY MODEL - Критические исправления

```prisma
model Company {
  id        String   @id @default(uuid())
  name      String   @unique  // ИЗМЕНЕНО: добавлен @unique
  website   String?
  industry  String?
  email     String?  @unique  // ИЗМЕНЕНО: добавлен @unique
  phone     String?
  social    Json?
  address   String?
  notes     String?
  employees Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  contacts  Contact[]
  deals     Deal[]

  @@index([name])
  @@index([industry])
  @@index([email])
  @@index([phone]) // ДОБАВЛЕНО: для поиска
  @@index([createdAt])
  @@index([updatedAt]) // ДОБАВЛЕНО: для сортировки
  @@map("companies")
}
```

---

## 3. DEAL MODEL - Критические индексы

```prisma
model Deal {
  id              String    @id @default(uuid())
  number          String    @unique
  title           String
  amount          Decimal   @default(0) @db.Decimal(12, 2)
  budget          Decimal?  @db.Decimal(12, 2)
  pipelineId      String
  stageId         String
  assignedToId    String?
  createdById     String
  contactId       String?
  companyId       String?
  expectedCloseAt DateTime?
  closedAt        DateTime?
  description     String?
  tags            String[]  @default([])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  pipeline        Pipeline  @relation(fields: [pipelineId], references: [id])
  stage           Stage     @relation(fields: [stageId], references: [id])
  createdBy       User      @relation("DealCreator", fields: [createdById], references: [id])
  assignedTo      User?     @relation("DealAssignee", fields: [assignedToId], references: [id])
  contact         Contact?  @relation(fields: [contactId], references: [id], onDelete: SetNull)
  company         Company?  @relation(fields: [companyId], references: [id], onDelete: SetNull)
  tasks           Task[]
  comments        Comment[]
  activities      Activity[]
  files           File[]
  customFieldValues CustomFieldValue[]
  messages        Message[]
  calls           Call[]
  chatThreads    ChatThread[]

  @@index([pipelineId])
  @@index([stageId])
  @@index([assignedToId])
  @@index([createdById])
  @@index([contactId])
  @@index([companyId]) // ДОБАВЛЕНО: для связей
  @@index([createdAt])
  @@index([updatedAt]) // ДОБАВЛЕНО: для сортировки
  @@index([expectedCloseAt]) // ДОБАВЛЕНО: для фильтрации
  @@index([closedAt]) // ДОБАВЛЕНО: для аналитики
  @@index([amount]) // ДОБАВЛЕНО: для сортировки/фильтрации
  @@index([pipelineId, stageId]) // ДОБАВЛЕНО: composite для частых запросов
  @@index([assignedToId, stageId]) // ДОБАВЛЕНО: composite для частых запросов
  @@map("deals")
}
```

---

## 4. CUSTOMFIELD MODEL - Оптимизация

```prisma
model CustomField {
  id          String          @id @default(uuid())
  name        String
  key         String          // ИЗМЕНЕНО: убран @unique (избыточно)
  type        CustomFieldType
  entityType  String          // "deal", "contact", "company"
  group       String?
  order       Int             @default(0)
  isRequired  Boolean         @default(false)
  isUnique    Boolean         @default(false)
  defaultValue Json?
  options     Json?
  description String?
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  // Relations
  values      CustomFieldValue[]

  @@unique([key, entityType]) // Оставить только composite unique
  @@index([entityType, isActive])
  @@index([order]) // ДОБАВЛЕНО: для сортировки в UI
  @@index([group]) // ДОБАВЛЕНО: для группировки
  @@map("custom_fields")
}
```

---

## 5. TASK MODEL - Добавить индексы

```prisma
model Task {
  id          String       @id @default(uuid())
  dealId      String?
  contactId   String?
  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  type        TaskType?    @default(OTHER)
  deadline    DateTime?
  completedAt DateTime?
  result      String?
  createdById String
  assignedToId String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Relations
  deal        Deal?        @relation(fields: [dealId], references: [id], onDelete: SetNull)
  contact     Contact?     @relation(fields: [contactId], references: [id], onDelete: SetNull)
  createdBy   User         @relation("TaskCreator", fields: [createdById], references: [id])
  assignedTo User          @relation("TaskAssignee", fields: [assignedToId], references: [id])
  activities  Activity[]
  comments    Comment[]
  files       File[]
  messages    InternalMessage[]
  chatThreads ChatThread[]

  @@index([dealId])
  @@index([contactId])
  @@index([assignedToId])
  @@index([createdById]) // ДОБАВЛЕНО: для фильтрации
  @@index([status])
  @@index([deadline])
  @@index([type])
  @@index([createdAt]) // ДОБАВЛЕНО: для сортировки
  @@map("tasks")
}
```

---

## 6. PIPELINE MODEL - Добавить индекс

```prisma
model Pipeline {
  id          String   @id @default(uuid())
  name        String
  description String?
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  stages      Stage[]
  deals       Deal[]

  @@index([isDefault])
  @@index([order]) // ДОБАВЛЕНО: для сортировки
  @@map("pipelines")
}
```

**Дополнительно**: Создать partial unique index для isDefault (через raw SQL в миграции):
```sql
CREATE UNIQUE INDEX pipelines_single_default ON pipelines (is_default) WHERE is_default = true;
```

---

## 7. MIGRATION STEPS

### Шаг 1: Создать backup базы данных
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Шаг 2: Применить изменения в schema.prisma

### Шаг 3: Создать миграцию
```bash
npx prisma migrate dev --name add_unique_constraints_and_indexes
```

### Шаг 4: Проверить миграцию
```bash
npx prisma migrate status
```

### Шаг 5: Для nullable unique constraints (если нужно)
Если Prisma не поддерживает nullable unique напрямую, добавить в миграцию:
```sql
-- Для Contact
CREATE UNIQUE INDEX contacts_email_unique ON contacts (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX contacts_phone_unique ON contacts (phone) WHERE phone IS NOT NULL;

-- Для Company
CREATE UNIQUE INDEX companies_email_unique ON companies (email) WHERE email IS NOT NULL;
```

### Шаг 6: Для GIN индексов на массивы (опционально)
```sql
CREATE INDEX contacts_tags_gin ON contacts USING GIN (tags);
CREATE INDEX deals_tags_gin ON deals USING GIN (tags);
```

---

## 8. VALIDATION BEFORE IMPORT

### Перед массовым импортом CSV проверить:

1. **Уникальность email/phone в Contact**:
   ```typescript
   // В коде импорта
   const existingContact = await prisma.contact.findUnique({
     where: { email: row.email }
   });
   if (existingContact) {
     // Обновить или пропустить
   }
   ```

2. **Уникальность name в Company**:
   ```typescript
   const existingCompany = await prisma.company.findUnique({
     where: { name: row.companyName }
   });
   ```

3. **Уникальность number в Deal**:
   ```typescript
   const existingDeal = await prisma.deal.findUnique({
     where: { number: row.number }
   });
   ```

4. **Использовать транзакции для batch insert**:
   ```typescript
   await prisma.$transaction(async (tx) => {
     // Batch insert в транзакции
     await tx.contact.createMany({ data: contacts, skipDuplicates: true });
   });
   ```

---

## 9. PERFORMANCE OPTIMIZATIONS

### Для bulk insert (10k-100k строк):

1. **Использовать createMany с skipDuplicates**:
   ```typescript
   await prisma.contact.createMany({
     data: contacts,
     skipDuplicates: true,
   });
   ```

2. **Использовать raw SQL COPY для максимальной производительности**:
   ```typescript
   // Для PostgreSQL
   await prisma.$executeRawUnsafe(`
     COPY contacts (full_name, email, phone, ...)
     FROM STDIN WITH (FORMAT csv, HEADER true)
   `);
   ```

3. **Batch processing**:
   ```typescript
   const BATCH_SIZE = 1000;
   for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
     const batch = contacts.slice(i, i + BATCH_SIZE);
     await prisma.contact.createMany({ data: batch, skipDuplicates: true });
   }
   ```

---

## 10. CHECKLIST

- [ ] Backup базы данных создан
- [ ] Contact.email и Contact.phone имеют @unique
- [ ] Company.name и Company.email имеют @unique
- [ ] Добавлены все индексы в Deal модель
- [ ] Добавлены индексы в Company (phone, updatedAt)
- [ ] Добавлены индексы в CustomField (order, group)
- [ ] Добавлены индексы в Task (createdById, createdAt)
- [ ] Добавлен индекс в Pipeline (order)
- [ ] Удалено поле companyName из Contact (или оставлено как computed)
- [ ] Создана миграция и проверена
- [ ] Добавлена валидация уникальности в код импорта
- [ ] Протестирован импорт на тестовых данных

---

**Приоритет**: Критический - применить перед массовым импортом данных

