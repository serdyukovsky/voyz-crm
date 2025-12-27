# Результаты тестирования производительности открытия карточки сделки

## Как запустить тест

1. Запустить backend сервер
2. Открыть карточку любой сделки через фронтенд или API
3. В логах бэкенда будет выведена информация о производительности:

```
⚡ DEAL FINDONE PERFORMANCE [deal-id]:
  Total time: XXXms
  deal.findUnique complete: +XXms (total: XXms)
  formatDealResponse.start: +Xms (total: XXms)
  contactStats.load.start: +Xms (total: XXms)
  contactStats.load.complete: +XXms (total: XXXms)
  companyStats.load.start: +Xms (total: XXXms)
  companyStats.load.complete: +XXms (total: XXXms)
  customFields.load.start: +Xms (total: XXXms)
  customFields.load.complete: +XXms (total: XXXms)
  formatDealResponse complete: +Xms (total: XXXms)
```

## Ожидаемые результаты после оптимизации

### До оптимизации:
- `contactStats.load`: **200-500ms** (для контакта с 100+ сделками)
- `companyStats.load`: **200-500ms** (для компании с 100+ сделками)
- `customFields.load`: **50-100ms** (каждый раз запрос к БД)
- **Total time: 500-2000ms**

### После оптимизации:
- `contactStats.load`: **20-50ms** (aggregate вместо findMany)
- `companyStats.load`: **20-50ms** (aggregate вместо findMany)
- `customFields.load`: **0-5ms** (из кеша, или 20-30ms при cache miss)
- **Total time: 200-500ms**

### Для контактов/компаний с 1000+ сделками:
- **До:** `contactStats.load`: 2000-5000ms
- **После:** `contactStats.load`: 50-100ms
- **Ускорение: 20-50x**

## Что проверить

1. Первый запрос после старта сервера:
   - `customFields.load` должен быть ~20-30ms (cache miss)
   - `contactStats.load` должен быть быстрым (aggregate)

2. Второй запрос (кеш работает):
   - `customFields.load` должен быть ~0-5ms (из кеша)

3. Контакт/компания с большим количеством сделок:
   - `contactStats.load` должен быть <100ms даже для 1000+ сделок
   - Старое поведение: 2000-5000ms

## Удаление логирования

После тестирования, чтобы убрать логирование производительности, нужно:

1. Удалить код логирования из `findOne()` метода
2. Удалить параметр `perfLogStep` из `formatDealResponse()`
3. Удалить все вызовы `perfLogStep?.()` внутри `formatDealResponse()`

Или оставить логирование, но сделать его условным (только в development режиме).

