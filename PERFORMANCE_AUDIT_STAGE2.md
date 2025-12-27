# ЭТАП 2: ПАГИНАЦИЯ

## ТЕКУЩЕЕ СОСТОЯНИЕ

### GET /api/deals (findAll)

**Код:**
```typescript
const deals = await this.prisma.deal.findMany({
  where,
  include: { /* огромный список */ },
  orderBy: { updatedAt: 'desc' },
  // ❌ НЕТ take, skip, cursor
});
```

**Проблема:** Загружаются ВСЕ сделки без ограничений.

---

### GET /api/tasks (findAll)

**Код:**
```typescript
const tasks = await this.prisma.task.findMany({
  where,
  include: { /* вложенные данные */ },
  orderBy: { createdAt: 'desc' },
  // ❌ НЕТ take, skip, cursor
});
```

**Проблема:** Загружаются ВСЕ задачи без ограничений.

---

## АНАЛИЗ ИСПОЛЬЗОВАНИЯ НА ФРОНТЕНДЕ

### Deals:
1. **Kanban Board** (`deals-kanban-board.tsx`):
   - Загружает все сделки для pipeline
   - Отображает их в колонках (stages)
   - Проблема: при 1000+ сделках = медленно

2. **List View** (`deals-list-view.tsx`):
   - Загружает все сделки
   - Отображает в таблице
   - Нет пагинации на фронте

### Tasks:
1. **Kanban View** (`tasks-kanban-view.tsx`):
   - Загружает все задачи
   - Отображает в колонках (status)

2. **List View** (`tasks-list-view.tsx`):
   - Загружает все задачи
   - Отображает в таблице
   - Нет пагинации на фронте

---

## СТРАТЕГИЯ ПАГИНАЦИИ

### Вариант 1: OFFSET-based (не рекомендую)

```typescript
findMany({
  take: 20,
  skip: 40, // offset
})
```

**Почему плохо:**
- При большом offset PostgreSQL должен отсортировать все предыдущие записи
- `OFFSET 10000 LIMIT 20` = сортировка 10000+ записей
- Линейный рост времени: O(n) где n = offset
- При 10000 offset = очень медленно

**SQL:**
```sql
SELECT * FROM deals 
WHERE ... 
ORDER BY updatedAt DESC 
OFFSET 10000 LIMIT 20;
-- Должен отсортировать 10000+ записей перед возвратом 20
```

---

### Вариант 2: CURSOR-based (РЕКОМЕНДУЮ)

```typescript
findMany({
  take: 20,
  cursor: { id: 'last-deal-id' },
  skip: 1, // skip cursor itself
})
```

**Почему хорошо:**
- Использует индекс по ID
- Константное время: O(log n)
- Работает одинаково быстро на любой странице

**SQL:**
```sql
SELECT * FROM deals 
WHERE id > 'last-deal-id' AND ...
ORDER BY id ASC
LIMIT 20;
-- Использует индекс по id, очень быстро
```

**Но есть нюанс:** Cursor-based требует сортировку по ID, а нам нужна по `updatedAt`.

**Решение:** Комбинированный курсор:
```typescript
cursor: { 
  updatedAt: '2024-01-01T00:00:00Z',
  id: 'fallback-id' 
}
```

Или использовать `updatedAt` как cursor (если уникален):
```typescript
cursor: { updatedAt: '2024-01-01T00:00:00Z' }
```

**Проблема:** `updatedAt` может быть не уникальным (несколько сделок обновлены одновременно).

**Решение:** Составной курсор `(updatedAt, id)`:
```typescript
where: {
  OR: [
    { updatedAt: { lt: cursor.updatedAt } },
    { 
      updatedAt: cursor.updatedAt,
      id: { lt: cursor.id }
    }
  ]
}
orderBy: [
  { updatedAt: 'desc' },
  { id: 'desc' }
]
```

---

## РЕАЛИЗАЦИЯ: CURSOR-BASED PAGINATION

### Изменения API (обратная совместимость):

#### Было:
```typescript
GET /api/deals?pipelineId=xxx
// Возвращает: Deal[]
```

#### Станет:
```typescript
GET /api/deals?pipelineId=xxx&limit=20&cursor=xxx
// Возвращает: { data: Deal[], nextCursor?: string, hasMore: boolean }

// Если cursor не передан - возвращает первые 20
// Если limit не передан - по умолчанию 50 (безопасный максимум)
// Если limit > 100 - ограничиваем до 100
```

**Обратная совместимость:**
- Если параметры не переданы → возвращаем первые 50 записей (защита от полной загрузки)
- Если переданы → используем пагинацию

---

### Структура ответа:

```typescript
interface PaginatedResponse<T> {
  data: T[]
  nextCursor?: string // base64 encoded: { updatedAt: string, id: string }
  hasMore: boolean
  total?: number // опционально, если нужен count
}
```

**Cursor формат:**
```typescript
// Encode: { updatedAt: '2024-01-01T00:00:00Z', id: 'deal-id' }
// Base64: eyJ1cGRhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwWiIsImlkIjoiZGVhbC1pZCJ9
```

---

## ПЛАН ВНЕДРЕНИЯ

### Шаг 1: Добавить DTO для пагинации

```typescript
// dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50; // default 50

  @IsOptional()
  cursor?: string; // base64 encoded cursor
}
```

### Шаг 2: Обновить контроллер

```typescript
@Get()
findAll(
  @Query() pagination: PaginationDto,
  @Query('pipelineId') pipelineId?: string,
  // ... другие фильтры
) {
  return this.dealsService.findAll({
    ...filters,
    limit: pagination.limit || 50,
    cursor: pagination.cursor ? this.decodeCursor(pagination.cursor) : undefined,
  });
}
```

### Шаг 3: Обновить сервис

```typescript
async findAll(filters?: {
  // ... существующие фильтры
  limit?: number;
  cursor?: { updatedAt: Date; id: string };
}) {
  const limit = Math.min(filters?.limit || 50, 100); // max 100
  const take = limit + 1; // +1 to check if hasMore

  const where: any = { ...existingWhere };
  
  // Add cursor condition
  if (filters?.cursor) {
    where.OR = [
      { updatedAt: { lt: filters.cursor.updatedAt } },
      {
        updatedAt: filters.cursor.updatedAt,
        id: { lt: filters.cursor.id },
      },
    ];
  }

  const deals = await this.prisma.deal.findMany({
    where,
    include: { /* оптимизированный список */ },
    orderBy: [
      { updatedAt: 'desc' },
      { id: 'desc' }, // для стабильной сортировки
    ],
    take,
  });

  const hasMore = deals.length > limit;
  const data = hasMore ? deals.slice(0, limit) : deals;
  
  const nextCursor = hasMore && data.length > 0
    ? this.encodeCursor({
        updatedAt: data[data.length - 1].updatedAt,
        id: data[data.length - 1].id,
      })
    : undefined;

  return {
    data: await Promise.all(data.map(...formatDealResponse)),
    nextCursor,
    hasMore,
  };
}
```

### Шаг 4: Обновить фронтенд

**Минимальные изменения:**
- Если нет cursor → загружать первые 50
- Если есть cursor → загружать следующую страницу
- Для Kanban: загружать по частям или использовать виртуализацию

---

## ОЦЕНКА ЭФФЕКТИВНОСТИ

### До пагинации (1000 сделок):
- SQL-запросов: 9
- Строк из БД: ~5000-10000
- Время: ~2-5 сек
- Размер JSON: ~5-10 MB

### После пагинации (50 сделок на страницу):
- SQL-запросов: 9 (те же, но на меньше данных)
- Строк из БД: ~250-500
- Время: ~200-500ms (улучшение в 10x)
- Размер JSON: ~250-500 KB (улучшение в 20x)

---

## РИСКИ И MITIGATION

### Риск 1: Ломание API
- **Mitigation:** Обратная совместимость (если параметры не переданы → ограничиваем до 50)
- **Rollback:** Вернуть старую логику (без limit)

### Риск 2: Фронтенд не готов
- **Mitigation:** Постепенное внедрение (сначала бэкенд, потом фронтенд)
- **Rollback:** Вернуть старую структуру ответа

### Риск 3: Неправильная сортировка
- **Mitigation:** Тестирование на реальных данных
- **Rollback:** Вернуть старую сортировку

### Риск 4: Cursor формат меняется
- **Mitigation:** Версионирование cursor (v1: base64, v2: ...)
- **Rollback:** Поддержка старого формата

---

## АЛЬТЕРНАТИВНЫЙ ПОДХОД: HARD LIMIT

Если пагинация слишком сложна для текущего фронтенда, можно начать с hard limit:

```typescript
const deals = await this.prisma.deal.findMany({
  where,
  take: 500, // hard limit
  orderBy: { updatedAt: 'desc' },
});
```

**Плюсы:**
- Простая реализация
- Защита от полной загрузки
- Обратная совместимость

**Минусы:**
- Не решает проблему полностью
- При 500+ записях все равно медленно
- Не масштабируется

**Рекомендация:** Использовать как промежуточное решение, потом перейти на cursor-based.

---

## РЕКОМЕНДАЦИЯ

### Фаза 1: Hard limit (быстро, безопасно)
1. Добавить `take: 100` в findAll()
2. Добавить параметр `limit` в контроллер (макс 100)
3. Тестирование

### Фаза 2: Cursor-based (правильное решение)
1. Реализовать cursor-based пагинацию
2. Обновить фронтенд для поддержки
3. Миграция с hard limit на cursor

---

## ИНДЕКСЫ ДЛЯ ПАГИНАЦИИ

Для эффективной пагинации нужен индекс:

```prisma
model Deal {
  // ...
  
  @@index([updatedAt, id]) // составной индекс для cursor-based
}
```

**Почему:**
- Сортировка `ORDER BY updatedAt DESC, id DESC` использует индекс
- Cursor `WHERE updatedAt < X AND id < Y` использует индекс
- Очень быстро даже на миллионах записей

**Риск:** Замедление INSERT/UPDATE (но минимальное, т.к. updatedAt и так индексирован)

**Rollback:** Удалить индекс

---

## ЧЕКЛИСТ ВНЕДРЕНИЯ

- [ ] Создать PaginationDto
- [ ] Добавить метод encodeCursor/decodeCursor
- [ ] Обновить findAll() для deals с cursor-based пагинацией
- [ ] Добавить составной индекс [updatedAt, id] для Deal
- [ ] Обновить findAll() для tasks (аналогично)
- [ ] Добавить составной индекс [createdAt, id] для Task
- [ ] Тестирование на реальных данных
- [ ] Обновить фронтенд (постепенно)
- [ ] Мониторинг производительности

---

## ВЫВОДЫ

1. **OFFSET-based пагинация не подходит** для больших данных
2. **Cursor-based пагинация** - правильное решение
3. **Hard limit** - промежуточное решение для быстрого фикса
4. **Составные индексы** обязательны для эффективности
5. **Обратная совместимость** важна для постепенного внедрения

