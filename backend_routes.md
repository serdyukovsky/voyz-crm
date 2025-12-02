# CRM Backend API Routes

**Base URL:** `http://localhost:3001/api`  
**Framework:** NestJS  
**Documentation:** `http://localhost:3001/api/docs` (Swagger)

## Authentication

All routes except `/api/auth/login`, `/api/auth/refresh`, and `/api/health` require JWT Bearer token in `Authorization` header.

### Get Access Token
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user": { "id": "...", "email": "...", "role": "ADMIN" }
}
```

### Refresh Token
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Cookie: refreshToken=..." \
  --cookie-jar cookies.txt
```

### Register User (Admin only)
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "MANAGER"
  }'
```

### Logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --cookie-jar cookies.txt
```

---

## Health Check

### GET /api/health
**Auth:** Public  
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

```bash
curl http://localhost:3001/api/health
```

---

## Deals

### GET /api/deals
**Auth:** Required (ADMIN, MANAGER, VIEWER)  
**Query Params:** `pipelineId`, `stageId`, `assignedToId`, `contactId`, `companyId`, `search`

```bash
curl -X GET "http://localhost:3001/api/deals?pipelineId=xxx&stageId=yyy" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /api/deals
**Auth:** Required (ADMIN, MANAGER)  
**Body:**
```json
{
  "title": "New Deal",
  "amount": 10000,
  "pipelineId": "pipeline-id",
  "stageId": "stage-id",
  "contactId": "contact-id",
  "companyId": "company-id",
  "assignedToId": "user-id",
  "description": "Deal description"
}
```

```bash
curl -X POST http://localhost:3001/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"title": "New Deal", "amount": 10000, "pipelineId": "xxx", "stageId": "yyy"}'
```

### GET /api/deals/:id
**Auth:** Required (ADMIN, MANAGER, VIEWER)

```bash
curl -X GET http://localhost:3001/api/deals/DEAL_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /api/deals/:id
**Auth:** Required (ADMIN, MANAGER)  
**Body:** Partial deal update

```bash
curl -X PATCH http://localhost:3001/api/deals/DEAL_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"title": "Updated Title", "amount": 15000}'
```

### POST /api/deals/:id/link-contact
**Auth:** Required (ADMIN, MANAGER)  
**Body:**
```json
{
  "contactId": "contact-id"
}
```

### POST /api/deals/:id/unlink-contact
**Auth:** Required (ADMIN, MANAGER)

### DELETE /api/deals/:id
**Auth:** Required (ADMIN)

```bash
curl -X DELETE http://localhost:3001/api/deals/DEAL_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Contacts

### GET /api/contacts
**Auth:** Required (ADMIN, MANAGER, VIEWER)  
**Query Params:** `search`, `companyId`, `tags`, `hasActiveDeals`, `hasClosedDeals`

```bash
curl -X GET "http://localhost:3001/api/contacts?search=john&companyId=xxx" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /api/contacts
**Auth:** Required (ADMIN, MANAGER)  
**Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "position": "CEO",
  "companyId": "company-id",
  "tags": ["vip", "important"]
}
```

```bash
curl -X POST http://localhost:3001/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"fullName": "John Doe", "email": "john@example.com", "phone": "+1234567890"}'
```

### GET /api/contacts/:id
**Auth:** Required (ADMIN, MANAGER, VIEWER)

```bash
curl -X GET http://localhost:3001/api/contacts/CONTACT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /api/contacts/:id/stats
**Auth:** Required (ADMIN, MANAGER, VIEWER)  
**Response:** Deal statistics for contact

### GET /api/contacts/:id/tasks
**Auth:** Required (ADMIN, MANAGER, VIEWER)  
**Response:** Tasks associated with contact

### PATCH /api/contacts/:id
**Auth:** Required (ADMIN, MANAGER)  
**Body:** Partial contact update

```bash
curl -X PATCH http://localhost:3001/api/contacts/CONTACT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"fullName": "John Smith", "phone": "+9876543210"}'
```

### DELETE /api/contacts/:id
**Auth:** Required (ADMIN)

```bash
curl -X DELETE http://localhost:3001/api/contacts/CONTACT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Companies

### GET /api/companies
**Auth:** Required (ADMIN, MANAGER, VIEWER)  
**Query Params:** `search`, `industry`

```bash
curl -X GET "http://localhost:3001/api/companies?search=acme&industry=tech" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /api/companies
**Auth:** Required (ADMIN, MANAGER)  
**Body:**
```json
{
  "name": "Acme Corp",
  "industry": "Technology",
  "website": "https://acme.com",
  "email": "info@acme.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "notes": "Important client"
}
```

```bash
curl -X POST http://localhost:3001/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "Acme Corp", "industry": "Technology"}'
```

### GET /api/companies/:id
**Auth:** Required (ADMIN, MANAGER, VIEWER)

```bash
curl -X GET http://localhost:3001/api/companies/COMPANY_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /api/companies/:id/stats
**Auth:** Required (ADMIN, MANAGER, VIEWER)  
**Response:** Deal statistics for company

### PATCH /api/companies/:id
**Auth:** Required (ADMIN, MANAGER)  
**Body:** Partial company update

```bash
curl -X PATCH http://localhost:3001/api/companies/COMPANY_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "Acme Corporation", "industry": "Software"}'
```

### DELETE /api/companies/:id
**Auth:** Required (ADMIN)

```bash
curl -X DELETE http://localhost:3001/api/companies/COMPANY_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Pipelines

### GET /api/pipelines
**Auth:** Required  
**Response:** All pipelines with stages

```bash
curl -X GET http://localhost:3001/api/pipelines \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /api/pipelines
**Auth:** Required (ADMIN, MANAGER)  
**Body:**
```json
{
  "name": "Sales Pipeline",
  "description": "Main sales pipeline",
  "isDefault": false
}
```

```bash
curl -X POST http://localhost:3001/api/pipelines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "Sales Pipeline", "description": "Main sales pipeline"}'
```

### PATCH /api/pipelines/:id
**Auth:** Required  
**Body:** Partial pipeline update

```bash
curl -X PATCH http://localhost:3001/api/pipelines/PIPELINE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "Updated Pipeline Name"}'
```

### POST /api/pipelines/:id/stages
**Auth:** Required  
**Body:**
```json
{
  "name": "New Stage",
  "color": "#6B7280",
  "order": 0,
  "isDefault": false,
  "isClosed": false
}
```

```bash
curl -X POST http://localhost:3001/api/pipelines/PIPELINE_ID/stages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "New Stage", "color": "#6B7280", "order": 0}'
```

---

## Stages

### PATCH /api/stages/:id
**Auth:** Required  
**Body:**
```json
{
  "name": "Updated Stage Name",
  "color": "#10B981",
  "order": 1,
  "isClosed": false
}
```

```bash
curl -X PATCH http://localhost:3001/api/stages/STAGE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "Updated Stage", "order": 1}'
```

### DELETE /api/stages/:id
**Auth:** Required  
**Note:** Cannot delete stage if it has deals

```bash
curl -X DELETE http://localhost:3001/api/stages/STAGE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Tasks

### GET /api/tasks
**Auth:** Required (ADMIN, MANAGER, VIEWER)  
**Query Params:** `dealId`, `contactId`, `assignedToId`, `status`

```bash
curl -X GET "http://localhost:3001/api/tasks?dealId=xxx&status=OPEN" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /api/tasks
**Auth:** Required (ADMIN, MANAGER)  
**Body:**
```json
{
  "title": "Follow up with client",
  "description": "Call client to discuss proposal",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "priority": "HIGH",
  "status": "OPEN",
  "dealId": "deal-id",
  "contactId": "contact-id",
  "assignedToId": "user-id"
}
```

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"title": "Follow up", "status": "OPEN", "dealId": "xxx"}'
```

### GET /api/tasks/:id
**Auth:** Required (ADMIN, MANAGER, VIEWER)

```bash
curl -X GET http://localhost:3001/api/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /api/tasks/:id
**Auth:** Required (ADMIN, MANAGER)  
**Body:** Partial task update

```bash
curl -X PATCH http://localhost:3001/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"status": "COMPLETED", "priority": "LOW"}'
```

### DELETE /api/tasks/:id
**Auth:** Required (ADMIN, MANAGER)

```bash
curl -X DELETE http://localhost:3001/api/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Users

### GET /api/users
**Auth:** Required (Permission: USERS_VIEW)

```bash
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /api/users
**Auth:** Required (Permission: USERS_MANAGE)  
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "MANAGER"
}
```

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"email": "user@example.com", "password": "pass123", "firstName": "John", "lastName": "Doe", "role": "MANAGER"}'
```

### GET /api/users/:id
**Auth:** Required (Permission: USERS_VIEW)

```bash
curl -X GET http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /api/users/:id
**Auth:** Required (Permission: USERS_MANAGE)  
**Body:** Partial user update

```bash
curl -X PATCH http://localhost:3001/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"firstName": "Jane", "role": "ADMIN"}'
```

### DELETE /api/users/:id
**Auth:** Required (Permission: USERS_MANAGE)

```bash
curl -X DELETE http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Activities

### GET /api/activities
**Auth:** Required  
**Query Params:** `entityType`, `entityId`, `userId`, `startDate`, `endDate`

```bash
curl -X GET "http://localhost:3001/api/activities?entityType=deal&entityId=xxx" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Comments

### POST /api/comments
**Auth:** Required  
**Body:**
```json
{
  "entityType": "deal",
  "entityId": "deal-id",
  "message": "This is a comment",
  "type": "comment"
}
```

```bash
curl -X POST http://localhost:3001/api/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"entityType": "deal", "entityId": "xxx", "message": "Comment text", "type": "comment"}'
```

### GET /api/comments/deal/:dealId
**Auth:** Required

```bash
curl -X GET http://localhost:3001/api/comments/deal/DEAL_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /api/comments/task/:taskId
**Auth:** Required

```bash
curl -X GET http://localhost:3001/api/comments/task/TASK_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /api/comments/contact/:contactId
**Auth:** Required

```bash
curl -X GET http://localhost:3001/api/comments/contact/CONTACT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### DELETE /api/comments/:id
**Auth:** Required

```bash
curl -X DELETE http://localhost:3001/api/comments/COMMENT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Analytics

### GET /api/analytics/deals
**Auth:** Required  
**Query Params:** `userId`, `startDate`, `endDate`

```bash
curl -X GET "http://localhost:3001/api/analytics/deals?userId=xxx&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /api/analytics/messages
**Auth:** Required  
**Query Params:** `integrationType`, `startDate`, `endDate`

```bash
curl -X GET "http://localhost:3001/api/analytics/messages?integrationType=TELEGRAM&startDate=2024-01-01" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /api/analytics/calls
**Auth:** Required  
**Query Params:** `startDate`, `endDate`

```bash
curl -X GET "http://localhost:3001/api/analytics/calls?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /api/analytics/channels
**Auth:** Required  
**Query Params:** `startDate`, `endDate`

```bash
curl -X GET "http://localhost:3001/api/analytics/channels?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Stats

### GET /api/stats/global
**Auth:** Required (ADMIN, MANAGER, VIEWER)  
**Response:** Global statistics (deals, contacts, companies, tasks counts)

```bash
curl -X GET http://localhost:3001/api/stats/global \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Package.json Scripts

### Development
```bash
npm run dev              # Start with ts-node-dev (hot reload)
npm run start:dev        # Start with NestJS watch mode
npm run start:debug      # Start with debug mode
```

### Production
```bash
npm run build            # Build for production
npm run start:prod       # Start production server
```

### Database
```bash
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database
```

### Admin Setup
```bash
npm run setup:admin      # Setup admin user (admin@example.com / admin123)
npm run create:admin     # Create admin user
npm run check:admin      # Check and create admin if missing
npm run create:test-data # Create test data
```

### Other
```bash
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Run tests with coverage
```

---

## Notes

- **Base URL:** All routes are prefixed with `/api`
- **Authentication:** Most routes require JWT Bearer token: `Authorization: Bearer <token>`
- **Content-Type:** Use `application/json` for POST/PATCH requests
- **Roles:** ADMIN, MANAGER, VIEWER
- **Permissions:** Some routes use fine-grained permissions (USERS_MANAGE, USERS_VIEW, etc.)
- **Swagger Docs:** Available at `http://localhost:3001/api/docs`
- **Default Port:** 3001 (configurable via PORT env variable)
- **CORS:** Configured for `http://localhost:3000` and `http://localhost:3001` by default


