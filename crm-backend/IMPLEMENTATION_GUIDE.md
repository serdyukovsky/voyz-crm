# CRM Backend Implementation Guide

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Setup Environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Database Setup**
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate dev

# Seed database
npm run prisma:seed
```

4. **Start Development Server**
```bash
npm run start:dev
```

## Module Implementation Order

### Phase 1: Core Infrastructure ✅
- [x] Auth & Users module
- [x] Prisma schema
- [x] Common utilities

### Phase 2: Core CRM Modules
1. **Contacts Module** (Priority 1)
   - CRUD operations
   - Filters and search
   - Statistics
   - WebSocket events
   - Activity logging

2. **Deals Module** (Priority 2)
   - CRUD operations
   - Contact integration
   - Pipeline/Stage management
   - Bulk operations
   - WebSocket events

3. **Tasks Module** (Priority 3)
   - CRUD operations
   - Deal/Contact linking
   - Status management
   - Views (List, Kanban, Calendar)
   - WebSocket events

### Phase 3: Supporting Modules
4. **Pipelines & Stages**
   - CRUD operations
   - Drag & drop reordering
   - Stage triggers

5. **Custom Fields**
   - Field definitions
   - Value storage
   - Validation

6. **Activity Log**
   - Activity recording
   - Querying and filtering
   - Timeline generation

7. **Comments**
   - CRUD operations
   - Multi-entity support
   - WebSocket events

8. **Files**
   - Upload/download
   - S3 integration (stub)
   - Thumbnail generation

### Phase 4: Advanced Features
9. **Import/Export**
   - CSV/XLSX support
   - Mapping UI
   - Duplicate detection

10. **Integrations** (Stubs)
    - WhatsApp API
    - Telegram Bot
    - VK Messages
    - Telephony

11. **Logging Module**
    - Error logging
    - API call logging
    - User action logging

12. **WebSocket Gateway**
    - Global gateway
    - Room management
    - Event broadcasting

## Testing

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

### Test Structure
```
src/
├── module/
│   ├── module.service.spec.ts
│   ├── module.controller.spec.ts
│   └── module.e2e-spec.ts
```

## Code Style

- Follow NestJS conventions
- Use TypeScript strict mode
- ESLint + Prettier configured
- DTOs for all inputs/outputs
- Services for business logic
- Repositories for data access

## API Documentation

Swagger documentation available at:
```
http://localhost:3001/api/docs
```

## Deployment

### Docker
```bash
docker-compose up -d
```

### Production Build
```bash
npm run build
npm run start:prod
```

## Migration Guide

When adding new modules:

1. Update `prisma/schema.prisma`
2. Generate migration: `npm run prisma:migrate dev`
3. Create module structure
4. Implement DTOs, Services, Controllers
5. Add WebSocket events (if needed)
6. Write tests
7. Update documentation
8. Register module in `app.module.ts`





