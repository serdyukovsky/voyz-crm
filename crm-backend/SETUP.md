# Backend Setup Guide

## ✅ Выполнено

### 1. Prisma Schema
- ✅ Полная схема БД со всеми таблицами согласно требованиям
- ✅ Pipelines & Stages
- ✅ Custom Fields & Values  
- ✅ Files
- ✅ Activity Log
- ✅ Comments (с типами: COMMENT, INTERNAL_NOTE, CLIENT_MESSAGE)
- ✅ Tasks
- ✅ Deals
- ✅ Users & Permissions (RBAC)
- ✅ Integrations
- ✅ Import/Export Jobs
- ✅ Logs

### 2. Common Module
- ✅ RBAC Guard
- ✅ Permissions decorator
- ✅ CurrentUser decorator
- ✅ Prisma Service
- ✅ HTTP Exception Filter
- ✅ Permissions constants

### 3. WebSocket Gateway
- ✅ RealtimeGateway с событиями для всех типов обновлений
- ✅ Подписка/отписка на сделки
- ✅ WebSocket Module

### 4. Swagger
- ✅ Настроен в main.ts
- ✅ Доступен по /api/docs

## 🚀 Следующие шаги

### 1. Генерация Prisma Client

```bash
cd crm-backend
npm run prisma:generate
```

### 2. Создание миграций

```bash
npm run prisma:migrate dev --name init
```

### 3. Настройка .env

Создайте `.env` файл с переменными:
```
DATABASE_URL="postgresql://user:password@localhost:5432/crm"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### 4. Запуск проекта

```bash
npm run start:dev
```

Swagger документация будет доступна по адресу: http://localhost:3001/api/docs

## 📋 Что нужно реализовать

См. `IMPLEMENTATION-GUIDE.md` для полного списка модулей, которые нужно создать.

## 🏗️ Архитектура

См. `ARCHITECTURE.md` для описания структуры модулей.

## 🔐 Permissions

См. `src/common/constants/permissions.ts` для списка всех прав доступа.

## 📡 WebSocket Events

См. `src/websocket/realtime.gateway.ts` для списка всех WebSocket событий.

