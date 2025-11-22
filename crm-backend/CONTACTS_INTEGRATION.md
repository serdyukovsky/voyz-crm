# Contacts Integration into Deals & Tasks

## ✅ Completed Integration

### 1. Prisma Schema Updates
- ✅ Added `CONTACT_UPDATED_IN_DEAL` to ActivityType enum

### 2. Deals Module Integration

#### Service Updates (`src/deals/deals.service.ts`)
- ✅ `create()` - Returns contact with stats
- ✅ `findAll()` - Returns contacts with stats for each deal
- ✅ `findOne()` - Returns full contact object with stats
- ✅ `update()` - Tracks contact changes and emits WebSocket events
- ✅ `linkContact()` - New method to link contact to deal
- ✅ `unlinkContact()` - New method to unlink contact from deal
- ✅ `formatDealResponse()` - Formats deal with contact stats
- ✅ `getContactStats()` - Helper to get contact statistics

#### Controller Updates (`src/deals/deals.controller.ts`)
- ✅ Added query filters (pipelineId, stageId, assignedToId, contactId, search)
- ✅ Added `POST /api/deals/:id/link-contact` endpoint
- ✅ Added `POST /api/deals/:id/unlink-contact` endpoint
- ✅ Updated Swagger documentation

#### Features
- ✅ Deals contain `contactId`
- ✅ Can be linked/unlinked to contacts via dedicated endpoints
- ✅ Returns full contact object with stats
- ✅ Stats depend on contact (calculated dynamically)
- ✅ Logs include contact-related events (CONTACT_LINKED, CONTACT_UNLINKED)

### 3. Tasks Module Integration

#### Service Updates (`src/tasks/tasks.service.ts`)
- ✅ `findAll()` - Returns contacts with stats, supports contactId filter
- ✅ `findOne()` - Returns contact with stats if contact exists
- ✅ `create()` - Emits contact.task.updated event
- ✅ `update()` - Emits contact.task.updated when contact changes
- ✅ `getContactStats()` - Helper to get contact statistics

#### Controller Updates (`src/tasks/tasks.controller.ts`)
- ✅ Already supports contactId filter via query parameter
- ✅ Supports dealId and assignedToId filters

#### Features
- ✅ Tasks can be attached to a contact (contactId field)
- ✅ Tasks for a contact appear in contact.card (via GET /api/contacts/:id/tasks)
- ✅ API supports filters: by contactId, by dealId, by assignee

### 4. Contacts Module Updates

#### Service Updates (`src/contacts/contacts.service.ts`)
- ✅ `findOne()` - Returns contact with full structure including stats
- ✅ `findAll()` - Returns contacts with stats for each
- ✅ `getStats()` - Fixed recursion issue, calculates stats directly
- ✅ `getTasks()` - New method to get tasks for a contact

#### Controller Updates (`src/contacts/contacts.controller.ts`)
- ✅ Added `GET /api/contacts/:id/tasks` endpoint

#### Features
- ✅ Returns contact in frontend-compatible format:
```typescript
{
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  social: {
    instagram?: string;
    telegram?: string;
    whatsapp?: string;
    vk?: string;
  };
  stats: {
    activeDeals: number;
    closedDeals: number;
    totalDeals: number;
    totalDealVolume?: number;
  };
}
```

### 5. Activity Log Updates

#### Activity Types Added
- ✅ `CONTACT_LINKED` - When contact is linked to deal
- ✅ `CONTACT_UNLINKED` - When contact is unlinked from deal
- ✅ `CONTACT_UPDATED_IN_DEAL` - When contact info is updated in deal context

#### Logging
- ✅ All contact link/unlink operations are logged
- ✅ Contact changes in deals are tracked
- ✅ Contact changes in tasks are tracked

### 6. WebSocket Events

#### Events Added (`src/websocket/realtime.gateway.ts`)
- ✅ `contact.deal.updated` - Emitted when deal linked to contact changes
- ✅ `contact.task.updated` - Emitted when task linked to contact changes

#### Event Flow
- When deal is created/updated with contact → `contact.deal.updated` emitted
- When deal contact is linked/unlinked → `contact.deal.updated` emitted
- When task is created/updated with contact → `contact.task.updated` emitted
- When task contact changes → `contact.task.updated` emitted

### 7. API Endpoints

#### New Endpoints
- `POST /api/deals/:id/link-contact` - Link contact to deal
- `POST /api/deals/:id/unlink-contact` - Unlink contact from deal
- `GET /api/contacts/:id/tasks` - Get tasks for a contact

#### Updated Endpoints
- `GET /api/deals` - Now includes contact with stats
- `GET /api/deals/:id` - Now includes contact with stats
- `POST /api/deals` - Returns contact with stats
- `PATCH /api/deals/:id` - Returns contact with stats
- `GET /api/tasks` - Supports contactId filter, returns contact with stats
- `GET /api/tasks/:id` - Returns contact with stats if exists
- `GET /api/contacts` - Returns contacts with stats
- `GET /api/contacts/:id` - Returns contact with full structure and stats

## Response Format

### Deal Response
```json
{
  "id": "deal-id",
  "title": "Deal Title",
  "contact": {
    "id": "contact-id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "companyName": "Company Inc",
    "social": {
      "instagram": "@johndoe",
      "telegram": "@johndoe",
      "whatsapp": "+1234567890",
      "vk": "johndoe"
    },
    "stats": {
      "activeDeals": 2,
      "closedDeals": 5,
      "totalDeals": 7,
      "totalDealVolume": 50000
    }
  }
}
```

### Task Response
```json
{
  "id": "task-id",
  "title": "Task Title",
  "contact": {
    "id": "contact-id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "companyName": "Company Inc",
    "social": {
      "instagram": "@johndoe",
      "telegram": "@johndoe",
      "whatsapp": "+1234567890",
      "vk": "johndoe"
    },
    "stats": {
      "activeDeals": 2,
      "closedDeals": 5,
      "totalDeals": 7,
      "totalDealVolume": 50000
    }
  }
}
```

### Contact Response
```json
{
  "id": "contact-id",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "position": "Manager",
  "companyName": "Company Inc",
  "tags": ["important", "vip"],
  "notes": "Some notes",
  "social": {
    "instagram": "@johndoe",
    "telegram": "@johndoe",
    "whatsapp": "+1234567890",
    "vk": "johndoe"
  },
  "stats": {
    "activeDeals": 2,
    "closedDeals": 5,
    "totalDeals": 7,
    "totalDealVolume": 50000
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Testing

### Test Link Contact
```bash
POST /api/deals/:dealId/link-contact
{
  "contactId": "contact-id"
}
```

### Test Unlink Contact
```bash
POST /api/deals/:dealId/unlink-contact
```

### Test Get Contact Tasks
```bash
GET /api/contacts/:contactId/tasks
```

### Test Filter Tasks by Contact
```bash
GET /api/tasks?contactId=contact-id
```

## Migration Required

After updating the schema, run:
```bash
npm run prisma:generate
npm run prisma:migrate dev --name add_contact_updated_in_deal_activity
```

## Summary

✅ All requirements implemented:
- Deals contain contactId and can be linked/unlinked
- Deals return full contact object with stats
- Tasks can be attached to contacts
- Tasks for contact appear in contact.card
- API supports all required filters
- Activity log includes contact-related events
- WebSocket events for contact.deal.updated and contact.task.updated
- Frontend-compatible response format with stats

