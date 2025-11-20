# CRM Backend Architecture

## Структура модулей

### Core Modules
- `auth` - Аутентификация и авторизация (JWT, RBAC)
- `users` - Управление пользователями
- `common` - Общие утилиты, guards, decorators, filters

### Business Modules
- `deals` - Управление сделками (CRUD, фильтры, поиск)
- `tasks` - Управление задачами
- `fields` - Динамические поля (Custom Fields)
- `pipelines` - Воронки и стадии
- `comments` - Комментарии
- `activity` - История изменений (Activity Log)
- `files` - Управление файлами (upload/download)
- `import-export` - Импорт/Экспорт данных

### Infrastructure
- `websocket` - WebSocket Gateway для real-time
- `integrations` - Интеграции (WhatsApp, Telegram, VK, телефония)
- `logs` - Системные логи

## Структура каждого модуля

```
module-name/
├── dto/
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── filter-*.dto.ts
├── entities/
│   └── *.entity.ts (Prisma models)
├── repositories/
│   └── *.repository.ts
├── services/
│   └── *.service.ts
├── controllers/
│   └── *.controller.ts
├── *.module.ts
└── *.spec.ts (тесты)
```

## Permissions

- Admin: Все права
- Manager: Ограниченные права (см. ROLE_PERMISSIONS)

## WebSocket Events

- `deal.updated`
- `deal.field.updated`
- `deal.task.created`
- `deal.task.updated`
- `deal.comment.created`
- `deal.file.uploaded`
