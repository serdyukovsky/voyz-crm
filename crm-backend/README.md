# CRM Backend

Полнофункциональный backend для CRM-системы, построенный на NestJS, TypeScript, PostgreSQL и Prisma ORM.

## 🎯 Статус проекта

### ✅ Выполнено

1. **Prisma Schema** - Полная схема базы данных со всеми таблицами:
   - Users & Permissions (RBAC)
   - Pipelines & Stages
   - Deals (сделки)
   - Tasks (задачи)
   - Custom Fields & Values (динамические поля)
   - Comments (комментарии с типами)
   - Activity Log (история изменений)
   - Files (файлы)
   - Messages & Calls (интеграции)
   - Import/Export Jobs
   - Logs

2. **Common Module** - Общие утилиты:
   - RBAC Guard (проверка ролей и прав)
   - Permissions decorator
   - CurrentUser decorator
   - Prisma Service (подключение к БД)
   - HTTP Exception Filter
   - Permissions constants

3. **WebSocket Gateway** - Real-time обновления:
   - RealtimeGateway с событиями для всех типов обновлений
   - Подписка/отписка на сделки
   - События для deals, tasks, comments, files, activity

4. **Swagger** - API документация:
   - Настроен в main.ts
   - Доступен по `/api/docs`

### 🚧 Требуется реализация

См. `IMPLEMENTATION-GUIDE.md` для полного списка модулей, которые нужно создать.

## 📋 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка .env

Создайте `.env` файл:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/crm"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### 3. Генерация Prisma Client

```bash
npm run prisma:generate
```

### 4. Создание миграций

```bash
npm run prisma:migrate dev --name init
```

### 5. Запуск проекта

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 6. Доступ к API

- API: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs

## 🏗️ Архитектура

Проект следует чистой архитектуре и DDD-подходу:

```
src/
├── modules/          # Бизнес-модули по доменам
│   ├── auth/
│   ├── users/
│   ├── deals/
│   ├── tasks/
│   ├── fields/
│   ├── activity/
│   ├── files/
│   ├── pipelines/
│   ├── comments/
│   ├── import-export/
│   └── logs/
├── common/           # Общие утилиты
│   ├── guards/
│   ├── decorators/
│   ├── filters/
│   ├── services/
│   └── constants/
├── websocket/        # WebSocket Gateway
└── main.ts          # Точка входа
```

## 🔐 RBAC (Role-Based Access Control)

### Роли

- **ADMIN** - Полный доступ ко всему
- **MANAGER** - Ограниченный доступ (см. permissions)

### Permissions

См. `src/common/constants/permissions.ts` для полного списка прав.

## 📡 WebSocket Events

См. `src/websocket/realtime.gateway.ts` для всех WebSocket событий.

### Подписка на события

```typescript
// Подписка на обновления сделки
socket.emit('subscribe:deal', { dealId: 'deal-id' });

// Отписка
socket.emit('unsubscribe:deal', { dealId: 'deal-id' });
```

## 🧪 Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Coverage
npm run test:cov
```

## 📚 Документация

- `ARCHITECTURE.md` - Архитектура проекта
- `IMPLEMENTATION-GUIDE.md` - Руководство по реализации модулей
- `SETUP.md` - Инструкции по настройке
- Swagger: http://localhost:3001/api/docs

## 🔧 Скрипты

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Prisma
npm run prisma:generate    # Генерация Prisma Client
npm run prisma:migrate     # Создание миграций
npm run prisma:studio      # Prisma Studio (GUI для БД)

# Testing
npm run test
npm run test:watch
npm run test:cov

# Linting
npm run lint
npm run format
```

## 📦 Зависимости

### Основные
- `@nestjs/common` - NestJS core
- `@nestjs/core` - NestJS core
- `@nestjs/config` - Конфигурация
- `@nestjs/jwt` - JWT токены
- `@nestjs/passport` - Аутентификация
- `@nestjs/websockets` - WebSockets
- `@nestjs/platform-socket.io` - Socket.IO
- `@prisma/client` - Prisma ORM
- `prisma` - Prisma CLI
- `socket.io` - WebSocket сервер

### Дополнительные
- `bcrypt` - Хеширование паролей
- `class-validator` - Валидация DTOs
- `class-transformer` - Трансформация данных
- `csv-parser` - Парсинг CSV
- `xlsx` - Работа с Excel файлами

## 🚀 Следующие шаги

1. Реализовать модули согласно `IMPLEMENTATION-GUIDE.md`
2. Настроить CI/CD
3. Добавить unit тесты для ключевых сервисов
4. Настроить мониторинг и логирование
5. Оптимизировать производительность

## 📝 Лицензия

Private
