# 🔍 Поиск места падения 500: "Cannot read properties of undefined (reading 'findMany')"

## 📋 Результаты поиска

### ❌ НЕ НАЙДЕНО:
- ❌ `workspaceService.findMany(...)`
- ❌ `workspaceRepository.findMany(...)`
- ❌ `prisma.workspace.findMany(...)`
- ❌ `this.prisma.workspace.findMany(...)`
- ❌ `.workspace.findMany(...)`

### ✅ Найдены все вызовы `.findMany()`:

Все вызовы `.findMany()` используют `this.prisma.<model>.findMany()`, где `<model>` - это существующие модели:
- `this.prisma.pipeline.findMany()` ✅
- `this.prisma.user.findMany()` ✅
- `this.prisma.deal.findMany()` ✅
- `this.prisma.contact.findMany()` ✅
- `this.prisma.company.findMany()` ✅
- `this.prisma.task.findMany()` ✅
- `this.prisma.activity.findMany()` ✅
- `this.prisma.message.findMany()` ✅
- `this.prisma.stage.findMany()` ✅
- `this.prisma.customField.findMany()` ✅
- `this.prisma.chatThread.findMany()` ✅

## 🔍 Возможные причины ошибки:

### 1. **this.prisma undefined**
Если `this.prisma` undefined, то `this.prisma.pipeline.findMany()` вызовет ошибку "Cannot read properties of undefined (reading 'pipeline')".

**Проверка**: В `PipelinesService.findAll()` есть проверка:
```typescript
console.log('[PIPELINES SERVICE] prisma available:', !!this.prisma);
```

### 2. **this.prisma.pipeline undefined**
Если `this.prisma` существует, но `this.prisma.pipeline` undefined, то `this.prisma.pipeline.findMany()` вызовет ошибку "Cannot read properties of undefined (reading 'findMany')".

**Причина**: Модель `pipeline` не существует в Prisma schema или не сгенерирована.

### 3. **Другая модель undefined**
Если какая-то модель не существует в Prisma schema, но используется в коде.

## 📍 Места, где может падать:

### **crm-backend/src/pipelines/pipelines.service.ts:88**
```typescript
const pipelines = await this.prisma.pipeline.findMany({
  where: { isActive: true },
  include: { stages: { orderBy: { order: 'asc' } } },
  orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
});
```

**Если `this.prisma.pipeline` undefined** → ошибка "Cannot read properties of undefined (reading 'findMany')"

## ✅ Рекомендации:

1. **Проверить Prisma schema**: Убедиться, что модель `Pipeline` существует
2. **Проверить Prisma Client**: Убедиться, что Prisma Client сгенерирован (`npx prisma generate`)
3. **Добавить проверку**: Перед вызовом `findMany` проверить, что `this.prisma.pipeline` существует

## 🔧 Решение:

Добавить проверку перед вызовом `findMany`:

```typescript
if (!this.prisma || !this.prisma.pipeline) {
  throw new Error('PrismaService or Pipeline model is not available');
}
```







