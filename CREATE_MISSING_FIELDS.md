# Create Missing Fields During Import Mapping

## Summary
Added ability to create custom fields on-the-fly during import mapping when a suitable field doesn't exist. Fields are persisted to the database before import execution.

## Changes

### Backend

#### 1. `custom-fields/dto/create-custom-field.dto.ts` (New)
**DTO for creating custom fields:**
```typescript
interface CreateCustomFieldDto {
  name: string              // Display name
  key?: string             // API key (auto-generated if not provided)
  type: CustomFieldType    // TEXT, NUMBER, SELECT, etc.
  entityType: string       // 'contact' or 'deal'
  group?: string          // Field group (default: 'custom')
  isRequired?: boolean    // Required field flag
  options?: string[]      // Options for SELECT/MULTI_SELECT
}
```

**Supported Field Types:**
- `TEXT` - Short text input
- `NUMBER` - Numeric value
- `DATE` - Date picker
- `SELECT` - Single choice from list
- `MULTI_SELECT` - Multiple choices from list
- `BOOLEAN` - Yes/No checkbox
- `EMAIL` - Email address
- `PHONE` - Phone number
- `URL` - Website link

#### 2. `custom-fields/custom-fields.controller.ts` (New)
**REST API endpoints:**

**POST /api/custom-fields**
- Creates a new custom field
- Auto-generates key from name if not provided
- Transforms options array to JSON format for Prisma
- Returns created field with ID

**GET /api/custom-fields?entityType=contact|deal**
- Retrieves all active custom fields for entity type
- Used by frontend to refresh field list after creation

**Example Request:**
```json
POST /api/custom-fields
{
  "name": "Department",
  "type": "SELECT",
  "entityType": "contact",
  "isRequired": false,
  "options": ["Sales", "Marketing", "Engineering"]
}
```

**Example Response:**
```json
{
  "id": "field-abc-123",
  "name": "Department",
  "key": "custom_department",
  "type": "SELECT",
  "entityType": "contact",
  "group": "custom",
  "isRequired": false,
  "isActive": true,
  "options": {
    "options": ["Sales", "Marketing", "Engineering"]
  },
  "order": 0,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

#### 3. `custom-fields/custom-fields.module.ts`
- Added `CustomFieldsController` to module
- Exported `CustomFieldsService` for use in other modules

#### 4. `custom-fields/custom-fields.service.ts` (Updated)
- Added validation and error handling
- Support for `options` field transformation

### Frontend

#### 1. `lib/api/custom-fields.ts` (New)
**API client functions:**

**`createCustomField(dto)`**
- POST request to create custom field
- Handles authentication
- Returns created field

**`getCustomFields(entityType)`**
- GET request to fetch fields
- Filters by entity type
- Returns array of custom fields

**TypeScript Interfaces:**
```typescript
type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'EMAIL' | 'PHONE' | 'URL'

interface CustomField {
  id: string
  name: string
  key: string
  type: CustomFieldType
  entityType: string
  group?: string
  isRequired: boolean
  isActive: boolean
  options?: { options?: string[] }
  order: number
  createdAt: string
  updatedAt: string
}
```

#### 2. `components/crm/create-field-dialog.tsx` (New)
**Modal dialog for creating custom fields:**

**Features:**
- Field name input (required)
- Field type selector with descriptions
- Dynamic options input for SELECT/MULTI_SELECT
  - Add/remove options
  - Minimum 1 option required
- "Required field" checkbox
- Validation before submission
- Loading states
- Toast notifications

**Props:**
```typescript
interface CreateFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: 'contact' | 'deal'
  suggestedName?: string           // Pre-fills from column name
  onFieldCreated: (fieldKey: string) => void  // Callback with new field key
}
```

**UI States:**
1. **Text/Number/Date/Boolean fields:**
   - Name + Type selector
   - Required checkbox

2. **SELECT/MULTI_SELECT fields:**
   - Name + Type selector
   - Options list (dynamic add/remove)
   - Required checkbox
   - Validation: at least 1 option

**Validation:**
- Name is required
- Options required for SELECT types (min 1)
- Empty options filtered out
- Client-side validation before API call

#### 3. `components/crm/auto-mapping-form.tsx` (Updated)
**Added "Create Field" functionality:**

**New State:**
```typescript
const [isCreateFieldDialogOpen, setIsCreateFieldDialogOpen] = useState(false)
const [createFieldForColumn, setCreateFieldForColumn] = useState<string | null>(null)
```

**New Functions:**
- `handleCreateField(columnName)` - Opens dialog with suggested name
- `handleFieldCreated(fieldKey)` - Reloads fields + auto-maps to new field

**UI Changes:**
- Added `<Plus>` button next to each Select dropdown
- Button opens `CreateFieldDialog`
- After field creation:
  1. Fields list refreshes (calls `loadFields()`)
  2. Column auto-maps to new field
  3. Dialog closes
  4. Toast notification shows success

**Updated Tip:**
```
Tip: Fields marked as "Required" must be mapped for the import to succeed.
Auto-mapped fields with high confidence are pre-selected. Click the + button to create a new custom field.
```

## User Flow

### Scenario 1: CSV has unknown column "Department"

**CSV:**
```csv
name,email,department,phone
John Doe,john@company.com,Sales,+1234567890
Jane Smith,jane@company.com,Engineering,+0987654321
```

**Flow:**
1. User uploads CSV
2. Auto-mapping runs → "name" maps to "Full Name", "email" maps to "Email"
3. "department" has no matching field (confidence 0)
4. User sees "department" unmapped
5. User clicks **[+]** button next to "department" row
6. Dialog opens with suggested name: "department"
7. User selects:
   - **Type:** SELECT
   - **Options:** Sales, Marketing, Engineering, HR
   - **Required:** No
8. User clicks "Create Field"
9. Backend creates custom field: `custom_department`
10. Field list refreshes, now includes "Department"
11. "department" column auto-maps to "Department"
12. User proceeds with import ✅

### Scenario 2: Creating number field for "Budget"

**CSV:**
```csv
deal_name,amount,budget,stage
Deal 1,50000,75000,Qualification
Deal 2,100000,150000,Proposal
```

**Flow:**
1. User maps "deal_name" → "Title", "amount" → "Amount", "stage" → "Stage"
2. "budget" is unmapped
3. User clicks **[+]** next to "budget"
4. Dialog opens:
   - **Name:** budget (pre-filled)
   - **Type:** NUMBER (user selects)
   - **Required:** No
5. User clicks "Create Field"
6. Field created: `custom_budget` (type: NUMBER)
7. "budget" auto-maps to "Budget"
8. Import proceeds with budget values ✅

### Scenario 3: Creating multi-select for "Tags"

**CSV:**
```csv
contact_name,email,tags
John Doe,john@example.com,"VIP, Partner, Hot Lead"
Jane Smith,jane@example.com,"Cold Lead, Follow-up"
```

**Flow:**
1. "tags" column needs mapping
2. User clicks **[+]**
3. Dialog:
   - **Name:** Tags
   - **Type:** MULTI_SELECT
   - **Options:**
     - VIP
     - Partner
     - Hot Lead
     - Cold Lead
     - Follow-up
   - **Required:** No
4. Field created: `custom_tags`
5. "tags" mapped to "Tags"
6. Import splits CSV values by comma ✅

## Benefits

1. **No Pre-Configuration Required**: Users can import any CSV without pre-creating fields
2. **Context-Aware**: Field creation happens in-context during mapping
3. **Suggested Names**: Dialog pre-fills with column name for convenience
4. **Flexible Types**: Support for text, number, select, multi-select, etc.
5. **Persistent**: Fields are saved and available for future imports/records
6. **Auto-Mapping**: Newly created field immediately maps to CSV column
7. **Type Safety**: Validation ensures correct field configuration

## Technical Details

### Field Key Generation
```typescript
// If key not provided, auto-generate from name
const key = dto.key || `custom_${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`

// Examples:
// "Department" → "custom_department"
// "Budget (USD)" → "custom_budget_usd"
// "2024 Revenue" → "custom_2024_revenue"
```

### Options Storage
```typescript
// Frontend sends array
{ options: ["Sales", "Marketing", "Engineering"] }

// Backend transforms to JSON for Prisma
{ options: { options: ["Sales", "Marketing", "Engineering"] } }

// Database stores as JSON field
```

### Field Refresh Flow
```typescript
handleFieldCreated(fieldKey) {
  // 1. Reload fields from API
  await loadFields()
  
  // 2. Auto-map column to new field
  if (createFieldForColumn) {
    handleMappingChange(createFieldForColumn, fieldKey)
  }
  
  // 3. Reset state
  setCreateFieldForColumn(null)
}
```

### Import Integration
- Fields created during mapping are available immediately
- Import execution reads custom fields from database
- No special handling needed in import logic
- Works with both contacts and deals

## API Endpoints

### Create Custom Field
```
POST /api/custom-fields
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Department",
  "type": "SELECT",
  "entityType": "contact",
  "isRequired": false,
  "options": ["Sales", "Marketing"]
}
```

### Get Custom Fields
```
GET /api/custom-fields?entityType=contact
Authorization: Bearer <token>
```

## Validation Rules

### Backend
- `name` is required
- `type` must be valid CustomFieldType enum
- `entityType` must be 'contact' or 'deal'
- `options` required for SELECT/MULTI_SELECT types
- Auto-generates `key` if not provided
- Sets default `group` to 'custom'

### Frontend
- Name cannot be empty
- At least 1 option for SELECT fields
- Empty options are filtered out
- Toast notifications for errors

## Error Handling

### Backend Errors
- 400: Invalid DTO (missing required fields)
- 401: Unauthorized (no token)
- 500: Database error

### Frontend Errors
- Network errors → Toast notification
- Validation errors → Toast notification
- Shows error message in dialog
- Doesn't close dialog on error (user can fix)

## Testing Checklist

### Backend
- [x] POST /api/custom-fields creates field
- [x] GET /api/custom-fields returns fields
- [x] Auto-generates key from name
- [x] Validates required fields
- [x] Handles SELECT options correctly
- [x] Returns 401 if not authenticated

### Frontend
- [x] Dialog opens when + button clicked
- [x] Pre-fills suggested name from column
- [x] Type selector works
- [x] Options input for SELECT types
- [x] Add/remove options works
- [x] Validation prevents empty name
- [x] Validation requires options for SELECT
- [x] API call succeeds
- [x] Fields list refreshes after creation
- [x] Column auto-maps to new field
- [x] Toast shows success message
- [x] Dialog closes on success
- [x] Error handling with toast

### Integration
- [x] Create TEXT field during contact import
- [x] Create NUMBER field during deal import
- [x] Create SELECT field with options
- [x] Create MULTI_SELECT field
- [x] New field appears in mapping dropdown
- [x] Import succeeds with new field
- [x] Field persists for future imports
- [x] Field values saved correctly

## Future Enhancements

- [ ] Edit existing custom fields
- [ ] Delete custom fields (with safety checks)
- [ ] Reorder fields
- [ ] Field validation rules (min/max, regex)
- [ ] Default values for fields
- [ ] Field dependencies (show/hide based on other fields)
- [ ] Bulk create fields from CSV columns

