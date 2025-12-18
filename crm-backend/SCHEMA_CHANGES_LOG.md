# Schema Changes Log
## Примененные обязательные изменения

---

## ИЗМЕНЕННЫЕ СТРОКИ

### 1. Contact Model

**Строка 252:**
```prisma
- email     String?
+ email     String?  @unique
```

**Строка 253:**
```prisma
- phone     String?
+ phone     String?  @unique
```

---

### 2. Company Model

**Строка 284:**
```prisma
- name      String
+ name      String   @unique
```

**Строка 287:**
```prisma
- email     String?
+ email     String?  @unique
```

**Строка 303 (добавлена):**
```prisma
+ @@index([phone])
```

---

### 3. Deal Model

**Строка 352 (добавлена):**
```prisma
+ @@index([companyId])
```

**Строка 354 (добавлена):**
```prisma
+ @@index([updatedAt])
```

**Строка 355 (добавлена):**
```prisma
+ @@index([pipelineId, stageId])
```

---

### 4. CustomField Model

**Строка 366:**
```prisma
- key         String          @unique // Unique identifier for the field
+ key         String          // Unique identifier for the field
```

**Примечание:** Убран дублирующийся `@unique` на `key`, оставлен только `@@unique([key, entityType])` на строке 383.

---

### 5. Task Model

**Строка 448 (добавлена):**
```prisma
+ @@index([createdById])
```

**Строка 452 (добавлена):**
```prisma
+ @@index([createdAt])
```

---

### 6. Activity Model

**Строка 512 (добавлена):**
```prisma
+ @@index([dealId, createdAt])
```

---

## ИТОГО ИЗМЕНЕНИЙ

- **Уникальные constraints:** 4 (Contact.email, Contact.phone, Company.name, Company.email)
- **Индексы добавлены:** 7
  - Company.phone
  - Deal.companyId
  - Deal.updatedAt
  - Deal.[pipelineId, stageId]
  - Task.createdById
  - Task.createdAt
  - Activity.[dealId, createdAt]
- **Убрано дублирование:** 1 (CustomField.key @unique)

---

## ВАЛИДАЦИЯ

**Статус:** Схема валидна относительно примененных изменений.

**Примечание:** В схеме есть существующие ошибки валидации, не связанные с данными изменениями:
- Отсутствующие обратные связи в ChatThread и InternalMessage (были до изменений)

---

**Дата изменений:** 2024
**Применено:** Все обязательные изменения из PRISMA_FIXES.md и PERFORMANCE_SCHEMA_FIXES.md

