# Руководство по реализации CRM Backend

## ✅ Что уже создано

### 1. Prisma Schema (полная схема БД)
- ✅ Все таблицы согласно требованиям
- ✅ Enums для типов данных
- ✅ Relations между таблицами
- ✅ Индексы для производительности

### 2. Common модуль
- ✅ RBAC Guard (проверка ролей и прав)
- ✅ Permissions decorator
- ✅ CurrentUser decorator
- ✅ Prisma Service (подключение к БД)
- ✅ HTTP Exception Filter
- ✅ Permissions constants

### 3. WebSocket Gateway
- ✅ RealtimeGateway с событиями для всех типов обновлений
- ✅ Подписка/отписка на сделки

## 📋 Что нужно реализовать

### Шаг 1: Генерация Prisma Client и миграции

```bash
cd crm-backend
npm run prisma:generate
npm run prisma:migrate dev --name init
```

### Шаг 2: Создание модулей

Каждый модуль должен следовать структуре:

```
modules/deals/
├── dto/
│   ├── create-deal.dto.ts
│   ├── update-deal.dto.ts
│   ├── filter-deal.dto.ts
│   └── deal-response.dto.ts
├── repositories/
│   └── deals.repository.ts
├── services/
│   └── deals.service.ts
├── controllers/
│   └── deals.controller.ts
├── deals.module.ts
└── deals.service.spec.ts
```

### Шаг 3: Ключевые модули для реализации

#### 3.1. Auth Module
- JWT Strategy
- Local Strategy
- Auth Controller (login, register, refresh)
- Auth Service

#### 3.2. Deals Module
- Deals Controller (CRUD, фильтры, поиск, массовые обновления)
- Deals Service (бизнес-логика)
- Deals Repository (работа с БД)
- DTOs

#### 3.3. Custom Fields Module
- Fields Controller (CRUD полей)
- Fields Service (валидация, сохранение)
- Fields Repository
- DTOs

#### 3.4. Tasks Module
- Tasks Controller
- Tasks Service
- Tasks Repository
- DTOs

#### 3.5. Activity Module
- Activity Service (централизованное логирование)
- Activity Repository
- Методы для всех типов событий

#### 3.6. Comments Module
- Comments Controller
- Comments Service
- Comments Repository
- DTOs

#### 3.7. Files Module
- Files Controller (upload/download/delete)
- Files Service (работа с файлами)
- Files Repository
- DTOs

#### 3.8. Pipelines Module
- Pipelines Controller (CRUD воронок)
- Stages Controller (CRUD стадий)
- Pipelines Service
- Stages Service
- DTOs

#### 3.9. Import/Export Module
- Import Controller (CSV/XLSX)
- Export Controller
- Import/Export Service
- DTOs

#### 3.10. Integrations Module
- Заглушки для:
  - WhatsApp
  - Telegram
  - VK
  - Telephony

#### 3.11. Logs Module
- Logs Controller
- Logs Service
- DTOs

### Шаг 4: Настройка Swagger

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('CRM API')
  .setDescription('CRM System API Documentation')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Шаг 5: Тесты

Создать unit тесты для:
- Auth Service
- Deals Service
- Tasks Service
- Fields Service
- Activity Service

## 🔐 Permissions

### Admin
- Все права

### Manager
- `deals.view`
- `deals.create`
- `deals.update`
- `deals.update_restricted` (только неограниченные поля)
- `tasks.view`
- `tasks.create`
- `tasks.update`
- `fields.view`
- `pipelines.view`
- `users.view`
- `export`
- `integrations.view`

## 📡 WebSocket Events

### Deal Events
- `deal:${dealId}:updated` - обновление сделки
- `deal:${dealId}:field:updated` - обновление поля
- `deal:${dealId}:task:created` - создание задачи
- `deal:${dealId}:task:${taskId}:updated` - обновление задачи
- `deal:${dealId}:comment:created` - создание комментария
- `deal:${dealId}:file:uploaded` - загрузка файла
- `deal:${dealId}:file:${fileId}:deleted` - удаление файла
- `deal:${dealId}:activity:created` - создание активности

### Подписка
```typescript
// Подписка на обновления сделки
socket.emit('subscribe:deal', { dealId: 'deal-id' });

// Отписка
socket.emit('unsubscribe:deal', { dealId: 'deal-id' });
```

## 🗄️ Database

### Основные таблицы:
- `users` - пользователи
- `pipelines` - воронки
- `stages` - стадии
- `deals` - сделки
- `tasks` - задачи
- `custom_fields` - динамические поля
- `custom_field_values` - значения полей
- `comments` - комментарии
- `activities` - история изменений
- `files` - файлы
- `messages` - сообщения из интеграций
- `calls` - звонки
- `integration_settings` - настройки интеграций
- `import_jobs` - задачи импорта
- `export_jobs` - задачи экспорта
- `logs` - системные логи

## 📦 Зависимости

Уже установлены:
- @nestjs/common, @nestjs/core
- @nestjs/jwt, @nestjs/passport
- @nestjs/config
- @nestjs/websockets, @nestjs/platform-socket.io
- @prisma/client, prisma
- class-validator, class-transformer
- socket.io
- csv-parser, xlsx
- bcrypt

## 🚀 Следующие шаги

1. Запустить `npm run prisma:generate`
2. Создать миграции: `npm run prisma:migrate dev`
3. Реализовать модули согласно списку выше
4. Настроить Swagger
5. Написать тесты
6. Настроить CI/CD

