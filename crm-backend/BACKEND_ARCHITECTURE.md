# CRM Backend Architecture

## Overview

This document describes the architecture of the CRM backend system built with NestJS, Prisma, PostgreSQL, and WebSockets.

## Technology Stack

- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Real-time**: WebSockets (Socket.io)
- **Authentication**: JWT (Access + Refresh tokens)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI

## Architecture Principles

1. **Modular Design**: Each feature is a separate module
2. **Clean Architecture**: Separation of concerns (Controller → Service → Repository)
3. **Dependency Injection**: NestJS DI container
4. **Type Safety**: Full TypeScript support
5. **Scalability**: Horizontal scaling support
6. **Security**: RBAC, input validation, SQL injection protection

## Module Structure

```
src/
├── auth/              # Authentication & Authorization
├── users/             # User management
├── contacts/           # Contacts module
├── deals/             # Deals module
├── tasks/              # Tasks module
├── pipelines/          # Pipelines & Stages
├── custom-fields/      # Custom fields
├── activity/           # Activity logging
├── comments/           # Comments
├── files/              # File management
├── import-export/       # Import/Export
├── integrations/       # External integrations
├── websocket/          # WebSocket gateway
├── logging/            # System logging
└── common/             # Shared utilities
```

## Database Schema

See `prisma/schema.prisma` for complete schema definition.

### Key Models

- **User**: Authentication and user management
- **Contact**: CRM contacts with social links
- **Deal**: Sales deals with stages and pipelines
- **Task**: Tasks linked to deals/contacts
- **Pipeline/Stage**: Sales pipeline management
- **CustomField**: Dynamic field system
- **Activity**: Activity logging
- **Comment**: Comments on deals/tasks/contacts
- **File**: File attachments
- **Message/Call**: Integration messages and calls

## Authentication & Authorization

### JWT Authentication
- Access tokens: 15 minutes (memory)
- Refresh tokens: 30 days (HttpOnly cookie + DB)
- Token rotation on refresh
- Reuse attack protection

### RBAC (Role-Based Access Control)
- Roles: `ADMIN`, `MANAGER`
- Permissions: Granular permission system
- Guards: `JwtAuthGuard`, `RbacGuard`
- Decorators: `@Roles()`, `@Permissions()`, `@Public()`

## WebSocket Architecture

### Gateway Structure
- Global gateway: `/websocket`
- Room-based subscriptions:
  - `deal:{id}`
  - `contact:{id}`
  - `task:{id}`

### Events Emitted
- `deal.updated`
- `deal.field.updated`
- `deal.task.created`
- `task.updated`
- `contact.updated`
- `contact.deal.updated`
- `comment.created`
- `file.uploaded`

## API Design

### RESTful Endpoints
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/contacts/*` - Contacts CRUD
- `/api/deals/*` - Deals CRUD
- `/api/tasks/*` - Tasks CRUD
- `/api/pipelines/*` - Pipeline management
- `/api/custom-fields/*` - Custom fields
- `/api/activity/*` - Activity logs
- `/api/comments/*` - Comments
- `/api/files/*` - File management
- `/api/import-export/*` - Import/Export

### Response Format
```typescript
{
  data: T,
  meta?: {
    page?: number,
    limit?: number,
    total?: number
  }
}
```

## Error Handling

- Global exception filter
- Standardized error responses
- Logging of all errors
- User-friendly error messages

## Testing Strategy

- Unit tests for services
- Integration tests for controllers
- E2E tests for critical flows
- Test coverage > 80%

## Deployment

- Local development support (GitHub Codespaces ready)
- Environment-based configuration
- Database migrations via Prisma
- Health check endpoints






