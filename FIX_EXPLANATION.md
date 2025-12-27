# ✅ Исправление ошибки обновления сделок

## Проблема:
При обновлении сделок через `tx.deal.update()` Prisma выдавала ошибку:
```
Unknown argument `pipelineId`. Did you mean `pipeline`?
```

## Причина:
В Prisma при обновлении связанных полей (relations) нельзя передавать ID напрямую. Нужно использовать синтаксис `connect`/`disconnect`.

## Решение:
Исправлен код в `import-batch.service.ts`, строка ~451:

**Было (неправильно):**
```typescript
const updateData: any = { ...baseDealData };
// baseDealData содержал pipelineId, stageId напрямую
```

**Стало (правильно):**
```typescript
const updateData: any = {};

// Обычные поля
if (baseDealData.title !== undefined) updateData.title = baseDealData.title;
// ... другие поля

// Связи через connect
if (baseDealData.pipelineId) {
  updateData.pipeline = { connect: { id: baseDealData.pipelineId } };
}
if (baseDealData.stageId) {
  updateData.stage = { connect: { id: baseDealData.stageId } };
}
if (baseDealData.assignedToId) {
  updateData.assignedTo = { connect: { id: baseDealData.assignedToId } };
}
// и т.д.
```

## Статус:
✅ Код исправлен
⏳ Ожидается пересборка webpack (10-15 секунд)
🔄 После пересборки ошибка должна исчезнуть

## Если ошибка все еще возникает:
1. Подождите 10-15 секунд для пересборки
2. Проверьте логи: `tail -f /tmp/backend-full.log | grep "compiled"`
3. Перезапустите бэкенд вручную если нужно


