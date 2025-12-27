# Анализ проблемы: rejectionReasons не передается при импорте

## Путь данных при импорте

### 1. Фронтенд (CRM/lib/api/import.ts)
- **Функция**: `importDeals()`
- **Что отправляется**: 
  - `rows`: массив распарсенных CSV строк
  - `mapping`: объект маппинга `{ "CSV Column": "crmField" }`
  - **Важно**: `mapping` инвертируется перед отправкой: `{ "crmField": "CSV Column" }`

**Проверка в консоли браузера:**
```javascript
// Должно быть в логах:
[IMPORT MAPPING] {
  original: { "Причина отказа": "rejectionReasons" },  // Формат фронтенда
  inverted: { "rejectionReasons": "Причина отказа" },  // Формат для бэкенда
  allMappedFields: [...],
  hasRejectionReasons: true/false  // Проверить!
}
```

### 2. Бэкенд контроллер (import-export.controller.ts)
- **Эндпоинт**: `POST /api/import/deals`
- **Получает**: DTO с `mapping.rejectionReasons` (название CSV колонки)

**Проверка в логах бэкенда:**
```bash
tail -f /tmp/backend-full.log | grep "IMPORT ENTRY"
```

Должно показать:
```
🔥 IMPORT ENTRY - importDeals called
🔥 Parameters: {
  hasRejectionReasonsMapping: true/false,  // Проверить!
  rejectionReasonsMappingColumn: "Причина отказа",  // Название колонки из CSV
}
🔥 First row sample: {
  hasRejectionReasonsColumn: true/false,  // Проверить!
  rejectionReasonsValue: "Price, Competitor",  // Значение из CSV
}
```

### 3. Парсинг данных (csv-import.service.ts - mapDealRow)
- **Метод**: `mapDealRow()`
- **Логика**:
  1. Проверяет `mapping.rejectionReasons` (название CSV колонки)
  2. Извлекает значение из CSV строки: `getValue(mapping.rejectionReasons)`
  3. Парсит через запятую: `value.split(',').map(r => r.trim())`
  4. Возвращает массив или `undefined`

**Проверка в логах:**
```bash
tail -f /tmp/backend-full.log | grep "MAP DEAL ROW.*rejectionReasons"
```

Должно показать:
```
[MAP DEAL ROW] Row 1 - rejectionReasons mapping check: {
  hasMapping: true,
  mappingColumn: "Причина отказа",
  csvRowHasColumn: true,
}
[MAP DEAL ROW] Row 1 - rejectionReasons value extraction: {
  rawValue: "Price, Competitor",
  csvRowValue: "Price, Competitor",
}
[MAP DEAL ROW] Row 1 - rejectionReasons parsed: {
  parsedReasons: ["Price", "Competitor"],
  count: 2,
}
[MAP DEAL ROW] Row 1 - RETURN result: {
  hasRejectionReasons: true,
  rejectionReasons: ["Price", "Competitor"],
}
```

### 4. Передача в batchCreateDeals (csv-import.service.ts)
- **Перед вызовом**: данные собираются в `dealsWithNumber[]`
- **Проверка**: логи показывают, что передается в `batchCreateDeals`

**Проверка в логах:**
```bash
tail -f /tmp/backend-full.log | grep "IMPORT DEALS.*batchCreateDeals"
```

Должно показать:
```
[IMPORT DEALS] Calling batchCreateDeals: {
  sampleDeal: {
    hasRejectionReasons: true,
    rejectionReasons: ["Price", "Competitor"],
    rejectionReasonsLength: 2,
  }
}
```

### 5. Сохранение в БД (import-batch.service.ts)
- **Метод**: `batchCreateDeals()`
- **Логика**: данные сохраняются через Prisma

**Проверка в логах:**
```bash
tail -f /tmp/backend-full.log | grep "BATCH CREATE DEAL DATA"
```

Должно показать:
```
[BATCH CREATE DEAL DATA] Row 1: {
  rejectionReasons: ["Price", "Competitor"],
  ...
}
```

## Возможные проблемы и решения

### Проблема 1: Маппинг не содержит rejectionReasons
**Симптом**: В логах `hasRejectionReasonsMapping: false`

**Причина**: Пользователь не выбрал маппинг для поля "Причина отказа" на фронтенде

**Решение**: Проверить UI импорта, убедиться что поле маппится

### Проблема 2: CSV колонка не найдена
**Симптом**: В логах `csvRowHasColumn: false` или `rejectionReasonsValue: undefined`

**Причина**: 
- Название колонки в CSV не совпадает с маппингом
- Колонка отсутствует в CSV

**Решение**: Проверить точное название колонки в CSV и маппинг

### Проблема 3: Значение пустое
**Симптом**: В логах `parsedReasons: []` или `rejectionReasonsValue: ""`

**Причина**: В CSV ячейке пустое значение

**Решение**: Проверить данные в CSV файле

### Проблема 4: Данные теряются при передаче
**Симптом**: В `mapDealRow` есть данные, но в `batchCreateDeals` их нет

**Причина**: Данные теряются между сервисами

**Решение**: Проверить логи на всех этапах, найти где теряются

## Инструкция по отладке

1. **Откройте консоль браузера** при импорте
2. **Проверьте логи фронтенда**:
   ```javascript
   // Должны быть логи:
   [IMPORT MAPPING] { ... }
   🔥 IMPORT REQUEST: { ... }
   ```

3. **Проверьте логи бэкенда**:
   ```bash
   tail -f /tmp/backend-full.log | grep -E "(rejectionReasons|MAP DEAL ROW|IMPORT DEAL DATA|batchCreateDeals)"
   ```

4. **Найдите этап, где данные теряются**

5. **Исправьте проблему** на найденном этапе

## Добавленное логирование

Для отладки добавлено детальное логирование на каждом этапе:

1. ✅ Вход в `importDeals` - проверка маппинга
2. ✅ В `mapDealRow` - проверка извлечения значения
3. ✅ Перед `batchCreateDeals` - проверка передаваемых данных
4. ✅ В `batchCreateDeals` - проверка получаемых данных

Все логи содержат префиксы для легкого поиска:
- `🔥 IMPORT ENTRY` - вход в импорт
- `[MAP DEAL ROW]` - парсинг строки
- `[IMPORT DEAL DATA]` - данные перед batchCreateDeals
- `[BATCH CREATE DEAL DATA]` - данные в batchCreateDeals

