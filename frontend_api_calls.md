# Frontend API Calls Documentation

**Frontend Folder:** `CRM/`  
**Framework:** Vite + React  
**Base URL Environment Variable:** `VITE_API_URL`  
**Default Base URL:** `http://localhost:3001/api`  
**WebSocket URL Environment Variable:** `VITE_WS_URL`  
**Default WebSocket URL:** `http://localhost:3001/realtime`

---

## Environment Variables

### Recommended Configuration

```bash
# .env file
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001/realtime
```

---

## API Calls by File

### `lib/api/auth.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 28 | POST | `/auth/login` | `{ email: string, password: string }` | No |

**Sample Payload:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

---

### `lib/api/deals.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 63 | GET | `/deals?pipelineId=xxx&stageId=yyy&...` | Query params: `pipelineId`, `stageId`, `assignedToId`, `contactId`, `companyId`, `search` | Yes (Bearer) |
| 99 | GET | `/deals/:id` | None | Yes (Bearer) |
| 146 | POST | `/deals` | `{ title, amount, pipelineId, stageId, contactId?, companyId?, assignedToId?, description? }` | Yes (Bearer) |
| 196 | PATCH | `/deals/:id` | Partial deal update | Yes (Bearer) |
| 218 | DELETE | `/deals/:id` | None | Yes (Bearer) |

**Sample Payloads:**

**Create Deal:**
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

**Update Deal:**
```json
{
  "title": "Updated Title",
  "amount": 15000,
  "stageId": "new-stage-id"
}
```

---

### `lib/api/contacts.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 196 | GET | `/contacts?search=xxx&companyId=yyy&...` | Query params: `search`, `companyName`, `companyId`, `hasActiveDeals`, `hasClosedDeals` | Yes (Bearer) |
| 236 | GET | `/contacts/:id` | None | Yes (Bearer) |
| 257 | GET | `/contacts/:id/tasks` | None | Yes (Bearer) |
| 301 | POST | `/contacts` | `{ fullName, email?, phone?, position?, companyId?, tags?, notes?, social? }` | Yes (Bearer) |
| 339 | PATCH | `/contacts/:id` | Partial contact update | Yes (Bearer) |
| 366 | DELETE | `/contacts/:id` | None | Yes (Bearer) |
| 385 | GET | `/companies` | None | Yes (Bearer) |
| 400 | POST | `/deals/:dealId/link-contact` | `{ contactId: string }` | Yes (Bearer) |
| 414 | POST | `/deals/:dealId/unlink-contact` | None | Yes (Bearer) |

**Sample Payloads:**

**Create Contact:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "position": "CEO",
  "companyId": "company-id",
  "tags": ["vip", "important"],
  "social": {
    "instagram": "https://instagram.com/john",
    "telegram": "@john",
    "whatsapp": "+1234567890"
  }
}
```

**Link Contact to Deal:**
```json
{
  "contactId": "contact-id"
}
```

---

### `lib/api/companies.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 13 | GET | `/health` | None | No (Health check) |
| 71 | GET | `/companies?search=xxx&industry=yyy` | Query params: `search`, `industry` | Yes (Bearer) |
| 100 | GET | `/companies/:id` | None | Yes (Bearer) |
| 127 | POST | `/companies` | `{ name, industry?, website?, email?, phone?, address?, notes?, employees? }` | Yes (Bearer) |
| 144 | PATCH | `/companies/:id` | Partial company update | Yes (Bearer) |
| 161 | DELETE | `/companies/:id` | None | Yes (Bearer) |

**Sample Payloads:**

**Create Company:**
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

---

### `lib/api/pipelines.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 69 | GET | `/pipelines` | None | Yes (Bearer) |
| 135 | GET | `/pipelines/:id` | None | Yes (Bearer) |
| 164 | POST | `/pipelines` | `{ name, description?, isDefault? }` | Yes (Bearer) |
| 218 | PATCH | `/pipelines/:id` | `{ name?, description?, isDefault?, isActive? }` | Yes (Bearer) |
| 246 | POST | `/pipelines/:pipelineId/stages` | `{ name, order, color?, isDefault?, isClosed? }` | Yes (Bearer) |
| 268 | PATCH | `/stages/:id` | `{ name?, order?, color?, isDefault?, isClosed? }` | Yes (Bearer) |
| 285 | DELETE | `/stages/:id` | None | Yes (Bearer) |
| 303 | DELETE | `/pipelines/:id` | None | Yes (Bearer) |

**Sample Payloads:**

**Create Pipeline:**
```json
{
  "name": "Sales Pipeline",
  "description": "Main sales pipeline",
  "isDefault": false
}
```

**Create Stage:**
```json
{
  "name": "New Stage",
  "order": 0,
  "color": "#6B7280",
  "isDefault": false,
  "isClosed": false
}
```

---

### `lib/api/tasks.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 38 | GET | `/tasks?dealId=xxx&contactId=yyy&...` | Query params: `dealId`, `contactId`, `assignedToId`, `status` | Yes (Bearer) |
| 52 | GET | `/tasks/:id` | None | Yes (Bearer) |

---

### `lib/api/users.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 38 | GET | `/users` | None | Yes (Bearer) |
| 52 | GET | `/users/:id` | None | Yes (Bearer) |
| 66 | POST | `/users` | `{ email, password, firstName, lastName, role?, isActive? }` | Yes (Bearer) |
| 84 | PATCH | `/users/:id` | `{ email?, password?, firstName?, lastName?, role?, isActive?, avatar? }` | Yes (Bearer) |
| 102 | DELETE | `/users/:id` | None | Yes (Bearer) |

**Sample Payloads:**

**Create User:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "MANAGER",
  "isActive": true
}
```

---

### `lib/api/activities.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 78 | GET | `/activities?entityType=deal&entityId=xxx&...` | Query params: `entityType`, `entityId`, `type`, `startDate`, `endDate` | Yes (Bearer) |

**Query Params:**
- `entityType`: `'deal' | 'contact' | 'company' | 'task'`
- `entityId`: string
- `type`: ActivityType enum
- `startDate`: ISO date string
- `endDate`: ISO date string

---

### `lib/api/stats.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 39 | GET | `/stats/global` | None | Yes (Bearer) |

---

### `lib/api/emails.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 20 | POST | `/emails/send` | `{ to, subject, text, html?, dealId?, contactId?, companyId? }` | Yes (Bearer) |

**Sample Payload:**
```json
{
  "to": "client@example.com",
  "subject": "Proposal",
  "text": "Email text content",
  "html": "<p>Email HTML content</p>",
  "dealId": "deal-id",
  "contactId": "contact-id"
}
```

---

### `hooks/use-deal.ts`

| Line | Method | URL | Payload | Auth |
|------|--------|-----|---------|------|
| 95 | GET | `/deals/:dealId` | None | Yes (Bearer) |
| 213 | PATCH | `/deals/:dealId` | Partial deal update | Yes (Bearer) |

**Note:** Uses `import.meta.env.VITE_API_URL` directly (line 93, 212)

---

## WebSocket Connections

### `components/crm/deals-kanban-board.tsx`

| Line | Connection | URL | Purpose |
|------|------------|-----|---------|
| 734 | Socket.IO | `VITE_WS_URL` or `http://localhost:3001/realtime` | Real-time deal updates for Kanban board |

**Connection Code:**
```typescript
const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001/realtime', {
  // Socket.IO configuration
})
```

---

## React Query Hooks (useQuery/useMutation)

These hooks wrap the API functions above:

### `hooks/use-deals.ts`
- `useDeals(params?)` - Uses `getDeals()` from `lib/api/deals.ts`
- `useDeal(id)` - Uses `getDeal()` from `lib/api/deals.ts`
- `useCreateDeal()` - Uses `createDeal()` from `lib/api/deals.ts`
- `useUpdateDeal()` - Uses `updateDeal()` from `lib/api/deals.ts`
- `useDeleteDeal()` - Uses `deleteDeal()` from `lib/api/deals.ts`

### `hooks/use-contacts.ts`
- `useContacts(params?)` - Uses `getContacts()` from `lib/api/contacts.ts`
- `useContact(id)` - Uses `getContact()` from `lib/api/contacts.ts`
- `useCompanies()` - Uses `getCompanies()` from `lib/api/contacts.ts`
- `useCreateContact()` - Uses `createContact()` from `lib/api/contacts.ts`
- `useUpdateContact()` - Uses `updateContact()` from `lib/api/contacts.ts`
- `useDeleteContact()` - Uses `deleteContact()` from `lib/api/contacts.ts`

### `hooks/use-companies.ts`
- `useCompanies(params?)` - Uses `getCompanies()` from `lib/api/companies.ts`
- `useCompany(id)` - Uses `getCompany()` from `lib/api/companies.ts`
- `useCreateCompany()` - Uses `createCompany()` from `lib/api/companies.ts`
- `useUpdateCompany()` - Uses `updateCompany()` from `lib/api/companies.ts`
- `useDeleteCompany()` - Uses `deleteCompany()` from `lib/api/companies.ts`

### `hooks/use-pipelines.ts`
- `usePipelines()` - Uses `getPipelines()` from `lib/api/pipelines.ts`
- `usePipeline(id)` - Uses `getPipeline()` from `lib/api/pipelines.ts`
- `useCreatePipeline()` - Uses `createPipeline()` from `lib/api/pipelines.ts`
- `useUpdatePipeline()` - Uses `updatePipeline()` from `lib/api/pipelines.ts`
- `useDeletePipeline()` - Uses `deletePipeline()` from `lib/api/pipelines.ts`

### `hooks/use-activity.ts`
- `useActivity({ entityType, entityId, filters })` - Uses `getActivities()` from `lib/api/activities.ts`

---

## Authentication

All API calls (except `/auth/login` and `/health`) require JWT Bearer token:

```typescript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
}
```

Token is stored in `localStorage.getItem('access_token')` after successful login.

---

## Summary

- **Total API Files:** 10 files in `lib/api/`
- **Total Direct Fetch Calls:** ~40+ calls
- **React Query Hooks:** 5 hook files wrapping API calls
- **WebSocket Connections:** 1 (Socket.IO for real-time updates)
- **Base URL Pattern:** All use `import.meta.env.VITE_API_URL || 'http://localhost:3001/api'`
- **WebSocket URL Pattern:** `import.meta.env.VITE_WS_URL || 'http://localhost:3001/realtime'`

---

## Notes

1. **Environment Variables:**
   - `VITE_API_URL` - Base API URL (default: `http://localhost:3001/api`)
   - `VITE_WS_URL` - WebSocket URL (default: `http://localhost:3001/realtime`)

2. **Error Handling:**
   - Most API functions return empty arrays `[]` on network errors to prevent app crashes
   - Unauthorized (401/403) responses clear tokens and may trigger redirects
   - Health check endpoint is used to verify backend availability before making calls

3. **Mock Data:**
   - Some functions (like `getContacts`) fall back to mock data if backend is unavailable
   - This allows frontend development without backend running

4. **React Query:**
   - Most API calls are wrapped in React Query hooks for caching and state management
   - Query keys are structured for efficient cache invalidation

5. **WebSocket:**
   - Socket.IO is used for real-time updates in the Kanban board
   - Connection is established in `deals-kanban-board.tsx`

