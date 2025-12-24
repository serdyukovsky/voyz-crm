# Анализ различий: Dry-Run vs Actual Import

## 1. Различия в коде

### 1.1. Dry-Run (строки 1211-1246)

```typescript
if (dryRun) {
  if (!resolvedWorkspaceId) {
    // No DB checks - just count all as "would create"
    validRows.forEach(() => {
      summary.created++;  // ❌ Просто считает, без валидации
    });
  } else {
    // Проверяет только существующие deals по number
    validRows.forEach((row) => {
      if (row.number && existingDeals.has(row.number)) {
        summary.updated++;
      } else {
        summary.created++;  // ❌ Считает без валидации данных
      }
    });
  }
}
```

**Что НЕ проверяется:**
- ❌ Условие `if (finalWorkspaceId || pipeline)` (строка 1311)
- ❌ Валидация `stageId` на пустоту (строка 1344)
- ❌ Валидация `title` на пустоту (строка 1364)
- ❌ Валидация `pipelineId` на пустоту (строка 1384)
- ❌ Проверка, что `pipeline` загружен (строка 1311)
- ❌ FK constraints (stageId должен существовать в БД)
- ❌ Вызов `batchCreateDeals` (строка 1424)

### 1.2. Actual Import (строки 1247-1443)

```typescript
else {
  // Проверка 1: workspaceId или pipeline
  if (!finalWorkspaceId) {
    if (pipeline) {
      // Продолжаем
    } else {
      summary.failed += validRows.length;  // ✅ Останавливается здесь
      return;
    }
  }
  
  // Проверка 2: условие для продолжения
  if (finalWorkspaceId || pipeline) {  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА
    // Проверка 3: валидация каждой строки
    for (let rowIndex = 0; rowIndex < validRows.length; rowIndex++) {
      // ✅ Проверка stageId
      if (!row.stageId || row.stageId.trim() === '') {
        summary.failed++;
        continue;  // Пропускает строку
      }
      // ✅ Проверка title
      if (!row.title || row.title.trim() === '') {
        summary.failed++;
        continue;
      }
      // ✅ Проверка pipelineId
      if (!row.pipelineId || row.pipelineId.trim() === '') {
        summary.failed++;
        continue;
      }
      // Только после всех проверок добавляется в dealsWithNumber
      dealsWithNumber.push({...});
    }
    // ✅ Вызов batchCreateDeals
    await this.importBatchService.batchCreateDeals(dealsWithNumber, userId);
  } else {
    // ✅ Останавливается, если условие не выполнено
    summary.failed += validRows.length;
  }
}
```

## 2. Проверки, которые НЕ выполняются в dry-run

### 2.1. Проверка условия `if (finalWorkspaceId || pipeline)` (строка 1311)
**В dry-run:** Не проверяется  
**В actual import:** Критическая проверка - если false, весь блок не выполняется

### 2.2. Валидация stageId (строка 1344)
**В dry-run:** Не проверяется  
**В actual import:** `if (!row.stageId || row.stageId.trim() === '')` → строка пропускается

### 2.3. Валидация title (строка 1364)
**В dry-run:** Не проверяется  
**В actual import:** `if (!row.title || row.title.trim() === '')` → строка пропускается

### 2.4. Валидация pipelineId (строка 1384)
**В dry-run:** Не проверяется  
**В actual import:** `if (!row.pipelineId || row.pipelineId.trim() === '')` → строка пропускается

### 2.5. Проверка загрузки pipeline (строка 1311)
**В dry-run:** Не проверяется  
**В actual import:** `if (finalWorkspaceId || pipeline)` → если pipeline === null, условие false

### 2.6. FK constraints (stageId должен существовать)
**В dry-run:** Не проверяется  
**В actual import:** Проверяется в `batchCreateDeals` → Prisma выбрасывает ошибку

## 3. Данные, которые dry-run игнорирует

### 3.1. workspaceId
**Dry-run:** Игнорируется (строка 1216: `if (!resolvedWorkspaceId) { /* просто считает */ }`)  
**Actual import:** Критично (строка 1285: `if (!finalWorkspaceId) { /* останавливается */ }`)

### 3.2. pipeline (объект)
**Dry-run:** Игнорируется  
**Actual import:** Критично (строка 1311: `if (finalWorkspaceId || pipeline)`)

### 3.3. stageId (пустой или отсутствует)
**Dry-run:** Игнорируется  
**Actual import:** Критично (строка 1344: `if (!row.stageId || row.stageId.trim() === '')`)

### 3.4. title (пустой или отсутствует)
**Dry-run:** Игнорируется  
**Actual import:** Критично (строка 1364: `if (!row.title || row.title.trim() === '')`)

### 3.5. pipelineId (пустой или отсутствует)
**Dry-run:** Игнорируется  
**Actual import:** Критично (строка 1384: `if (!row.pipelineId || row.pipelineId.trim() === '')`)

### 3.6. FK constraints
**Dry-run:** Игнорируются  
**Actual import:** Проверяются в Prisma (stageId должен существовать в БД)

## 4. Почему dry-run показывает 20, а actual import = 0

### Сценарий 1: pipeline === null
- **Dry-run:** Считает все 20 строк как "будет создано"
- **Actual import:** Условие `if (finalWorkspaceId || pipeline)` → false → `batchCreateDeals` не вызывается → 0 created

### Сценарий 2: stageId отсутствует во всех строках
- **Dry-run:** Считает все 20 строк как "будет создано"
- **Actual import:** Все строки отфильтровываются в цикле (строка 1344) → `dealsWithNumber.length === 0` → 0 created

### Сценарий 3: finalWorkspaceId === undefined и pipeline === null
- **Dry-run:** Считает все 20 строк как "будет создано"
- **Actual import:** Условие `if (finalWorkspaceId || pipeline)` → false → `batchCreateDeals` не вызывается → 0 created

## 5. Решение: Сделать dry-run честным

### Вариант 1: Выполнять те же проверки, что и в actual import

```typescript
if (dryRun) {
  // Выполнять те же проверки, что и в actual import
  if (!(finalWorkspaceId || pipeline)) {
    warnings.push('⚠️ DRY-RUN APPROXIMATION: workspaceId and pipeline are missing. Actual import will fail.');
    summary.failed = validRows.length;
    return;
  }
  
  // Валидировать каждую строку
  let validCount = 0;
  for (const row of validRows) {
    if (!row.stageId || row.stageId.trim() === '') {
      continue;  // Пропускаем
    }
    if (!row.title || row.title.trim() === '') {
      continue;
    }
    if (!row.pipelineId || row.pipelineId.trim() === '') {
      continue;
    }
    validCount++;
  }
  
  // Проверять существующие deals
  const numbers = validRows.map(r => r.number).filter(Boolean);
  const existingDeals = await this.importBatchService.batchFindDealsByNumbers(numbers);
  
  validRows.forEach((row) => {
    if (row.number && existingDeals.has(row.number)) {
      summary.updated++;
    } else if (row.stageId && row.title && row.pipelineId) {
      summary.created++;
    } else {
      summary.failed++;
    }
  });
}
```

### Вариант 2: Явно пометить как приблизительный

```typescript
if (dryRun) {
  const isApproximate = !(finalWorkspaceId || pipeline) || 
                        validRows.some(r => !r.stageId || !r.title || !r.pipelineId);
  
  if (isApproximate) {
    warnings.push('⚠️ DRY-RUN APPROXIMATION: Some validations are skipped. Actual import may fail.');
  }
  
  // Текущая логика, но с предупреждением
  validRows.forEach(() => {
    summary.created++;
  });
}
```

### Вариант 3: Выполнять все проверки, но не создавать записи

```typescript
if (dryRun) {
  // Выполнять ВСЕ проверки из actual import
  const dealsWithNumber = [];
  
  for (const row of validRows) {
    if (!row.stageId || row.stageId.trim() === '') {
      summary.failed++;
      continue;
    }
    if (!row.title || row.title.trim() === '') {
      summary.failed++;
      continue;
    }
    if (!row.pipelineId || row.pipelineId.trim() === '') {
      summary.failed++;
      continue;
    }
    dealsWithNumber.push(row);
  }
  
  // Проверять существующие deals
  const numbers = dealsWithNumber.map(r => r.number).filter(Boolean);
  const existingDeals = await this.importBatchService.batchFindDealsByNumbers(numbers);
  
  dealsWithNumber.forEach((row) => {
    if (row.number && existingDeals.has(row.number)) {
      summary.updated++;
    } else {
      summary.created++;
    }
  });
  
  // НЕ вызывать batchCreateDeals, но показать реальное количество
}
```

## 6. Рекомендация

**Вариант 3** - самый честный:
- Выполняет все проверки из actual import
- Показывает реальное количество строк, которые будут созданы
- Не создает записи в БД
- Пользователь видит точный результат



