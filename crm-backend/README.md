# CRM Backend

Scalable CRM backend system built with NestJS, Prisma, PostgreSQL, and WebSockets.

## Features

- ✅ JWT Authentication (Access + Refresh tokens)
- ✅ RBAC (Role-Based Access Control)
- ✅ Contacts Management
- ✅ Deals Management
- ✅ Tasks Management
- ✅ Pipelines & Stages
- ✅ Custom Fields
- ✅ Activity Logging
- ✅ Comments
- ✅ File Management
- ✅ Import/Export
- ✅ WebSocket Real-time Updates
- ✅ System Logging

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate dev

# Seed database (creates admin user)
npm run prisma:seed

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3001`
Swagger documentation at `http://localhost:3001/api/docs`

## Project Structure

```
src/
├── auth/              # Authentication & Authorization
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   └── decorators/
├── users/             # User management
├── contacts/           # Contacts module
├── deals/             # Deals module
├── tasks/              # Tasks module
├── pipelines/          # Pipelines & Stages
├── custom-fields/      # Custom fields
├── activity/           # Activity logging
├── comments/           # Comments
├── files/              # File management
├── import-export/      # Import/Export
├── integrations/       # External integrations
├── websocket/          # WebSocket gateway
├── logging/            # System logging
└── common/             # Shared utilities
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register` - Register (Admin only)

### Contacts
- `GET /api/contacts` - List contacts (with filters)
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact
- `GET /api/contacts/:id/stats` - Get contact statistics
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Deals
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `GET /api/deals/:id` - Get deal
- `PATCH /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## WebSocket Events

Connect to `/websocket` and subscribe to rooms:

- `deal:{id}` - Deal updates
- `contact:{id}` - Contact updates
- `task:{id}` - Task updates

Events:
- `deal.updated`
- `deal.field.updated`
- `contact.updated`
- `task.updated`
- `comment.created`
- `file.uploaded`

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/crm"
JWT_ACCESS_SECRET="your-secret"
JWT_REFRESH_SECRET="your-secret"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="30d"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!@#"
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Documentation

- [Architecture](./BACKEND_ARCHITECTURE.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)

## License

MIT
