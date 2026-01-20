# Интеграция Bulk Delete - План реализации

## Статус

### Backend ✅
- [x] Добавлен `total` в `PaginatedResponse`
- [x] Создан endpoint `GET /api/deals/count`
- [x] Создан endpoint `DELETE /api/deals/bulk`
- [x] Исправлен порядок роутов в контроллере

### Frontend - В процессе
- [x] Создан hook `useSelectionState`
- [x] Добавлены API функции `bulkDeleteDeals`, `getDealsCount`
- [ ] Обновлен интерфейс `PaginatedDealsResponse` (добавить `total`)
- [ ] Интегрирован `useSelectionState` в `DealsPage`
- [ ] Обновлен `DealsListView` с UX паттерном Gmail
- [ ] Обновлена модалка удаления с выбором режима

## Следующие шаги

1. Добавить `total?: number` в `PaginatedDealsResponse`
2. Обновить `DealsPage` для использования `useSelectionState`
3. Добавить загрузку `totalCount` при загрузке списка
4. Обновить `DealsListView` с баннером "Выбрать все"
5. Обновить модалку удаления
