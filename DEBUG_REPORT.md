# Отчет: Точка, где строки CSV пропадают при actual import

## Путь данных: rawRows → normalizedRows → validatedRows → toCreate

### 1. rawRows (входные данные)
- **Место**: `csv-import.service.ts`, строка 709
- **Лог**: `[IMPORT DEBUG] parsed rows:`, `rows.length`
- **Факт**: 175 строк

### 2. processedRows (после обработки CSV)
- **Место**: `csv-import.service.ts`, строки 734-934
- **Фильтрация происходит на**:
  - **Строка 752**: Пустые строки → `summary.skipped++`, `continue`
  - **Строка 795**: Отсутствует `pipelineId` → `summary.failed++`, `continue`
  - **Строка 820**: `pipeline === null` → `summary.failed++`, `continue`
  - **Строка 858**: Отсутствует `title` → `summary.failed++`, `continue`
  - **Строка 900**: Отсутствует `stageId` и `stageValue` и `defaultStageId` → `summary.failed++`, `continue`
- **Лог**: `[IMPORT DEALS] Processing stages and deals:`, `processedRowsCount: processedRows.length`
- **Факт**: Если все строки отфильтрованы, `processedRows.length === 0`

### 3. updatedRows (после обновления stageId)
- **Место**: `csv-import.service.ts`, строка 1096
- **Операция**: `processedRows.map()` - НЕ фильтрация, только трансформация
- **Лог**: `[IMPORT DEALS] Before filtering validRows:`, `updatedRowsCount: updatedRows.length`
- **Факт**: `updatedRows.length === processedRows.length` (map не меняет размер)

### 4. validRows (после фильтрации по stageId/stageValue)
- **Место**: `csv-import.service.ts`, строка 1152
- **Условие фильтрации**:
  ```typescript
  const validRows = updatedRows.filter(row => {
    if (row.stageId || row.stageValue) {
      return true;
    }
    if (defaultStageId) {
      row.stageId = defaultStageId;
      return true;
    }
    return false; // ❌ СТРОКА ОТФИЛЬТРОВАНА
  });
  ```
- **Лог**: `[IMPORT DEALS] After filtering validRows:`, `validRowsCount: validRows.length`
- **Факт**: Если `stageId`, `stageValue` и `defaultStageId` отсутствуют → строка отфильтрована

### 5. КРИТИЧЕСКАЯ ТОЧКА: Проверка перед actual import
- **Место**: `csv-import.service.ts`, строка 1265
- **Условие**: `if (finalWorkspaceId || pipeline)`
- **Проблема**: Если `finalWorkspaceId === undefined` И `pipeline === null`, то:
  - Весь блок с `batchCreateDeals` НЕ выполняется
  - Код переходит к строке 1410 (else блок)
  - `batchCreateDeals` НЕ вызывается
  - `summary.failed += validRows.length` (строка 1414)
- **Лог**: `[IMPORT DEALS ERROR] Cannot proceed: both workspaceId and pipeline are missing`

### 6. dealsWithNumber (после валидации в actual import)
- **Место**: `csv-import.service.ts`, строки 1293-1365
- **Фильтрация происходит на**:
  - **Строка 1298**: `!row.stageId || row.stageId.trim() === ''` → `continue`
  - **Строка 1318**: `!row.title || row.title.trim() === ''` → `continue`
  - **Строка 1338**: `!row.pipelineId || row.pipelineId.trim() === ''` → `continue`
- **Лог**: `[IMPORT DEALS] Calling batchCreateDeals:`, `dealsCount: dealsWithNumber.length`
- **Факт**: Если все строки отфильтрованы, `dealsWithNumber.length === 0`

## ТОЧНАЯ ТОЧКА, ГДЕ МАССИВ СТАНОВИТСЯ ПУСТЫМ

### Сценарий 1: pipeline === null в actual import
**Файл**: `crm-backend/src/import-export/csv-import.service.ts`  
**Строка**: 1265  
**Условие**: `if (finalWorkspaceId || pipeline)`  
**Проблема**: Если `pipeline === null` и `finalWorkspaceId === undefined`, условие false  
**Результат**: `batchCreateDeals` НЕ вызывается, код переходит к строке 1410

### Сценарий 2: validRows.length === 0
**Файл**: `crm-backend/src/import-export/csv-import.service.ts`  
**Строка**: 1180  
**Условие**: `if (validRows.length > 0)`  
**Проблема**: Если все строки отфильтрованы на строке 1152, `validRows.length === 0`  
**Результат**: Код переходит к строке 1417, `batchCreateDeals` НЕ вызывается

### Сценарий 3: dealsWithNumber.length === 0
**Файл**: `crm-backend/src/import-export/csv-import.service.ts`  
**Строка**: 1367  
**Проблема**: Если все строки отфильтрованы в цикле 1293-1365, `dealsWithNumber.length === 0`  
**Результат**: `batchCreateDeals([])` вызывается с пустым массивом

## Условие фильтрации, которое срабатывает

**Наиболее вероятная причина**: Строка 1265 - условие `if (finalWorkspaceId || pipeline)` возвращает false

**Почему**:
1. `pipeline` загружается на строке 590, но если не найден → `pipeline = null` (строка 606)
2. В actual import, если `pipeline === null` и `finalWorkspaceId === undefined`, условие false
3. `batchCreateDeals` НЕ вызывается

## Лог, который однозначно подтвердит причину

Добавить ПЕРЕД строкой 1265:

```typescript
console.log('[IMPORT ACTUAL CRITICAL CHECK]', {
  finalWorkspaceId: finalWorkspaceId || 'UNDEFINED',
  hasFinalWorkspaceId: !!finalWorkspaceId,
  pipeline: pipeline ? 'LOADED' : 'NULL',
  hasPipeline: !!pipeline,
  pipelineId: pipelineId,
  conditionWillPass: !!(finalWorkspaceId || pipeline),
  validRowsCount: validRows.length,
  willCallBatchCreateDeals: !!(finalWorkspaceId || pipeline) && validRows.length > 0,
});
```

Если этот лог показывает:
- `conditionWillPass: false` → проблема в строке 1265
- `pipeline: 'NULL'` → pipeline не загружен
- `finalWorkspaceId: 'UNDEFINED'` → workspaceId отсутствует





