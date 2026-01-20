# Статус реализации массового удаления

## ✅ Выполнено

### Backend
1. ✅ Добавлен `total` в `PaginatedResponse` (crm-backend/src/common/dto/pagination.dto.ts)
2. ✅ Обновлен `deals.service.findAll()` для подсчета total
3. ✅ Создан метод `count()` в `DealsService`
4. ✅ Создан endpoint `GET /api/deals/count`
5. ✅ Создан DTO `BulkDeleteDto` (crm-backend/src/deals/dto/bulk-delete.dto.ts)
6. ✅ Реализован метод `bulkDelete()` в `DealsService` с батчами по 1000
7. ✅ Создан endpoint `DELETE /api/deals/bulk`
8. ✅ Исправлен порядок роутов (count перед :id, bulk перед :id)

### Frontend - API
1. ✅ Создан hook `useSelectionState` (CRM/hooks/use-selection-state.ts)
2. ✅ Добавлены функции `bulkDeleteDeals()` и `getDealsCount()` в CRM/lib/api/deals.ts
3. ✅ Backend компилируется без ошибок
4. ✅ TypeScript линтер проходит

## ⏳ Осталось реализовать

### Frontend - Интеграция
1. ⏳ Добавить `total?: number` в `PaginatedDealsResponse` (строка 39)
2. ⏳ Интегрировать `useSelectionState` в `DealsPage.tsx`
   - Заменить `selectedDeals: string[]` на `useSelectionState()`
   - Загружать `totalCount` при загрузке списка
   - Обновить `handleBulkDelete` для использования нового API
3. ⏳ Обновить `DealsListView.tsx`:
   - Добавить пропсы для `totalCount` и `selectionMode`
   - Добавить баннер "Выбрано N элементов. Выбрать все M элементов?"
   - Обновить логику чекбокса "Выбрать все"
4. ⏳ Обновить модалку удаления в `DealsPage.tsx`:
   - Добавить выбор режима: "Удалить только выбранные (N)" vs "Удалить все по фильтру (M)"
   - Использовать `bulkDeleteDeals` вместо цикла `deleteDeal`
   - Показывать `deletedCount` из ответа

## Файлы для изменения

### Обязательные изменения:
1. `CRM/lib/api/deals.ts` - добавить `total?: number` в `PaginatedDealsResponse` (строка 39)
2. `CRM/src/pages/DealsPage.tsx` - интеграция `useSelectionState` и обновление модалки
3. `CRM/components/crm/deals-list-view.tsx` - добавление UX паттерна Gmail

### Опционально (для других списков):
- `CRM/src/pages/ContactsPage.tsx`
- `CRM/src/pages/CompaniesPage.tsx`
- `CRM/app/contacts/page.tsx`
- `CRM/app/companies/page.tsx`

## Как продолжить

1. Добавить `total?: number` в интерфейс
2. Обновить `DealsPage` для сохранения `totalCount` из ответа API
3. Интегрировать `useSelectionState` hook
4. Обновить `DealsListView` с баннером
5. Обновить модалку удаления
