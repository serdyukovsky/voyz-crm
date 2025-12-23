# План дебага: Почему сделки не создаются (30 минут)

## Стратегия: От результата к причине

### Шаг 1: Добавить лог ПЕРЕД batchCreateDeals (2 минуты)

**Место**: `csv-import.service.ts`, строка 1413, ПЕРЕД `console.log('[IMPORT DEALS] Calling batchCreateDeals:')`

**Лог**:
```typescript
console.log('[DEBUG] PRE-BATCH CHECK', {
  dealsWithNumberLength: dealsWithNumber.length,
  validRowsLength: validRows.length,
  conditionPassed: !!(finalWorkspaceId || pipeline),
  finalWorkspaceId: finalWorkspaceId || 'UNDEFINED',
  pipeline: pipeline ? 'LOADED' : 'NULL',
  willCallBatchCreate: dealsWithNumber.length > 0,
});
```

**Почему первым**: Если этот лог не появляется → код не доходит до batchCreateDeals → проблема выше.

---

### Шаг 2: Добавить лог в условие if (finalWorkspaceId || pipeline) (2 минуты)

**Место**: `csv-import.service.ts`, строка 1311, ПЕРЕД `if (finalWorkspaceId || pipeline)`

**Лог**:
```typescript
console.log('[DEBUG] CONDITION CHECK', {
  finalWorkspaceId: finalWorkspaceId || 'UNDEFINED',
  hasFinalWorkspaceId: !!finalWorkspaceId,
  pipeline: pipeline ? 'LOADED' : 'NULL',
  hasPipeline: !!pipeline,
  conditionResult: !!(finalWorkspaceId || pipeline),
  validRowsLength: validRows.length,
  willEnterBlock: !!(finalWorkspaceId || pipeline),
});
```

**Почему вторым**: Если `conditionResult: false` → весь блок не выполняется → batchCreateDeals не вызывается.

---

### Шаг 3: Добавить лог после фильтрации validRows (2 минуты)

**Место**: `csv-import.service.ts`, строка 1195, ПОСЛЕ `console.log('[IMPORT DEALS] After filtering validRows:')`

**Лог**:
```typescript
console.log('[DEBUG] VALID ROWS CHECK', {
  validRowsLength: validRows.length,
  updatedRowsLength: updatedRows.length,
  processedRowsLength: processedRows.length,
  inputRowsLength: rows.length,
  sampleValidRow: validRows[0] ? {
    hasStageId: !!validRows[0].stageId,
    stageId: validRows[0].stageId || 'MISSING',
    hasTitle: !!validRows[0].title,
    title: validRows[0].title || 'MISSING',
    hasPipelineId: !!validRows[0].pipelineId,
    pipelineId: validRows[0].pipelineId || 'MISSING',
  } : null,
  defaultStageId: defaultStageId || 'MISSING',
});
```

**Почему третьим**: Если `validRowsLength: 0` → все строки отфильтрованы → batchCreateDeals не вызывается.

---

### Шаг 4: Добавить лог в цикле валидации dealsWithNumber (3 минуты)

**Место**: `csv-import.service.ts`, строка 1357, ПЕРЕД `dealsWithNumber.push()`

**Лог**:
```typescript
console.log('[DEBUG] ROW VALIDATION PASSED', {
  rowNumber,
  hasStageId: !!row.stageId,
  stageId: row.stageId || 'MISSING',
  hasTitle: !!row.title,
  title: row.title || 'MISSING',
  hasPipelineId: !!row.pipelineId,
  pipelineId: row.pipelineId || 'MISSING',
  dealsWithNumberLength: dealsWithNumber.length,
});
```

**Почему четвертым**: Если этот лог не появляется → все строки отфильтрованы в цикле → dealsWithNumber пустой.

---

### Шаг 5: Добавить лог в блоке else (когда условие false) (2 минуты)

**Место**: `csv-import.service.ts`, строка 1456, в блоке `else { // Neither workspaceId nor pipeline }`

**Лог**:
```typescript
console.log('[DEBUG] CONDITION FAILED - BLOCKED', {
  finalWorkspaceId: finalWorkspaceId || 'UNDEFINED',
  pipeline: pipeline ? 'LOADED' : 'NULL',
  validRowsLength: validRows.length,
  summaryFailed: summary.failed,
});
```

**Почему пятым**: Если этот лог появляется → условие не выполнено → импорт заблокирован.

---

## Порядок проверки логов

1. **Запустить actual import**
2. **Проверить лог `[DEBUG] CONDITION CHECK`**:
   - Если `conditionResult: false` → баг найден: условие не выполнено
   - Если `conditionResult: true` → идем дальше
3. **Проверить лог `[DEBUG] VALID ROWS CHECK`**:
   - Если `validRowsLength: 0` → баг найден: все строки отфильтрованы
   - Если `validRowsLength > 0` → идем дальше
4. **Проверить лог `[DEBUG] PRE-BATCH CHECK`**:
   - Если `dealsWithNumberLength: 0` → баг найден: все строки отфильтрованы в цикле
   - Если `dealsWithNumberLength > 0` → проблема в batchCreateDeals
5. **Проверить лог `[DEBUG] ROW VALIDATION PASSED`**:
   - Если не появляется → все строки отфильтрованы в цикле валидации
   - Если появляется → проблема в batchCreateDeals

---

## Топ-3 условия, которые проверяю первыми

### 1. `if (finalWorkspaceId || pipeline)` → false
**Вероятность**: 80%
**Причина**: pipeline === null или finalWorkspaceId === undefined
**Лог**: `[DEBUG] CONDITION CHECK` покажет `conditionResult: false`
**Баг**: Условие блокирует весь блок с batchCreateDeals

### 2. `validRows.length === 0`
**Вероятность**: 15%
**Причина**: Все строки отфильтрованы из-за отсутствия stageId
**Лог**: `[DEBUG] VALID ROWS CHECK` покажет `validRowsLength: 0`
**Баг**: Фильтр validRows отсекает все строки

### 3. `dealsWithNumber.length === 0`
**Вероятность**: 5%
**Причина**: Все строки отфильтрованы в цикле валидации (stageId, title, pipelineId)
**Лог**: `[DEBUG] PRE-BATCH CHECK` покажет `dealsWithNumberLength: 0`
**Баг**: Валидация в цикле отсекает все строки

---

## Какой баг я ожидаю увидеть

**Наиболее вероятный**: `conditionResult: false` в логе `[DEBUG] CONDITION CHECK`

**Детали**:
- `pipeline: 'NULL'` или `finalWorkspaceId: 'UNDEFINED'`
- `willEnterBlock: false`
- Лог `[DEBUG] CONDITION FAILED - BLOCKED` появляется
- Лог `[DEBUG] PRE-BATCH CHECK` НЕ появляется

**Почему это происходит**:
1. Pipeline не загружается (строка 619: `pipeline = await this.prisma.pipeline.findUnique()`)
2. Или pipeline === null после загрузки (строка 635: `if (!pipeline)`)
3. И finalWorkspaceId === undefined
4. Условие `if (finalWorkspaceId || pipeline)` → false
5. Весь блок с batchCreateDeals не выполняется
6. Код переходит в else блок (строка 1456)
7. `summary.failed += validRows.length` → 0 created

---

## Быстрая проверка (5 минут)

Если нет времени на логи, проверяю вручную:

1. **Проверить pipeline загрузку**:
   ```typescript
   // В логах искать:
   '[IMPORT PIPELINE DEBUG] Pipeline load result:'
   // Если found: false → pipeline === null
   ```

2. **Проверить finalWorkspaceId**:
   ```typescript
   // В логах искать:
   '[IMPORT DEALS] Starting actual import:'
   // Если hasWorkspaceId: false → finalWorkspaceId === undefined
   ```

3. **Проверить условие**:
   ```typescript
   // В логах искать:
   '[IMPORT ACTUAL CRITICAL CHECK]'
   // Если conditionWillPass: false → баг найден
   ```

---

## Итоговый чеклист

- [ ] Добавить лог `[DEBUG] PRE-BATCH CHECK`
- [ ] Добавить лог `[DEBUG] CONDITION CHECK`
- [ ] Добавить лог `[DEBUG] VALID ROWS CHECK`
- [ ] Добавить лог `[DEBUG] ROW VALIDATION PASSED`
- [ ] Добавить лог `[DEBUG] CONDITION FAILED - BLOCKED`
- [ ] Запустить actual import
- [ ] Проверить логи в порядке приоритета
- [ ] Найти баг за 30 минут

