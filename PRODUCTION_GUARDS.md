# Минимальный набор guard-проверок для production-качества импорта

## Цель
Гарантировать, что:
1. Импорт не стартует, если systemFields отсутствуют
2. Импорт не стартует, если после нормализации 0 строк
3. Пользователь ВСЕГДА получает причину, а не "0 imported"

---

## Guard 1: Проверка systemFields в getImportMeta()

**Место в коде**: `csv-import.service.ts`, метод `getMixedImportMeta()`, после строки 139

**Проверка**:
```typescript
// CRITICAL RUNTIME CHECK: systemFields must not be empty
if (!systemFields || systemFields.length === 0) {
  const errorMessage = 'FATAL: systemFields is empty or undefined. Import meta is corrupted. This prevents users from creating field mappings.';
  console.error('[IMPORT META FATAL ERROR]', {
    error: errorMessage,
    dealMetaSystemFields: dealMeta.systemFields,
    dealMetaSystemFieldsType: typeof dealMeta.systemFields,
    dealMetaSystemFieldsIsArray: Array.isArray(dealMeta.systemFields),
    dealMetaSystemFieldsLength: Array.isArray(dealMeta.systemFields) ? dealMeta.systemFields.length : 'N/A',
  });
  throw new Error(errorMessage);
}
```

**Текст ошибки для API response**:
```
"Import configuration error: System fields are missing. Please contact support."
```

**HTTP Status**: `500 Internal Server Error`

**Когда срабатывает**: При запросе `GET /api/import/meta?entityType=deal`

---

## Guard 2: Проверка systemFields в getDealsImportMeta()

**Место в коде**: `csv-import.service.ts`, метод `getDealsImportMeta()`, после строки 111

**Проверка**:
```typescript
// CRITICAL RUNTIME CHECK: systemFields must not be empty
if (!systemFields || systemFields.length === 0) {
  const errorMessage = 'FATAL: Deal systemFields is empty. This is a programming error - systemFields must be defined in getDealsImportMeta().';
  console.error('[IMPORT META FATAL ERROR]', {
    error: errorMessage,
    systemFields,
    systemFieldsType: typeof systemFields,
    systemFieldsIsArray: Array.isArray(systemFields),
  });
  throw new Error(errorMessage);
}
```

**Текст ошибки для API response**:
```
"Import configuration error: Deal system fields are missing. Please contact support."
```

**HTTP Status**: `500 Internal Server Error`

**Когда срабатывает**: При запросе `GET /api/import/meta?entityType=deal`

---

## Guard 3: Проверка rows.length === 0 в начале importDeals()

**Место в коде**: `csv-import.service.ts`, метод `importDeals()`, после строки 483 (после логирования параметров)

**Проверка**:
```typescript
// GUARD: Early check - no rows to process
if (!rows || !Array.isArray(rows) || rows.length === 0) {
  const errorMessage = 'No rows provided for import. CSV file is empty or could not be parsed.';
  console.error('[IMPORT DEALS GUARD]', {
    error: errorMessage,
    rows: rows,
    rowsType: typeof rows,
    rowsIsArray: Array.isArray(rows),
    rowsLength: Array.isArray(rows) ? rows.length : 'N/A',
  });
  
  if (dryRun) {
    return {
      summary: { total: 0, created: 0, updated: 0, failed: 0, skipped: 0 },
      errors: [],
      globalErrors: [errorMessage],
    };
  }
  throw new BadRequestException(errorMessage);
}
```

**Текст ошибки для API response**:
```
"No rows provided for import. CSV file is empty or could not be parsed."
```

**HTTP Status**: `400 Bad Request`

**Когда срабатывает**: При вызове `POST /api/import/deals` с пустым массивом rows

---

## Guard 4: Проверка processedRows.length === 0 после нормализации

**Место в коде**: `csv-import.service.ts`, метод `importDeals()`, после строки 968 (после обработки всех строк)

**Проверка**:
```typescript
// GUARD: Check if any rows survived normalization
if (processedRows.length === 0) {
  const errorMessage = `All ${rows.length} rows were filtered out during normalization. Common reasons: missing required fields (title, pipelineId), invalid pipeline, or empty rows.`;
  console.error('[IMPORT DEALS GUARD]', {
    error: errorMessage,
    inputRowsCount: rows.length,
    processedRowsCount: processedRows.length,
    summary: {
      total: summary.total,
      failed: summary.failed,
      skipped: summary.skipped,
    },
    globalErrors,
    errorsCount: errors.length,
    sampleErrors: errors.slice(0, 3),
  });
  
  if (dryRun) {
    return {
      summary,
      errors: errors.slice(0, 10), // Limit errors in response
      globalErrors: globalErrors.length > 0 ? globalErrors : [errorMessage],
      warnings,
    };
  }
  
  // In actual import, return detailed error
  return {
    summary,
    errors: errors.slice(0, 10), // Limit errors in response
    globalErrors: globalErrors.length > 0 ? globalErrors : [errorMessage],
    warnings,
  };
}
```

**Текст ошибки для API response**:
```
"All rows were filtered out during normalization. Common reasons: missing required fields (title, pipelineId), invalid pipeline, or empty rows."
```

**HTTP Status**: `200 OK` (с ошибками в response)

**Когда срабатывает**: После обработки всех CSV строк, если все отфильтрованы

---

## Guard 5: Проверка validRows.length === 0 после фильтрации по stageId

**Место в коде**: `csv-import.service.ts`, метод `importDeals()`, после строки 1200 (после фильтрации validRows)

**Проверка**:
```typescript
// GUARD: Check if any rows survived stageId filtering
if (validRows.length === 0) {
  const errorMessage = `All ${updatedRows.length} rows were filtered out due to missing stage information. Each row must have: stageId, stageValue (from CSV), or pipeline must have a default stage.`;
  console.error('[IMPORT DEALS GUARD]', {
    error: errorMessage,
    processedRowsCount: processedRows.length,
    updatedRowsCount: updatedRows.length,
    validRowsCount: validRows.length,
    defaultStageId,
    hasPipeline: !!pipeline,
    pipelineId,
    sampleUpdatedRow: updatedRows[0] ? {
      hasStageId: !!updatedRows[0].stageId,
      hasStageValue: !!updatedRows[0].stageValue,
      stageId: updatedRows[0].stageId,
      stageValue: updatedRows[0].stageValue,
      title: updatedRows[0].title,
    } : null,
  });
  
  if (dryRun) {
    return {
      summary: {
        ...summary,
        failed: updatedRows.length,
      },
      errors: errors.slice(0, 10),
      globalErrors: globalErrors.length > 0 ? globalErrors : [errorMessage],
      warnings,
    };
  }
  
  return {
    summary: {
      ...summary,
      failed: updatedRows.length,
    },
    errors: errors.slice(0, 10),
    globalErrors: globalErrors.length > 0 ? globalErrors : [errorMessage],
    warnings,
  };
}
```

**Текст ошибки для API response**:
```
"All rows were filtered out due to missing stage information. Each row must have: stageId, stageValue (from CSV), or pipeline must have a default stage."
```

**HTTP Status**: `200 OK` (с ошибками в response)

**Когда срабатывает**: После фильтрации validRows, если все строки отфильтрованы из-за отсутствия stageId

---

## Guard 6: Проверка dealsWithNumber.length === 0 перед batchCreateDeals()

**Место в коде**: `csv-import.service.ts`, метод `importDeals()`, после строки 1411 (после валидации в цикле)

**Проверка**:
```typescript
// GUARD: Check if any rows survived final validation
if (dealsWithNumber.length === 0) {
  const errorMessage = `All ${validRows.length} rows were filtered out during final validation. Common reasons: missing stageId, missing title, or missing pipelineId.`;
  console.error('[IMPORT DEALS GUARD]', {
    error: errorMessage,
    validRowsCount: validRows.length,
    dealsWithNumberCount: dealsWithNumber.length,
    filteredOut: validRows.length - dealsWithNumber.length,
    sampleValidRow: validRows[0] ? {
      hasStageId: !!validRows[0].stageId,
      hasTitle: !!validRows[0].title,
      hasPipelineId: !!validRows[0].pipelineId,
      stageId: validRows[0].stageId,
      title: validRows[0].title,
      pipelineId: validRows[0].pipelineId,
    } : null,
  });
  
  return {
    summary: {
      ...summary,
      failed: validRows.length,
    },
    errors: errors.slice(0, 10),
    globalErrors: globalErrors.length > 0 ? globalErrors : [errorMessage],
    warnings,
  };
}
```

**Текст ошибки для API response**:
```
"All rows were filtered out during final validation. Common reasons: missing stageId, missing title, or missing pipelineId."
```

**HTTP Status**: `200 OK` (с ошибками в response)

**Когда срабатывает**: Перед вызовом batchCreateDeals, если все строки отфильтрованы в цикле валидации

---

## Guard 7: Проверка условия (finalWorkspaceId || pipeline) в actual import

**Место в коде**: `csv-import.service.ts`, метод `importDeals()`, после строки 1309 (перед проверкой условия)

**Проверка**:
```typescript
// GUARD: Check condition before actual import
if (!(finalWorkspaceId || pipeline)) {
  const errorMessage = `Cannot proceed with import: both workspaceId and pipeline are missing. WorkspaceId: ${finalWorkspaceId || 'undefined'}, Pipeline: ${pipeline ? 'loaded' : 'null'}.`;
  console.error('[IMPORT DEALS GUARD]', {
    error: errorMessage,
    finalWorkspaceId: finalWorkspaceId || 'UNDEFINED',
    hasFinalWorkspaceId: !!finalWorkspaceId,
    pipeline: pipeline ? 'LOADED' : 'NULL',
    hasPipeline: !!pipeline,
    pipelineId,
    validRowsCount: validRows.length,
  });
  
  return {
    summary: {
      ...summary,
      failed: validRows.length,
    },
    errors: errors.slice(0, 10),
    globalErrors: [errorMessage],
    warnings,
  };
}
```

**Текст ошибки для API response**:
```
"Cannot proceed with import: both workspaceId and pipeline are missing. Please ensure workspaceId is provided or pipeline is loaded."
```

**HTTP Status**: `200 OK` (с ошибками в response)

**Когда срабатывает**: В actual import, если условие `if (finalWorkspaceId || pipeline)` не выполняется

---

## Итоговый список проверок

| # | Проверка | Место в коде | Текст ошибки | HTTP Status |
|---|----------|--------------|--------------|-------------|
| 1 | systemFields в getMixedImportMeta() | После строки 139 | "Import configuration error: System fields are missing. Please contact support." | 500 |
| 2 | systemFields в getDealsImportMeta() | После строки 111 | "Import configuration error: Deal system fields are missing. Please contact support." | 500 |
| 3 | rows.length === 0 | После строки 483 | "No rows provided for import. CSV file is empty or could not be parsed." | 400 |
| 4 | processedRows.length === 0 | После строки 968 | "All rows were filtered out during normalization. Common reasons: missing required fields (title, pipelineId), invalid pipeline, or empty rows." | 200 |
| 5 | validRows.length === 0 | После строки 1200 | "All rows were filtered out due to missing stage information. Each row must have: stageId, stageValue (from CSV), or pipeline must have a default stage." | 200 |
| 6 | dealsWithNumber.length === 0 | После строки 1411 | "All rows were filtered out during final validation. Common reasons: missing stageId, missing title, or missing pipelineId." | 200 |
| 7 | !(finalWorkspaceId \|\| pipeline) | После строки 1309 | "Cannot proceed with import: both workspaceId and pipeline are missing. Please ensure workspaceId is provided or pipeline is loaded." | 200 |

---

## Принципы

1. **Раннее обнаружение**: Проверки выполняются как можно раньше в процессе
2. **Понятные сообщения**: Каждая ошибка содержит конкретную причину и возможные решения
3. **Детальное логирование**: Все guard-проверки логируют контекст для debugging
4. **Консистентность**: Все проверки возвращают структурированный ответ с summary, errors, globalErrors
5. **Dry-run поддержка**: Все проверки работают в dry-run режиме, возвращая ошибки вместо исключений

---

## Результат

После внедрения всех guard-проверок:
- ✅ Импорт не стартует, если systemFields отсутствуют (Guard 1, 2)
- ✅ Импорт не стартует, если после нормализации 0 строк (Guard 3, 4)
- ✅ Пользователь ВСЕГДА получает причину, а не "0 imported" (Guards 4, 5, 6, 7)



