# Объяснение лишних данных (OVERFETCHING)

## ПРОБЛЕМА #1: pipeline.stages - ДУБЛИРОВАНИЕ

### Что происходит сейчас:

```typescript
// В deals.service.ts, строка 241-265
const deals = await this.prisma.deal.findMany({
  where: { pipelineId: 'pipeline-123' }, // например, 1000 сделок в одном pipeline
  include: {
    pipeline: {
      include: {
        stages: {                    // ← ВОТ ЭТО ПРОБЛЕМА
          orderBy: { order: 'asc' },
        },
      },
    },
  },
});
```

**Что получается:**
- У нас есть 1 pipeline с 10 stages
- У нас есть 1000 сделок в этом pipeline
- **Результат:** Для КАЖДОЙ из 1000 сделок мы загружаем полный pipeline со всеми 10 stages
- **Итого:** Pipeline со stages дублируется **1000 раз** в ответе!

**Пример JSON ответа (упрощенно):**
```json
[
  {
    "id": "deal-1",
    "title": "Deal 1",
    "pipeline": {
      "id": "pipeline-123",
      "name": "Sales Pipeline",
      "stages": [                    // ← ДУБЛИРУЕТСЯ
        { "id": "stage-1", "name": "New" },
        { "id": "stage-2", "name": "Qualified" },
        // ... еще 8 stages
      ]
    }
  },
  {
    "id": "deal-2",
    "title": "Deal 2",
    "pipeline": {
      "id": "pipeline-123",         // ← ТОТ ЖЕ PIPELINE
      "name": "Sales Pipeline",
      "stages": [                    // ← ТОТ ЖЕ СПИСОК STAGES (дубликат!)
        { "id": "stage-1", "name": "New" },
        { "id": "stage-2", "name": "Qualified" },
        // ... еще 8 stages
      ]
    }
  },
  // ... еще 998 сделок с тем же pipeline.stages
]
```

**Размер данных:**
- 1 pipeline со stages ≈ 2-3 KB
- 1000 дубликатов ≈ **2-3 MB лишних данных**

### Где это используется на фронте:

**DealsKanbanBoard** (строка 2187):
```typescript
// stages загружаются из selectedPipeline (который уже есть на фронте!)
const stages = (selectedPipeline.stages || []).sort((a, b) => a.order - b.order)
```

**DealDetail** (строка 257):
```typescript
// Используется только в детальном просмотре одной сделки
if (deal.pipeline?.stages && deal.pipeline.stages.length > 0) {
  setPipeline(deal.pipeline)
}
```

**Вывод:** 
- В Kanban: stages уже есть в `selectedPipeline`, дубликат не нужен
- В List View: pipeline.stages вообще не используется
- В Detail: используется, но это одна сделка, не критично

**Решение:** Убрать `pipeline.stages` из findAll(), загружать отдельно если нужно

---

## ПРОБЛЕМА #2: customFieldValues - НЕ НУЖЕН ДЛЯ СПИСКА

### Что происходит сейчас:

```typescript
// В deals.service.ts, строка 260-262
include: {
  customFieldValues: {              // ← ВОТ ЭТО ПРОБЛЕМА
    include: { customField: true },
  },
}
```

**Что такое customFieldValues:**
- Это дополнительные поля, которые пользователь может добавить к сделкам
- Например: "Источник лида", "Бюджет проекта", "Дата первого контакта" и т.д.
- Может быть 10-50 кастомных полей на сделку

**Что получается:**
- У нас есть 1000 сделок
- У каждой сделки может быть 10-50 customFieldValues
- **Результат:** Загружаем 10000-50000 записей customFieldValues + customFields

**Пример:**
```json
{
  "id": "deal-1",
  "title": "Deal 1",
  "customFieldValues": [              // ← ВОТ ЭТО ПРОБЛЕМА
    {
      "id": "value-1",
      "value": "Google Ads",
      "customField": {
        "id": "field-1",
        "name": "Источник лида",
        "type": "SELECT",
        "options": {...}
      }
    },
    {
      "id": "value-2",
      "value": "50000",
      "customField": {
        "id": "field-2",
        "name": "Бюджет проекта",
        "type": "NUMBER"
      }
    },
    // ... еще 8-48 полей
  ]
}
```

**Размер данных:**
- 1 customFieldValue ≈ 200-500 bytes
- 10-50 на сделку × 1000 сделок ≈ **2-25 MB лишних данных**

### Где это используется на фронте:

**DealsListView** - НЕ используется
**DealsKanbanBoard** - НЕ используется  
**DealDetail** - используется, но это одна сделка

**Вывод:**
- В списках customFieldValues вообще не показываются
- Нужны только в детальном просмотре (findOne)

**Решение:** Убрать `customFieldValues` из findAll(), оставить только в findOne()

---

## ПРОБЛЕМА #3: stats - ЛИШНИЕ ЗАПРОСЫ И ДАННЫЕ

### Что происходит сейчас:

```typescript
// В deals.service.ts, строка 276-284
// Собираем все contactId и companyId
const contactIds = [...new Set(deals.map(d => d.contactId).filter(Boolean))];
const companyIds = [...new Set(deals.map(d => d.companyId).filter(Boolean))];

// Загружаем статистику по сделкам для каждого контакта/компании
const [contactStatsMap, companyStatsMap] = await Promise.all([
  this.getContactStatsBatch(contactIds),  // ← ДОПОЛНИТЕЛЬНЫЙ ЗАПРОС К БД
  this.getCompanyStatsBatch(companyIds),  // ← ДОПОЛНИТЕЛЬНЫЙ ЗАПРОС К БД
]);

// В formatDealResponse (строка 384)
result.contact = {
  // ...
  stats: stats,  // ← ДОБАВЛЯЕТСЯ К КАЖДОМУ КОНТАКТУ
}
```

**Что такое stats:**
- Статистика по сделкам контакта/компании:
  - `activeDeals` - количество активных сделок
  - `closedDeals` - количество закрытых сделок
  - `totalDeals` - всего сделок
  - `totalDealVolume` - общий объем закрытых сделок

**Что получается:**
```typescript
// getContactStatsBatch делает такой запрос:
const deals = await this.prisma.deal.findMany({
  where: { contactId: { in: contactIds } },  // ← ЕЩЕ ОДИН ЗАПРОС К deals
  select: { id: true, contactId: true, amount: true, closedAt: true },
});
// Потом считает статистику в памяти
```

**Пример данных:**
```json
{
  "id": "deal-1",
  "contact": {
    "id": "contact-123",
    "fullName": "John Doe",
    "stats": {                           // ← ВОТ ЭТО ПРОБЛЕМА
      "activeDeals": 5,
      "closedDeals": 10,
      "totalDeals": 15,
      "totalDealVolume": 500000
    }
  }
}
```

**Размер данных:**
- 1 stats объект ≈ 50-100 bytes
- 1000 контактов × 100 bytes ≈ **100 KB**
- + 2 дополнительных SQL-запроса к БД

### Где это используется на фронте:

**DealsListView** - НЕ используется  
**DealsKanbanBoard** - НЕ используется  
**DealDetail** - используется (показывается статистика контакта/компании)

**Вывод:**
- Stats нужны только в детальном просмотре
- Для списка это лишние данные и лишние запросы

**Решение:** Убрать stats из findAll(), оставить только в findOne()

---

## ИТОГО: ЧТО ЛИШНЕЕ

### Для списка сделок (findAll):

| Данные | Размер (1000 сделок) | Нужен ли? | Где используется? |
|--------|---------------------|-----------|-------------------|
| `pipeline.stages` | ~2-3 MB | ❌ НЕТ | Уже есть на фронте или не используется |
| `customFieldValues` | ~2-25 MB | ❌ НЕТ | Только в детальном просмотре |
| `contact.stats` | ~100 KB | ❌ НЕТ | Только в детальном просмотре |
| `company.stats` | ~100 KB | ❌ НЕТ | Только в детальном просмотре |
| `createdBy` | ~200 KB | ❌ НЕТ | Не показывается в списке |
| **ИТОГО лишнего** | **~5-30 MB** | | |

### Что нужно оставить:

| Данные | Нужен ли? | Где используется? |
|--------|-----------|-------------------|
| `id`, `title`, `amount` | ✅ ДА | В списке |
| `stage` (id, name, color) | ✅ ДА | Отображение стадии |
| `assignedTo` (id, name, avatar) | ✅ ДА | Кто назначен |
| `contact` (id, fullName, email, phone) | ✅ ДА | Информация о контакте |
| `company` (id, name) | ✅ ДА | Информация о компании |
| `updatedAt` | ✅ ДА | Сортировка |

---

## ВИЗУАЛЬНОЕ СРАВНЕНИЕ

### Сейчас (с лишними данными):

```
GET /api/deals?pipelineId=xxx
↓
SQL: SELECT deals + JOIN pipeline.stages + JOIN customFieldValues + ...
↓
Результат: 1000 сделок × (deal + pipeline.stages + customFieldValues + stats)
↓
Размер: 5-10 MB JSON
Время: 2-5 секунд
```

### После оптимизации:

```
GET /api/deals?pipelineId=xxx
↓
SQL: SELECT только нужные поля deals + stage + assignedTo + contact + company
↓
Результат: 1000 сделок × (только нужные поля)
↓
Размер: 1.5-3 MB JSON (уменьшение в 3-5 раз)
Время: 1-2 секунды (улучшение в 2-3 раза)
```

---

## РЕШЕНИЕ

### Было:
```typescript
include: {
  pipeline: { include: { stages: true } },  // ❌ Дублируется
  customFieldValues: { include: { customField: true } },  // ❌ Не нужен
  contact: { include: { company: true } },  // ✅ Нужен
  // + stats добавляются в formatDealResponse  // ❌ Не нужен
}
```

### Станет:
```typescript
select: {
  id: true,
  title: true,
  amount: true,
  stageId: true,
  updatedAt: true,
  stage: {
    select: { id: true, name: true, color: true }
  },
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, avatar: true }
  },
  contact: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      company: { select: { id: true, name: true } }
    }
    // ❌ БЕЗ stats
  },
  company: {
    select: { id: true, name: true }
    // ❌ БЕЗ stats
  }
  // ❌ БЕЗ pipeline
  // ❌ БЕЗ customFieldValues
}
```

**Результат:** Экономия 50-70% размера данных + убрать 2 SQL-запроса

