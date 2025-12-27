# ✅ Dry-run идентичен actual import

## 🔧 Выполненные изменения

### 1. **Структура данных dealsWithNumber**

**Было** (dry-run):
```typescript
dealsWithNumber.push({
  ...row,
  number: row.number || `DEAL-...`,
  stageId: row.stageId,
  title: row.title,
  pipelineId: rowPipelineId,
});
```

**Стало** (dry-run):
```typescript
const dealToCreate = {
  number: row.number || `DEAL-...`,
  title: row.title,
  amount: row.amount !== undefined ? row.amount : null,
  budget: row.budget !== undefined ? row.budget : null,
  pipelineId: rowPipelineId,
  stageId: row.stageId,
  assignedToId: row.assignedToId !== undefined ? row.assignedToId : null,
  contactId: row.contactId !== undefined ? row.contactId : null,
  companyId: row.companyId !== undefined ? row.companyId : null,
  expectedCloseAt: row.expectedCloseAt !== undefined ? row.expectedCloseAt : null,
  description: row.description !== undefined ? row.description : null,
  tags: row.tags !== undefined ? row.tags : undefined,
  rejectionReasons: row.rejectionReasons !== undefined ? row.rejectionReasons : undefined,
  reason: row.reason !== undefined ? row.reason : null,
};
dealsWithNumber.push(dealToCreate);
```

**Результат**: ✅ **Идентично actual import**

### 2. **Тип dealsWithNumber**

**Было** (dry-run):
```typescript
const dealsWithNumber: Array<{
  number: string;
  title: string;
  amount?: number | string | null;
  budget?: number | string | null;
  pipelineId: string;
  stageId: string;
  assignedToId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  expectedCloseAt?: Date | string | null;
  description?: string | null;
  tags?: string[];
}> = [];
```

**Стало** (dry-run):
```typescript
const dealsWithNumber: Array<{
  number: string;
  title: string;
  amount?: number | string | null;
  budget?: number | string | null;
  pipelineId: string;
  stageId: string;
  assignedToId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  expectedCloseAt?: Date | string | null;
  description?: string | null;
  tags?: string[];
  rejectionReasons?: string[];  // ✅ Добавлено
  reason?: string | null;        // ✅ Добавлено
}> = [];
```

**Результат**: ✅ **Идентично actual import**

### 3. **Логирование**

**Добавлено** (dry-run):
```typescript
console.log(`[IMPORT DEAL DATA] Row ${rowNumber} deal data:`, {
  number: dealToCreate.number,
  title: dealToCreate.title,
  amount: dealToCreate.amount,
  budget: dealToCreate.budget,
  assignedToId: dealToCreate.assignedToId,
  contactId: dealToCreate.contactId,
  companyId: dealToCreate.companyId,
  expectedCloseAt: dealToCreate.expectedCloseAt,
  description: dealToCreate.description ? dealToCreate.description.substring(0, 50) + '...' : null,
  tags: dealToCreate.tags,
  rejectionReasons: dealToCreate.rejectionReasons,
  reason: dealToCreate.reason,
});
```

**Результат**: ✅ **Идентично actual import**

---

## ✅ Итоговый результат

### Dry-run теперь идентичен actual import:

1. ✅ **Те же проверки**:
   - Проверка `stageId` (обязательное)
   - Проверка `title` (обязательное)
   - Проверка `pipelineId` (обязательное для pipeline)
   - Soft validation stageId принадлежит pipeline

2. ✅ **Та же фильтрация строк**:
   - Пропуск строк без `stageId`
   - Пропуск строк без `title`
   - Пропуск строк без `pipelineId`

3. ✅ **Та же логика подготовки данных**:
   - Все поля обрабатываются одинаково
   - `amount`, `budget`, `tags`, `rejectionReasons`, `reason` - все включены
   - Генерация `number` если отсутствует
   - Использование `rowPipelineId` (row.pipelineId или fallback)

4. ✅ **Та же обработка ошибок**:
   - Те же сообщения об ошибках
   - Те же счетчики (`summary.failed++`)
   - Те же логи

### Единственное отличие:

- ❌ **Dry-run НЕ вызывает `batchCreateDeals`**
- ✅ **Actual import вызывает `await this.importBatchService.batchCreateDeals(dealsWithNumber, userId)`**

---

## 📊 Сравнение

| Аспект | Dry-run | Actual import | Статус |
|--------|---------|--------------|--------|
| Валидация stageId | ✅ | ✅ | ✅ Идентично |
| Валидация title | ✅ | ✅ | ✅ Идентично |
| Валидация pipelineId | ✅ | ✅ | ✅ Идентично |
| Подготовка данных (все поля) | ✅ | ✅ | ✅ Идентично |
| Логирование | ✅ | ✅ | ✅ Идентично |
| Обработка ошибок | ✅ | ✅ | ✅ Идентично |
| Вызов batchCreateDeals | ❌ | ✅ | ✅ Единственное отличие |

---

## ✅ Вывод

**Dry-run теперь полностью идентичен actual import, за исключением вызова `batchCreateDeals`.**

Все проверки, фильтрация, подготовка данных и обработка ошибок идентичны.







