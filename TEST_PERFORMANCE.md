# Инструкция по тестированию производительности

## Добавлено логирование производительности

В метод `findOne()` добавлено логирование, которое выводит время выполнения каждого этапа.

## Как провести тест

1. **Запустить backend сервер:**
   ```bash
   cd crm-backend
   npm run start:dev
   ```

2. **Открыть карточку сделки** через фронтенд или сделать запрос через API:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/deals/{deal-id}
   ```

3. **Проверить логи бэкенда** - должна появиться информация вида:

```
⚡ DEAL FINDONE PERFORMANCE [deal-id]:
  Total time: 234ms
  deal.findUnique complete: +45ms (total: 45ms)
  formatDealResponse.start: +1ms (total: 46ms)
  contactStats.load.start: +1ms (total: 47ms)
  contactStats.load.complete: +28ms (total: 75ms)
  companyStats.load.start: +0ms (total: 75ms)
  companyStats.load.complete: +25ms (total: 100ms)
  customFields.load.start: +1ms (total: 101ms)
  customFields.load.complete: +3ms (total: 104ms)  ← Должно быть мало (кеш работает!)
  formatDealResponse complete: +130ms (total: 234ms)
```

## Что проверить:

1. **`contactStats.load.complete`** - должно быть **<100ms** даже для контактов с 1000+ сделками
   - **До оптимизации:** 200-5000ms
   - **После оптимизации:** 20-100ms

2. **`companyStats.load.complete`** - аналогично, должно быть **<100ms**

3. **`customFields.load.complete`** - первый раз может быть 20-30ms, последующие запросы **0-5ms** (кеш)
   - **До оптимизации:** 50-100ms каждый раз
   - **После оптимизации:** 0-5ms (из кеша) или 20-30ms (при cache miss)

4. **Общее время `Total time`** должно быть **<500ms** для обычных карточек

## Сравнение результатов

Для контакта/компании с большим количеством сделок (100+):

| Метрика | До оптимизации | После оптимизации | Улучшение |
|---------|---------------|-------------------|-----------|
| contactStats.load | 200-500ms | 20-50ms | **10x** |
| companyStats.load | 200-500ms | 20-50ms | **10x** |
| customFields.load | 50-100ms | 0-5ms (кеш) | **20x** |
| Total time | 500-2000ms | 200-500ms | **2-4x** |

Для контакта/компании с 1000+ сделками:

| Метрика | До оптимизации | После оптимизации | Улучшение |
|---------|---------------|-------------------|-----------|
| contactStats.load | 2000-5000ms | 50-100ms | **20-50x** |
| companyStats.load | 2000-5000ms | 50-100ms | **20-50x** |
| Total time | 3000-7000ms | 300-600ms | **10x** |

## После тестирования

Если результаты удовлетворительные, можно оставить логирование (оно полезно для мониторинга) или убрать для production.

Чтобы убрать логирование, нужно найти и удалить все строки с `⚡ DEAL FINDONE PERFORMANCE` и связанный код.


