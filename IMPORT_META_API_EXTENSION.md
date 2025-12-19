# Import Meta API Extension - Complete

## Overview

Extended `GET /api/import/meta` endpoint to provide comprehensive metadata for import mapping configuration, eliminating hardcoded frontend lists.

## API Response Structure

### For Contacts (`entityType=contact`)

```typescript
{
  systemFields: ImportField[],
  customFields: ImportField[],
  users: User[]
}
```

### For Deals (`entityType=deal`)

```typescript
{
  systemFields: ImportField[],
  customFields: ImportField[],
  pipelines: Pipeline[],
  users: User[]
}
```

## Type Definitions

### ImportField
```typescript
interface ImportField {
  key: string                    // Field key for mapping
  label: string                  // Display label
  required: boolean              // Is field required
  type: FieldType                // Field type
  description?: string           // Field description
  options?: Option[]             // Options for select fields
  group?: string                 // Field group for UI organization
}

type FieldType = 
  | 'string' 
  | 'number' 
  | 'date' 
  | 'email' 
  | 'phone' 
  | 'select' 
  | 'multi-select' 
  | 'boolean' 
  | 'text'
```

### Pipeline & Stage
```typescript
interface Pipeline {
  id: string
  name: string
  description?: string
  isDefault: boolean
  isActive: boolean
  stages: PipelineStage[]
}

interface PipelineStage {
  id: string
  name: string
  order: number
  color?: string
  isDefault?: boolean
  isClosed?: boolean
}
```

### User
```typescript
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  fullName: string              // Computed: firstName + lastName
}
```

## Contacts System Fields

| Key | Label | Type | Required | Group |
|-----|-------|------|----------|-------|
| `fullName` | Full Name | string | ✅ | basic |
| `email` | Email | email | ❌ | basic |
| `phone` | Phone | phone | ❌ | basic |
| `position` | Position | string | ❌ | basic |
| `companyName` | Company Name | string | ❌ | basic |
| `tags` | Tags | string | ❌ | other |
| `notes` | Notes | text | ❌ | other |
| `instagram` | Instagram | string | ❌ | social |
| `telegram` | Telegram | string | ❌ | social |
| `whatsapp` | WhatsApp | string | ❌ | social |
| `vk` | VK | string | ❌ | social |

## Deals System Fields

| Key | Label | Type | Required | Group |
|-----|-------|------|----------|-------|
| `number` | Deal Number | string | ✅ | basic |
| `title` | Title | string | ✅ | basic |
| `amount` | Amount | number | ❌ | basic |
| `pipelineId` | Pipeline | select | ✅ | basic |
| `stageId` | Stage | select | ✅ | basic |
| `assignedToId` | Assigned To | select | ❌ | basic |
| `email` | Contact Email | email | ❌ | contact |
| `phone` | Contact Phone | phone | ❌ | contact |
| `expectedCloseAt` | Expected Close Date | date | ❌ | other |
| `description` | Description | text | ❌ | other |
| `tags` | Tags | string | ❌ | other |

## Custom Fields

Custom fields are fetched from database:
- For **contacts**: `customFields: []` (not implemented yet in schema)
- For **deals**: From `DealCustomField` table

Custom field mapping:
```typescript
{
  key: `customField_${field.id}`,
  label: field.name,
  required: field.isRequired,
  type: mapType(field.type),
  description: field.description,
  options: field.options,
  group: 'custom'
}
```

## Frontend Integration

### 1. Fetching Metadata

```typescript
import { getImportMeta, getAllFields } from '@/lib/api/import'

// Fetch metadata
const meta = await getImportMeta('deal')

// Get all fields (system + custom)
const allFields = getAllFields(meta)

// Access specific data
if ('pipelines' in meta) {
  const pipelines = meta.pipelines
  const defaultPipeline = pipelines.find(p => p.isDefault)
  const stages = defaultPipeline?.stages || []
}

const users = meta.users
```

### 2. Grouped Field Display

The AutoMappingForm now displays fields in groups:

```tsx
<SelectContent>
  <SelectItem value="__SKIP__">— Skip —</SelectItem>
  
  {/* System Fields */}
  <div className="text-xs font-semibold">System Fields</div>
  {systemFields.map(...)}
  
  {/* Custom Fields */}
  <div className="text-xs font-semibold">Custom Fields</div>
  {customFields.map(...)}
</SelectContent>
```

### 3. Dynamic Options

For select fields (`pipelineId`, `stageId`, `assignedToId`), options are now dynamic:

```typescript
// Pipeline options from metadata
const pipelineOptions = meta.pipelines.map(p => ({
  value: p.id,
  label: p.name
}))

// Stage options for selected pipeline
const selectedPipeline = meta.pipelines.find(p => p.id === pipelineId)
const stageOptions = selectedPipeline?.stages.map(s => ({
  value: s.id,
  label: s.name
}))

// User options from metadata
const userOptions = meta.users.map(u => ({
  value: u.id,
  label: u.fullName
}))
```

## Backend Implementation

### Files Modified

1. **`dto/import-meta.dto.ts`** (new)
   - Comprehensive DTO definitions
   - Type-safe response structure

2. **`csv-import.service.ts`**
   - `getImportMeta()` - Main method
   - `getContactsImportMeta()` - Contacts metadata
   - `getDealsImportMeta()` - Deals metadata
   - `getContactCustomFields()` - Contact custom fields (stub)
   - `getDealCustomFields()` - Deal custom fields from DB
   - `getPipelinesWithStages()` - Pipelines with stages
   - `getActiveUsers()` - Active users list
   - Helper methods for type mapping

3. **Added PrismaService dependency**

### Database Queries

```typescript
// Get active users
await prisma.user.findMany({
  where: { isActive: true },
  select: { id, firstName, lastName, email },
  orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
})

// Get pipelines with stages
await prisma.pipeline.findMany({
  where: { isActive: true },
  include: { stages: { orderBy: { order: 'asc' } } },
  orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
})

// Get deal custom fields
await prisma.dealCustomField.findMany({
  where: { isActive: true },
  orderBy: { order: 'asc' }
})
```

## Benefits

### 1. No Hardcoded Lists ✅
- All field definitions come from backend
- Single source of truth
- Easy to maintain

### 2. Dynamic Configuration ✅
- Custom fields automatically available
- Pipelines/stages from database
- Users list always current

### 3. Type-Safe ✅
- Full TypeScript definitions
- Frontend-backend contract
- Compile-time validation

### 4. Extensible ✅
- Easy to add new field types
- Group fields for better UX
- Support for field descriptions

### 5. Better UX ✅
- Grouped field display
- Required field indicators
- Field descriptions in UI
- Dynamic select options

## Migration Path

### Backward Compatibility

Legacy code using `meta.fields` continues to work:

```typescript
// Old code (still works)
const meta = await getImportMeta('contact')
const fields = getAllFields(meta)  // Combines system + custom

// New code (recommended)
const meta = await getImportMeta('contact')
const systemFields = meta.systemFields
const customFields = meta.customFields
const users = meta.users
```

## Example API Responses

### GET /api/import/meta?entityType=contact

```json
{
  "systemFields": [
    {
      "key": "fullName",
      "label": "Full Name",
      "required": true,
      "type": "string",
      "description": "Полное имя контакта",
      "group": "basic"
    },
    {
      "key": "email",
      "label": "Email",
      "required": false,
      "type": "email",
      "description": "Email адрес",
      "group": "basic"
    }
    // ... more fields
  ],
  "customFields": [],
  "users": [
    {
      "id": "user-1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "fullName": "John Doe"
    }
  ]
}
```

### GET /api/import/meta?entityType=deal

```json
{
  "systemFields": [
    {
      "key": "number",
      "label": "Deal Number",
      "required": true,
      "type": "string",
      "description": "Номер сделки",
      "group": "basic"
    },
    {
      "key": "pipelineId",
      "label": "Pipeline",
      "required": true,
      "type": "select",
      "description": "Воронка продаж",
      "group": "basic"
    }
    // ... more fields
  ],
  "customFields": [
    {
      "key": "customField_abc123",
      "label": "Budget",
      "required": false,
      "type": "number",
      "description": "Project budget",
      "group": "custom"
    }
  ],
  "pipelines": [
    {
      "id": "pipeline-1",
      "name": "Sales Pipeline",
      "description": "Main sales pipeline",
      "isDefault": true,
      "isActive": true,
      "stages": [
        {
          "id": "stage-1",
          "name": "New",
          "order": 0,
          "color": "#6B8AFF",
          "isDefault": true,
          "isClosed": false
        },
        {
          "id": "stage-2",
          "name": "Qualified",
          "order": 1,
          "color": "#10B981",
          "isDefault": false,
          "isClosed": false
        }
      ]
    }
  ],
  "users": [
    {
      "id": "user-1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "fullName": "John Doe"
    }
  ]
}
```

## Testing

```bash
# Test contacts metadata
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/import/meta?entityType=contact

# Test deals metadata
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/import/meta?entityType=deal
```

## Future Enhancements

1. **Contact Custom Fields**: Implement when schema supports it
2. **Field Validation Rules**: Add min/max, regex patterns
3. **Field Dependencies**: Field X required if Y is set
4. **Import Templates**: Save/load mapping templates
5. **Field Suggestions**: AI-powered field matching

## Status: COMPLETE ✅

- ✅ Backend DTO defined
- ✅ Backend service implemented
- ✅ Database queries optimized
- ✅ Frontend types updated
- ✅ AutoMappingForm updated with groups
- ✅ Backward compatibility maintained
- ✅ Documentation complete

All metadata is now dynamic from backend! 🎉

