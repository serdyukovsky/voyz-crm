# Performance Issues Report
## N+1 запросы, циклы, транзакции, оптимизации

---

## 1. N+1 ЗАПРОСЫ

### 🔴 КРИТИЧНО: contacts.service.ts:188 - findAll()

**Файл**: `src/contacts/contacts.service.ts`  
**Строка**: 188-190

**Проблема:**
```typescript
return Promise.all(
  contacts.map(async (contact) => this.formatContactResponse(contact)),
);
```

`formatContactResponse` вызывает `getStats(contact.id)` для каждого контакта, что создает N+1 запрос:
- 1 запрос для получения списка контактов
- N запросов для получения stats каждого контакта

**Как исправить:**
```typescript
// Batch загрузка stats для всех контактов
const contactIds = contacts.map(c => c.id);
const allDeals = await this.prisma.deal.findMany({
  where: { contactId: { in: contactIds } },
  select: { contactId: true, amount: true, closedAt: true }
});

const statsMap = new Map();
contactIds.forEach(id => {
  const deals = allDeals.filter(d => d.contactId === id);
  statsMap.set(id, {
    activeDeals: deals.filter(d => !d.closedAt).length,
    closedDeals: deals.filter(d => d.closedAt).length,
    totalDeals: deals.length,
    totalDealVolume: deals.filter(d => d.closedAt)
      .reduce((sum, d) => sum + Number(d.amount), 0)
  });
});

return contacts.map(contact => ({
  ...contact,
  stats: statsMap.get(contact.id)
}));
```

---

### 🔴 КРИТИЧНО: deals.service.ts:120 - findAll()

**Файл**: `src/deals/deals.service.ts`  
**Строка**: 120

**Проблема:**
```typescript
return Promise.all(deals.map((deal) => this.formatDealResponse(deal)));
```

`formatDealResponse` вызывает `getContactStats` и `getCompanyStats` для каждой сделки:
- 1 запрос для получения списка сделок
- N запросов для contact stats (если есть contact)
- N запросов для company stats (если есть company)

**Как исправить:**
```typescript
// Batch загрузка stats
const contactIds = [...new Set(deals.map(d => d.contactId).filter(Boolean))];
const companyIds = [...new Set(deals.map(d => d.companyId).filter(Boolean))];

const [allContactDeals, allCompanyDeals] = await Promise.all([
  this.prisma.deal.findMany({
    where: { contactId: { in: contactIds } },
    select: { contactId: true, amount: true, closedAt: true }
  }),
  this.prisma.deal.findMany({
    where: { companyId: { in: companyIds } },
    select: { companyId: true, amount: true, closedAt: true }
  })
]);

// Создать maps для stats
const contactStatsMap = this.buildStatsMap(allContactDeals, 'contactId');
const companyStatsMap = this.buildStatsMap(allCompanyDeals, 'companyId');

// Использовать maps в formatDealResponse
return deals.map(deal => this.formatDealResponseWithStats(deal, contactStatsMap, companyStatsMap));
```

---

### 🔴 КРИТИЧНО: tasks.service.ts:86 - findAll()

**Файл**: `src/tasks/tasks.service.ts`  
**Строка**: 86-115

**Проблема:**
```typescript
return Promise.all(
  tasks.map(async (task) => {
    if (!task.contact) {
      return task;
    }
    const contactStats = await this.getContactStats(task.contact.id);
    // ...
  }),
);
```

Для каждой задачи с контактом выполняется отдельный запрос для получения stats.

**Как исправить:**
```typescript
// Batch загрузка stats для всех уникальных contactIds
const contactIds = [...new Set(tasks.map(t => t.contactId).filter(Boolean))];
const allDeals = await this.prisma.deal.findMany({
  where: { contactId: { in: contactIds } },
  select: { contactId: true, amount: true, closedAt: true }
});

const statsMap = this.buildStatsMap(allDeals, 'contactId');

return tasks.map(task => ({
  ...task,
  contact: task.contact ? {
    ...task.contact,
    stats: statsMap.get(task.contact.id) || this.getEmptyStats()
  } : null
}));
```

---

### 🔴 КРИТИЧНО: companies.service.ts:114 - findAll()

**Файл**: `src/companies/companies.service.ts`  
**Строка**: 114

**Проблема:**
```typescript
return Promise.all(
  companies.map(async (company) => this.formatCompanyResponse(company)),
);
```

`formatCompanyResponse` вызывает `getStats(company.id)` для каждой компании.

**Как исправить:**
```typescript
// Batch загрузка stats
const companyIds = companies.map(c => c.id);
const allDeals = await this.prisma.deal.findMany({
  where: { companyId: { in: companyIds } },
  select: { companyId: true, amount: true, closedAt: true }
});

const statsMap = this.buildStatsMap(allDeals, 'companyId');

return companies.map(company => ({
  ...company,
  stats: statsMap.get(company.id) || this.getEmptyStats()
}));
```

---

### 🟡 ВАЖНО: deals.service.ts:156 - formatDealResponse()

**Файл**: `src/deals/deals.service.ts`  
**Строка**: 156-236

**Проблема:**
Метод вызывается для каждой сделки и делает отдельные запросы для stats:
- `getContactStats(deal.contact.id)` - строка 169
- `getCompanyStats(deal.company.id)` - строка 194

**Как исправить:**
Использовать batch загрузку (см. выше) или передавать stats как параметры.

---

### 🟡 ВАЖНО: tasks.service.ts:168 - findOne()

**Файл**: `src/tasks/tasks.service.ts`  
**Строка**: 168-189

**Проблема:**
```typescript
if (task.contact) {
  const contactStats = await this.getContactStats(task.contact.id);
  // ...
}
```

Отдельный запрос для stats одного контакта (менее критично, но можно оптимизировать).

**Как исправить:**
Использовать тот же batch подход или кешировать stats.

---

## 2. ЗАПРОСЫ ВНУТРИ ЦИКЛОВ

### 🔴 КРИТИЧНО: contacts.service.ts:337 - update()

**Файл**: `src/contacts/contacts.service.ts`  
**Строка**: 337-348

**Проблема:**
```typescript
for (const [field, change] of Object.entries(changes)) {
  await this.activityService.create({
    type: ActivityType.CONTACT_UPDATED,
    userId,
    contactId: id,
    payload: { field, oldValue: change.old, newValue: change.new },
  });
}
```

Последовательные запросы в цикле для создания activity записей.

**Как исправить:**
```typescript
// Batch создание activities
const activities = Object.entries(changes).map(([field, change]) => ({
  type: ActivityType.CONTACT_UPDATED,
  userId,
  contactId: id,
  payload: { field, oldValue: change.old, newValue: change.new },
}));

await this.prisma.activity.createMany({ data: activities });
```

**Примечание:** Если нужны отдельные activity записи, использовать транзакцию:
```typescript
await this.prisma.$transaction(
  activities.map(data => 
    this.prisma.activity.create({ data })
  )
);
```

---

### 🔴 КРИТИЧНО: deals.service.ts:320 - update()

**Файл**: `src/deals/deals.service.ts`  
**Строка**: 320-341, 388-400, 402-412

**Проблема:**
Множественные последовательные вызовы `activityService.create()` в разных местах метода.

**Как исправить:**
```typescript
// Собрать все activities в массив
const activities = [];

if (changes.stage) {
  activities.push({
    type: ActivityType.STAGE_CHANGED,
    userId,
    dealId: deal.id,
    payload: { fromStage: changes.stage.old, toStage: changes.stage.new },
  });
}

if (changes.contact) {
  activities.push({
    type: changes.contact.new ? ActivityType.CONTACT_LINKED : ActivityType.CONTACT_UNLINKED,
    userId,
    dealId: deal.id,
    contactId: changes.contact.new || changes.contact.old,
    payload: { contactId: changes.contact.new || changes.contact.old, dealId: deal.id },
  });
}

// Batch создание
if (activities.length > 0) {
  await this.prisma.activity.createMany({ data: activities });
}
```

---

### 🔴 КРИТИЧНО: tasks.service.ts:241 - update()

**Файл**: `src/tasks/tasks.service.ts`  
**Строка**: 241-259

**Проблема:**
```typescript
for (const [field, change] of Object.entries(changes)) {
  const activityType = field === 'status' && change.new === TaskStatus.DONE
    ? ActivityType.TASK_COMPLETED
    : ActivityType.TASK_UPDATED;

  await this.activityService.create({
    type: activityType,
    userId,
    taskId: id,
    dealId: task.dealId || undefined,
    contactId: task.contactId || undefined,
    payload: { field, oldValue: change.old, newValue: change.new },
  });
}
```

Последовательные запросы в цикле.

**Как исправить:**
```typescript
const activities = Object.entries(changes).map(([field, change]) => ({
  type: field === 'status' && change.new === TaskStatus.DONE
    ? ActivityType.TASK_COMPLETED
    : ActivityType.TASK_UPDATED,
  userId,
  taskId: id,
  dealId: task.dealId || undefined,
  contactId: task.contactId || undefined,
  payload: { field, oldValue: change.old, newValue: change.new },
}));

await this.prisma.activity.createMany({ data: activities });
```

---

### 🔴 КРИТИЧНО: companies.service.ts:280 - update()

**Файл**: `src/companies/companies.service.ts`  
**Строка**: 280-292

**Проблема:**
```typescript
for (const [field, change] of Object.entries(changes)) {
  await this.activityService.create({
    type: ActivityType.COMPANY_UPDATED,
    userId,
    payload: {
      companyId: id,
      companyName: company.name,
      field,
      oldValue: change.old,
      newValue: change.new,
    },
  });
}
```

Последовательные запросы в цикле.

**Как исправить:**
```typescript
const activities = Object.entries(changes).map(([field, change]) => ({
  type: ActivityType.COMPANY_UPDATED,
  userId,
  payload: {
    companyId: id,
    companyName: company.name,
    field,
    oldValue: change.old,
    newValue: change.new,
  },
}));

await this.prisma.activity.createMany({ data: activities });
```

---

## 3. ОТСУТСТВИЕ ТРАНЗАКЦИЙ

### 🔴 КРИТИЧНО: Все операции обновления

**Проблема:**
Операции обновления (update, create, delete) не используют транзакции, что может привести к:
- Частичным обновлениям при ошибках
- Несогласованности данных
- Проблемам при откате

**Примеры:**
- `contacts.service.ts:328` - update без транзакции
- `deals.service.ts:307` - update без транзакции
- `tasks.service.ts:230` - update без транзакции
- `companies.service.ts:274` - update без транзакции

**Как исправить:**
```typescript
// Обернуть в транзакцию
await this.prisma.$transaction(async (tx) => {
  const contact = await tx.contact.update({
    where: { id },
    data: updateData,
    include: { company: true },
  });

  // Batch создание activities
  if (activities.length > 0) {
    await tx.activity.createMany({ data: activities });
  }

  return contact;
});
```

---

### 🔴 КРИТИЧНО: Массовые операции импорта

**Файл**: `src/import-export/import-export.service.ts`  
**Проблема:**
Сервис импорта/экспорта не реализован, но при реализации нужно использовать транзакции для batch операций.

**Как исправить:**
```typescript
async importContacts(rows: ContactRow[], userId: string) {
  return this.prisma.$transaction(async (tx) => {
    const contacts = [];
    const errors = [];

    for (const row of rows) {
      try {
        // Проверка существования
        const existing = await tx.contact.findFirst({
          where: {
            OR: [
              { email: row.email },
              { phone: row.phone }
            ]
          }
        });

        if (existing) {
          // Update
          contacts.push(await tx.contact.update({
            where: { id: existing.id },
            data: { /* ... */ }
          }));
        } else {
          // Create
          contacts.push(await tx.contact.create({
            data: { /* ... */ }
          }));
        }
      } catch (error) {
        errors.push({ row, error });
      }
    }

    return { contacts, errors };
  });
}
```

---

## 4. ОТСУТСТВИЕ SELECT/INCLUDE ОПТИМИЗАЦИЙ

### 🟡 ВАЖНО: deals.service.ts:97 - findAll()

**Файл**: `src/deals/deals.service.ts`  
**Строка**: 97-112

**Проблема:**
```typescript
const deals = await this.prisma.deal.findMany({
  where,
  include: {
    stage: true,
    pipeline: true,
    createdBy: true,
    assignedTo: true,
    contact: {
      include: {
        company: true,
      },
    },
    company: true,
  },
  orderBy: { updatedAt: 'desc' },
});
```

Загружаются все поля связанных сущностей, хотя нужны только некоторые.

**Как исправить:**
```typescript
const deals = await this.prisma.deal.findMany({
  where,
  select: {
    id: true,
    number: true,
    title: true,
    amount: true,
    pipelineId: true,
    stageId: true,
    contactId: true,
    companyId: true,
    assignedToId: true,
    createdAt: true,
    updatedAt: true,
    stage: {
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        isClosed: true,
      },
    },
    pipeline: {
      select: {
        id: true,
        name: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    assignedTo: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    },
    contact: {
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        position: true,
        companyName: true,
      },
    },
    company: {
      select: {
        id: true,
        name: true,
        industry: true,
      },
    },
  },
  orderBy: { updatedAt: 'desc' },
});
```

---

### 🟡 ВАЖНО: contacts.service.ts:172 - findAll()

**Файл**: `src/contacts/contacts.service.ts`  
**Строка**: 172-185

**Проблема:**
```typescript
const contacts = await this.prisma.contact.findMany({
  where,
  include: {
    company: true,
    deals: {
      select: {
        id: true,
        closedAt: true,
        amount: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

Загружаются все поля `company`, хотя нужны только некоторые.

**Как исправить:**
```typescript
const contacts = await this.prisma.contact.findMany({
  where,
  select: {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    position: true,
    companyName: true,
    companyId: true,
    tags: true,
    notes: true,
    social: true,
    createdAt: true,
    updatedAt: true,
    company: {
      select: {
        id: true,
        name: true,
        industry: true,
      },
    },
    deals: {
      select: {
        id: true,
        closedAt: true,
        amount: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

---

### 🟡 ВАЖНО: tasks.service.ts:65 - findAll()

**Файл**: `src/tasks/tasks.service.ts`  
**Строка**: 65-83

**Проблема:**
```typescript
const tasks = await this.prisma.task.findMany({
  where: filters,
  include: {
    deal: {
      include: {
        stage: true,
        contact: true,
      },
    },
    contact: {
      include: {
        company: true,
      },
    },
    assignedTo: true,
    createdBy: true,
  },
  orderBy: { createdAt: 'desc' },
});
```

Загружаются все поля, включая вложенные связи.

**Как исправить:**
Использовать `select` вместо `include` и выбирать только нужные поля.

---

### 🟡 ВАЖНО: contacts.service.ts:413 - getTasks()

**Файл**: `src/contacts/contacts.service.ts`  
**Строка**: 413-436

**Проблема:**
```typescript
return this.prisma.task.findMany({
  where: { contactId },
  include: {
    deal: {
      include: {
        stage: true,
      },
    },
    assignedTo: true,
    createdBy: true,
  },
  orderBy: { createdAt: 'desc' },
});
```

Загружаются все поля связанных сущностей.

**Как исправить:**
Использовать `select` для выбора только нужных полей.

---

## 5. WEBSOCKET ОПТИМИЗАЦИИ

### 🟡 ВАЖНО: realtime.gateway.ts - Глобальные события

**Файл**: `src/websocket/realtime.gateway.ts`  
**Строка**: 47, 52, 103, 116, 125, 194

**Проблема:**
```typescript
emitDealUpdated(dealId: string, data: any) {
  this.server.to(`deal:${dealId}`).emit('deal.updated', { dealId, ...data });
  this.server.emit('deal.updated', { dealId, ...data }); // Global event
}
```

Глобальные события (`this.server.emit`) отправляются всем подключенным клиентам, даже если они не подписаны на конкретную сущность. Это может создать большую нагрузку при множестве подключений.

**Как исправить:**
```typescript
// Использовать rooms для подписки на глобальные обновления
emitDealUpdated(dealId: string, data: any) {
  // Только для подписанных на конкретную сделку
  this.server.to(`deal:${dealId}`).emit('deal.updated', { dealId, ...data });
  
  // Только для подписанных на глобальные обновления сделок
  this.server.to('deals:global').emit('deal.updated', { dealId, ...data });
}

// В контроллере или при подключении
@SubscribeMessage('subscribe:deals:global')
handleSubscribeDealsGlobal(@ConnectedSocket() client: Socket) {
  client.join('deals:global');
}
```

---

### 🟡 ВАЖНО: realtime.gateway.ts - Большие payload

**Проблема:**
В WebSocket события передаются полные объекты (`data: any`), что может быть избыточно.

**Как исправить:**
```typescript
emitDealUpdated(dealId: string, data: any) {
  // Передавать только необходимые поля
  const payload = {
    dealId,
    title: data.title,
    amount: data.amount,
    stageId: data.stageId,
    updatedAt: data.updatedAt,
  };
  
  this.server.to(`deal:${dealId}`).emit('deal.updated', payload);
}
```

---

## 6. ДОПОЛНИТЕЛЬНЫЕ ПРОБЛЕМЫ

### 🟡 ВАЖНО: contacts.service.ts:135 - Неиспользуемый запрос

**Файл**: `src/contacts/contacts.service.ts`  
**Строка**: 135-140

**Проблема:**
```typescript
if (filters.hasActiveDeals !== undefined) {
  const dealCount = await this.prisma.deal.count({
    where: {
      contactId: { not: null },
      closedAt: null,
    },
  });
  // dealCount не используется!
  if (filters.hasActiveDeals) {
    where.deals = { some: { closedAt: null } };
  }
}
```

Выполняется лишний запрос `count`, результат которого не используется.

**Как исправить:**
```typescript
if (filters.hasActiveDeals !== undefined) {
  if (filters.hasActiveDeals) {
    where.deals = {
      some: {
        closedAt: null,
      },
    };
  } else {
    where.deals = {
      none: {
        closedAt: null,
      },
    };
  }
}
```

---

### 🟡 ВАЖНО: contacts.service.ts:214 - Двойной запрос в update()

**Файл**: `src/contacts/contacts.service.ts`  
**Строка**: 214

**Проблема:**
```typescript
const existing = await this.findOne(id);
```

`findOne` делает полный запрос с include, затем в методе `update` делается еще один запрос для обновления. Это избыточно.

**Как исправить:**
```typescript
// Загрузить только нужные поля для сравнения
const existing = await this.prisma.contact.findUnique({
  where: { id },
  select: {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    companyId: true,
    social: true,
  },
});
```

---

### 🟡 ВАЖНО: deals.service.ts:289 - Двойной запрос в update()

**Файл**: `src/deals/deals.service.ts`  
**Строка**: 289

**Проблема:**
```typescript
const oldDeal = await this.findOne(id);
```

`findOne` делает полный запрос со всеми include, затем делается еще один запрос для обновления.

**Как исправить:**
```typescript
// Загрузить только нужные поля для сравнения
const oldDeal = await this.prisma.deal.findUnique({
  where: { id },
  select: {
    id: true,
    stageId: true,
    contactId: true,
    assignedToId: true,
    amount: true,
  },
});
```

---

### 🟡 ВАЖНО: tasks.service.ts:195 - Двойной запрос в update()

**Файл**: `src/tasks/tasks.service.ts`  
**Строка**: 195

**Проблема:**
```typescript
const existing = await this.findOne(id);
```

Аналогично - двойной запрос.

**Как исправить:**
Загружать только нужные поля для сравнения.

---

### 🟡 ВАЖНО: companies.service.ts:161 - Двойной запрос в update()

**Файл**: `src/companies/companies.service.ts`  
**Строка**: 161

**Проблема:**
```typescript
const existing = await this.findOne(id);
```

Аналогично - двойной запрос.

**Как исправить:**
Загружать только нужные поля для сравнения.

---

## SUMMARY

### Критические проблемы (исправить немедленно):

1. ✅ N+1 в `contacts.service.ts:188` - findAll()
2. ✅ N+1 в `deals.service.ts:120` - findAll()
3. ✅ N+1 в `tasks.service.ts:86` - findAll()
4. ✅ N+1 в `companies.service.ts:114` - findAll()
5. ✅ Запросы в циклах в update методах (4 места)
6. ✅ Отсутствие транзакций в операциях обновления

### Важные проблемы (исправить в ближайшее время):

1. ✅ Отсутствие select оптимизаций в findAll методах
2. ✅ Глобальные WebSocket события
3. ✅ Большие payload в WebSocket

### Ожидаемые улучшения:

- **N+1 исправления**: Ускорение запросов списков в 10-100x раз
- **Batch операции**: Ускорение обновлений в 5-10x раз
- **Транзакции**: Гарантия целостности данных
- **Select оптимизации**: Уменьшение объема передаваемых данных в 2-5x раз

---

**Приоритет**: Критические проблемы должны быть исправлены перед production deployment

