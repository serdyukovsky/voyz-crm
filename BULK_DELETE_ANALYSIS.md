# Анализ текущей реализации массового удаления

## Текущее состояние

### Frontend

#### 1. Selection State
**Файлы:**
- `CRM/src/pages/DealsPage.tsx` - `selectedDeals: string[]` (строка 198)
- `CRM/components/crm/deals-list-view.tsx` - `selectedDeals?: string[]` (строка 20)

**Текущая реализация:**
```typescript
const [selectedDeals, setSelectedDeals] = useState<string[]>([])

// Выбор всех на странице
const handleSelectAll = (checked: boolean) => {
  onSelectDeals(checked ? deals.map(d => d.id) : [])
}
```

**Проблема:** Выбирает только элементы на текущей странице.

---

#### 2. Bulk Delete
**Файлы:**
- `CRM/src/pages/DealsPage.tsx` - `handleBulkDelete()` (строка 552)
- `CRM/lib/api/deals.ts` - `deleteDeal(id: string)` (строка 242)

**Текущая реализация:**
```typescript
const confirmBulkDelete = async () => {
  // Удаляет по одному через Promise.all
  await Promise.all(
    dealsToDelete.map(dealId => deleteDeal(dealId))
  )
}
```

**Проблема:** 
- Удаляет только выбранные ID на странице
- Нет поддержки удаления по фильтрам
- Нет подсчета общего количества (M)

---

#### 3. Пагинация
**Файлы:**
- `CRM/lib/api/deals.ts` - `getDeals()` возвращает `PaginatedDealsResponse`
- `CRM/src/pages/DealsPage.tsx` - использует cursor-based пагинацию

**Текущая структура:**
```typescript
interface PaginatedDealsResponse {
  data: Deal[]
  nextCursor?: string
  hasMore: boolean
  // ❌ НЕТ totalCount
}
```

**Проблема:** Нет `totalCount` для отображения общего количества (M).

---

### Backend

#### 1. API Endpoints
**Файлы:**
- `crm-backend/src/deals/deals.controller.ts`
- `crm-backend/src/deals/deals.service.ts`

**Текущие endpoints:**
- `GET /api/deals` - список с пагинацией (cursor-based)
- `DELETE /api/deals/:id` - удаление одной сделки

**Проблема:** 
- Нет `DELETE /api/deals/bulk`
- Нет `GET /api/deals/count` для подсчета по фильтрам
- `GET /api/deals` не возвращает `totalCount`

---

#### 2. Пагинация
**Файлы:**
- `crm-backend/src/common/dto/pagination.dto.ts`
- `crm-backend/src/deals/deals.service.ts` - `findAll()`

**Текущая реализация:**
```typescript
interface PaginatedResponse<T> {
  data: T[]
  nextCursor?: string
  hasMore: boolean
  // ❌ НЕТ total
}
```

---

## Предлагаемая структура решения

### 1. Selection State Model

```typescript
type SelectionMode = 'PAGE' | 'ALL_MATCHING'

interface SelectionState {
  selectedIds: Set<string>        // Выбранные ID на странице
  selectionMode: SelectionMode    // Режим выбора
  excludedIds: Set<string>        // Исключенные ID (для ALL_MATCHING)
  pageCount: number               // Количество на странице (N)
  totalCount?: number             // Общее количество по фильтру (M)
}
```

**Логика:**
- `PAGE`: `selectedIds` содержит только ID с текущей страницы
- `ALL_MATCHING`: все элементы по фильтру выбраны, кроме `excludedIds`

---

### 2. Backend API

#### 2.1. Добавить totalCount в пагинацию
```typescript
// crm-backend/src/common/dto/pagination.dto.ts
interface PaginatedResponse<T> {
  data: T[]
  nextCursor?: string
  hasMore: boolean
  total?: number  // ✅ НОВОЕ
}
```

#### 2.2. Endpoint для подсчета
```typescript
// GET /api/deals/count
// Query params: те же фильтры что и в GET /api/deals
// Response: { count: number }
```

#### 2.3. Bulk Delete Endpoint
```typescript
// DELETE /api/deals/bulk
// Body:
{
  mode: 'IDS' | 'FILTER',
  ids?: string[],           // для mode: 'IDS'
  excludedIds?: string[],   // для mode: 'FILTER' (исключить из удаления)
  filter?: {                // для mode: 'FILTER'
    pipelineId?: string,
    stageId?: string,
    assignedToId?: string,
    contactId?: string,
    companyId?: string,
    search?: string,
    // ... другие фильтры
  }
}
// Response:
{
  deletedCount: number,
  failedCount: number,
  errors?: Array<{ id: string, error: string }>
}
```

---

### 3. Frontend UX

#### 3.1. Чекбокс "Выбрать все на странице"
```tsx
// В deals-list-view.tsx
<input
  type="checkbox"
  checked={allSelectedOnPage}
  onChange={(e) => handleSelectAllOnPage(e.target.checked)}
/>
```

#### 3.2. Баннер "Выбрать все M элементов"
```tsx
{selectionMode === 'PAGE' && selectedIds.size === pageCount && (
  <div className="banner">
    Выбрано {pageCount} элементов на этой странице.
    Выбрать все {totalCount} элементов по текущему фильтру?
    <button onClick={handleSelectAllMatching}>Выбрать все</button>
  </div>
)}
```

#### 3.3. Модалка удаления
```tsx
<Dialog>
  <div>
    <label>
      <input type="radio" checked={deleteMode === 'PAGE'} />
      Удалить только выбранные на странице ({selectedIds.size})
    </label>
    <label>
      <input type="radio" checked={deleteMode === 'ALL_MATCHING'} />
      Удалить все найденные по текущему фильтру ({totalCount})
    </label>
  </div>
</Dialog>
```

---

## План реализации

### Этап 1: Backend - totalCount и count endpoint
1. Добавить `total` в `PaginatedResponse`
2. Обновить `deals.service.findAll()` для подсчета total
3. Создать `GET /api/deals/count` endpoint

### Этап 2: Backend - bulk delete endpoint
1. Создать DTO для bulk delete
2. Реализовать `DELETE /api/deals/bulk` в контроллере
3. Реализовать логику в сервисе (батчи по 1000, транзакции)

### Этап 3: Frontend - selection state
1. Создать `useSelectionState` hook
2. Обновить `DealsListView` для использования нового state
3. Добавить баннер "Выбрать все"

### Этап 4: Frontend - модалка удаления
1. Обновить модалку с выбором режима
2. Интегрировать с новым bulk delete API
3. Показывать результат (deletedCount)

### Этап 5: Тесты
1. Unit тесты для selection reducer
2. Backend тесты для bulk delete

---

## Файлы для изменения

### Backend
- `crm-backend/src/common/dto/pagination.dto.ts` - добавить total
- `crm-backend/src/deals/deals.service.ts` - добавить count и bulk delete
- `crm-backend/src/deals/deals.controller.ts` - добавить endpoints
- `crm-backend/src/deals/dto/bulk-delete.dto.ts` - новый файл

### Frontend
- `CRM/lib/api/deals.ts` - добавить getDealsCount, bulkDeleteDeals
- `CRM/src/pages/DealsPage.tsx` - обновить selection state
- `CRM/components/crm/deals-list-view.tsx` - добавить UX паттерн
- `CRM/hooks/use-selection-state.ts` - новый hook
