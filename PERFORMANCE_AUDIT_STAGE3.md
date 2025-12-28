# ЭТАП 3: OVERFETCHING

## АНАЛИЗ ТЕКУЩИХ INCLUDE В findAll()

### GET /api/deals (findAll)

**Текущий код:**
```typescript
const deals = await this.prisma.deal.findMany({
  where,
  include: {
    stage: true,                    // ✅ Используется
    pipeline: {
      include: {
        stages: {                   // ❌ ПРОБЛЕМА: дублируется для каждой сделки!
          orderBy: { order: 'asc' },
        },
      },
    },
    createdBy: true,                // ❓ Используется редко
    assignedTo: true,               // ✅ Используется
    contact: {
      include: {
        company: true,              // ✅ Используется
      },
    },
    company: true,                  // ✅ Используется
    customFieldValues: {            // ❌ ПРОБЛЕМА: не нужен для списка!
      include: { customField: true },
    },
  },
  orderBy: { updatedAt: 'desc' },
});
```

---

## ЧТО РЕАЛЬНО ИСПОЛЬЗУЕТСЯ НА ФРОНТЕНДЕ

### Deals List View:

**Используемые поля:**
- `id` ✅
- `title` ✅
- `amount` ✅
- `stage.id` ✅
- `stage.name` ✅ (через stages массив)
- `assignedTo.id` ✅
- `assignedTo.name` ✅ (или firstName + lastName)
- `assignedTo.avatar` ✅
- `contact.fullName` ✅ (или company.name)
- `company.name` ✅
- `updatedAt` ✅

**НЕ используются:**
- `pipeline.stages` ❌ - дублируется для каждой сделки, нужен один раз
- `createdBy` ❌ - не показывается в списке
- `customFieldValues` ❌ - не показывается в списке
- `contact.stats` ❌ - не показывается в списке (добавляется в formatDealResponse)
- `company.stats` ❌ - не показывается в списке (добавляется в formatDealResponse)
- `description` ❌ - не показывается в списке

### Deals Kanban View:

**Используемые поля:**
- Те же, что в List View
- Плюс `stage.color` для отображения колонок

---

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ OVERFETCHING

### Проблема #1: `pipeline.stages` дублируется

**Текущее состояние:**
- Для каждой сделки загружается полный pipeline со всеми stages
- При 1000 сделок в одном pipeline = 1000 × N stages = огромное дублирование

**Решение:**
1. Загружать pipeline один раз отдельно
2. Или вообще не включать в deals (если stages уже загружены на фронте)

**Экономия:**
- Для 1000 сделок: убрать ~999 дубликатов pipeline.stages
- Размер данных: уменьшение на 30-50%

---

### Проблема #2: `customFieldValues` не нужен для списка

**Текущее состояние:**
- Загружаются все customFieldValues + customFields для каждой сделки
- Это может быть 10-50 полей на сделку

**Решение:**
- Убрать из findAll()
- Загружать только в findOne() (детальный просмотр)

**Экономия:**
- Для 1000 сделок: убрать ~10000-50000 записей customFieldValues
- Размер данных: уменьшение на 20-40%

---

### Проблема #3: `contact.stats` и `company.stats` не нужны для списка

**Текущее состояние:**
- В formatDealResponse() добавляются stats (activeDeals, closedDeals, totalDealVolume)
- Это требует дополнительных SQL-запросов

**Решение:**
- Убрать stats из findAll()
- Загружать только в findOne()

**Экономия:**
- Убрать 2 batch-запроса к deals таблице
- Время выполнения: улучшение на 20-30%

---

### Проблема #4: `createdBy` не используется

**Текущее состояние:**
- Загружается User (createdBy) для каждой сделки
- Не отображается в списке

**Решение:**
- Убрать из findAll()
- Загружать только в findOne() если нужно

**Экономия:**
- Минимальная (но все равно лишнее)

---

## РЕКОМЕНДУЕМАЯ ОПТИМИЗАЦИЯ

### Для findAll() (список):

```typescript
const deals = await this.prisma.deal.findMany({
  where,
  select: {
    id: true,
    title: true,
    amount: true,
    stageId: true,
    pipelineId: true,
    assignedToId: true,
    contactId: true,
    companyId: true,
    updatedAt: true,
    createdAt: true,
    
    // Только необходимые relations
    stage: {
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
      },
    },
    assignedTo: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    },
    contact: {
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        companyName: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    company: {
      select: {
        id: true,
        name: true,
        industry: true,
      },
    },
    // ❌ УБРАТЬ: pipeline (будет загружен отдельно)
    // ❌ УБРАТЬ: createdBy
    // ❌ УБРАТЬ: customFieldValues
  },
  orderBy: { updatedAt: 'desc' },
});
```

**Изменения:**
- ✅ Использовать `select` вместо `include` (явно указываем поля)
- ❌ Убрать `pipeline` (загружать отдельно или не нужен)
- ❌ Убрать `createdBy`
- ❌ Убрать `customFieldValues`
- ❌ Убрать `contact.stats` и `company.stats` из formatDealResponse()

---

## ОЦЕНКА ЭФФЕКТИВНОСТИ

### До оптимизации (1000 сделок):

| Данные | Размер |
|--------|--------|
| Pipeline.stages (дубликаты) | ~2-3 MB |
| CustomFieldValues | ~2-4 MB |
| Contact/Company stats | ~500 KB |
| CreatedBy | ~200 KB |
| **ИТОГО лишнего** | **~5-8 MB** |

### После оптимизации:

| Экономия | Размер |
|----------|--------|
| Pipeline.stages | -2-3 MB |
| CustomFieldValues | -2-4 MB |
| Stats | -500 KB |
| CreatedBy | -200 KB |
| **ИТОГО экономия** | **~5-8 MB (50-70%)** |

**Улучшение:**
- Размер JSON: уменьшение в 2-3 раза
- Время передачи: улучшение в 2-3 раза
- SQL-запросы: убрать 2 batch-запроса для stats

---

## ДЛЯ findOne() (детальный просмотр)

Здесь можно оставить все include, т.к.:
- Загружается только одна сделка
- В детальном просмотре нужны все данные
- Производительность не критична (один запрос)

**Но оптимизировать можно:**
- Использовать `select` вместо `include` для явности
- Lazy load для больших relations (tasks, comments, activities)

---

## ДЛЯ tasks.findAll()

Аналогичные проблемы:

**Текущий код:**
```typescript
include: {
  deal: {
    include: {
      stage: true,
      contact: true,
    },
  },
  contact: {
    include: {
      company: true,
    },
  },
  assignedTo: true,
  createdBy: true,
}
```

**Оптимизация:**
```typescript
select: {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  deadline: true,
  dealId: true,
  contactId: true,
  assignedToId: true,
  createdAt: true,
  updatedAt: true,
  
  deal: {
    select: {
      id: true,
      title: true,
      stage: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  contact: {
    select: {
      id: true,
      fullName: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  assignedTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
  // ❌ УБРАТЬ: createdBy (не используется)
  // ❌ УБРАТЬ: contact.stats (не нужен для списка)
}
```

---

## ПЛАН ВНЕДРЕНИЯ

### Фаза 1: Убрать pipeline.stages из deals
- Загружать pipeline отдельно (если нужен)
- Убрать из findAll()

### Фаза 2: Убрать customFieldValues
- Убрать из findAll()
- Оставить только в findOne()

### Фаза 3: Убрать stats из findAll()
- Убрать getContactStatsBatch() и getCompanyStatsBatch() из findAll()
- Оставить только в findOne()

### Фаза 4: Перейти на select
- Заменить include на select для явности
- Убрать createdBy

---

## РИСКИ

### Риск 1: Ломание фронтенда
- **Mitigation:** Тестирование на dev окружении
- **Rollback:** Вернуть include

### Риск 2: Нужны данные, которые убрали
- **Mitigation:** Проверить использование на фронте
- **Rollback:** Вернуть нужные поля

### Риск 3: Pipeline нужен на фронте
- **Mitigation:** Загружать отдельно или кешировать
- **Rollback:** Вернуть pipeline, но без stages

---

## ВЫВОДЫ

1. **pipeline.stages** - самое большое дублирование
2. **customFieldValues** - не нужен для списка
3. **stats** - лишние запросы для списка
4. **select vs include** - select явнее и контролируемее
5. **Экономия ~50-70%** размера ответа


