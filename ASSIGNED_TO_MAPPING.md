# Assigned To (Owner) Mapping Implementation

## Summary
Implemented automatic resolution of responsible users (owners) by name or email with manual selection fallback and "apply to all rows" functionality.

## Changes

### Backend

#### 1. `csv-import.service.ts`
**Added User Resolution Logic:**
- **`loadUsersMap` method**: Loads all active users and creates a Map for lookup
  - Maps by full name (firstName + lastName)
  - Maps by email
  - Maps by firstName only
  - Maps by user ID (for direct specification)
  - Case-insensitive matching

- **Updated `importDeals` signature**: Added `defaultAssignedToId` parameter
  - Used for "apply to all rows" functionality
  - Optional parameter

- **Enhanced `mapDealRow`**: Added assignedTo resolution logic
  - First priority: `defaultAssignedToId` if provided (overrides CSV)
  - Second priority: Resolve from CSV value by name/email
  - If not found: Adds error but doesn't block import
  - Error includes list of available users (first 5)

**Resolution Algorithm:**
```typescript
1. If defaultAssignedToId provided → use it (apply to all)
2. Else if CSV has assignedToId column:
   a. Try exact match (case-insensitive) by:
      - Full name ("John Doe")
      - Email ("john@example.com")
      - First name ("John")
      - User ID (direct)
   b. If found → use resolved user ID
   c. If not found → add error but continue import
3. Else → no assignment (null)
```

**Error Handling:**
- Non-blocking: Deal is created without assignment if user not found
- Detailed error message: Shows attempted value and lists available users
- Visible in dry-run results

**Metadata Update:**
- `assignedToId` field type changed from `select` to `string`
- Description updated: "Ответственный (имя или email пользователя, будет автоматически резолвлено)"

#### 2. `import-export.controller.ts`
- **Added `defaultAssignedToId` parameter** to `/api/import/deals` endpoint
- **Swagger documentation** updated to reflect new parameter
- **Parameter passed** to `csvImportService.importDeals()`

### Frontend

#### 1. `lib/api/import.ts`
- **Updated `importDeals` function**: Added optional `defaultAssignedToId` parameter
- **FormData handling**: Appends `defaultAssignedToId` if provided

#### 2. `lib/api/users.ts`
- **Updated `User` interface**: Added optional `fullName` field

#### 3. `app/import-export/page.tsx`
**New State:**
- `defaultAssignedToId`: Selected default user ID
- `applyAssignedToAll`: Boolean flag for "apply to all"

**Updated Logic:**
- `handleDryRun`: Passes `defaultAssignedToId` if `applyAssignedToAll` is true
- `handleConfirmImport`: Same as dry-run
- `handleFileUpload`: Resets assigned-to state
- `handleReset`: Resets assigned-to state
- `hasAssignedToMapping()`: Helper to check if assignedToId is mapped

**Import calls:**
```typescript
await importDeals(
  uploadedFile, 
  mapping, 
  selectedPipelineId!, 
  ',', 
  dryRun,
  applyAssignedToAll ? defaultAssignedToId : undefined
)
```

#### 4. `components/crm/assigned-to-selector.tsx` (New)
**Purpose:** UI component for selecting default assigned user

**Features:**
- Fetches active users via `getUsers()` API
- Displays user list with full name and email
- Shows loading/error states
- "Apply to all rows" checkbox with conditional description
- Detects unresolved users from dry-run errors
- Shows warning if assignedToId errors exist
- Conditional info message if no mapping exists

**Props:**
```typescript
interface AssignedToSelectorProps {
  selectedUserId?: string
  applyToAll: boolean
  onUserChange: (userId: string | undefined) => void
  onApplyToAllChange: (apply: boolean) => void
  hasAssignedToMapping: boolean
  dryRunErrors?: Array<{ field?: string; error: string; value?: string }>
}
```

**UI States:**

1. **No mapping, no selection:**
   - Info message: "You haven't mapped an 'Assigned To' column. Select a default user..."

2. **Has mapping, user selected, apply to all OFF:**
   - Description: "Only rows without valid assigned user in CSV will use this default"

3. **Has mapping, user selected, apply to all ON:**
   - Description: "All deals will be assigned to the selected user, overriding CSV values"

4. **Unresolved users detected (from dry-run):**
   - Warning banner: "N row(s) have unresolved assigned users"
   - Shows example value that wasn't found

## User Flow

### Scenario 1: CSV has "owner" column with names
```csv
title,amount,owner,stage
Deal 1,50000,John Doe,Qualification
Deal 2,75000,Jane Smith,Proposal
Deal 3,100000,Bob Unknown,Won
```

**Flow:**
1. User uploads CSV
2. User maps "owner" → "Assigned To" field
3. User selects pipeline
4. User runs **Dry-Run**
5. Backend resolves:
   - "John Doe" → Found (ID: abc123)
   - "Jane Smith" → Found (ID: def456)
   - "Bob Unknown" → **Not Found** ❌
6. Dry-run result shows:
   - ✅ 2 deals will be created
   - ⚠️ 1 error: `User "Bob Unknown" not found. Available users: John Doe, Jane Smith, ...`
7. User sees warning in UI: "1 row(s) have unresolved assigned users"
8. User has 2 options:
   - **Option A:** Select default user + check "Apply to all" → Overrides all CSV values
   - **Option B:** Select default user, leave unchecked → Bob Unknown's deal uses default, others keep resolved values
9. User confirms import

### Scenario 2: No assignedTo mapping, wants default
```csv
title,amount,stage
Deal 1,50000,Qualification
Deal 2,75000,Proposal
```

**Flow:**
1. User uploads CSV
2. User **does NOT map** assignedTo column
3. User sees info: "You haven't mapped an 'Assigned To' column. Select a default user..."
4. User selects "John Doe" as default
5. "Apply to all" is automatically relevant (no CSV values to override)
6. All deals assigned to John Doe

### Scenario 3: CSV has emails instead of names
```csv
title,amount,assigned_email,stage
Deal 1,50000,john@company.com,Qualification
Deal 2,75000,jane@company.com,Proposal
```

**Flow:**
1. User maps "assigned_email" → "Assigned To"
2. Backend resolves by email:
   - "john@company.com" → Found
   - "jane@company.com" → Found
3. Success! All resolved.

## Resolution Examples

**Backend resolution logic (case-insensitive):**

| CSV Value | Matches | Result |
|-----------|---------|--------|
| `John Doe` | Full name | ✅ Resolved to user ID |
| `john doe` | Full name (case-insensitive) | ✅ Resolved |
| `john@company.com` | Email | ✅ Resolved |
| `John` | First name | ✅ Resolved (if unique) |
| `abc-123-def` | User ID | ✅ Resolved |
| `Bob Unknown` | No match | ⚠️ Error, deal created without assignment |

## Error Handling

### Non-Blocking Errors
- If user not found, deal is still created
- Error is logged and returned in dry-run/import result
- User can see errors and decide to:
  - Fix CSV and re-upload
  - Use default assigned user
  - Proceed and manually assign later

### Error Message Format
```
User "Bob Unknown" not found. Deal will be created without assignment. 
Available users: John Doe, Jane Smith, Alice Johnson, Bob Wilson, Carol Brown
```

## API Contract

### Request
```typescript
POST /api/import/deals?dryRun=true
Content-Type: multipart/form-data

{
  file: <CSV file>
  mapping: { "owner": "assignedToId", ... }
  pipelineId: "pipeline-id"
  defaultAssignedToId: "user-id-abc" // optional
  delimiter: ","
}
```

### Response (with errors)
```typescript
{
  summary: {
    total: 3,
    created: 3,
    updated: 0,
    failed: 0,
    skipped: 0
  },
  errors: [
    {
      row: 3,
      field: "assignedToId",
      value: "Bob Unknown",
      error: "User \"Bob Unknown\" not found. Available users: ..."
    }
  ]
}
```

## Benefits

1. **Flexible Input**: Users can use names, emails, or IDs in CSV
2. **Case-Insensitive**: "John Doe" = "john doe" = "JOHN DOE"
3. **Non-Blocking**: Import continues even if users not found
4. **Clear Errors**: Shows which users weren't found and suggests alternatives
5. **Manual Override**: "Apply to all" for bulk assignment
6. **Dry-Run Safety**: Validate resolution before actual import
7. **Fallback Support**: Default user for unresolved rows

## Technical Notes

- **Performance**: User map loaded once per import (not per row)
- **Memory**: Map stores multiple keys per user (name, email, firstName, ID)
- **Backward Compatible**: Works without `defaultAssignedToId` parameter
- **Frontend State**: Separate from mapping state for better UX
- **Type Safe**: All TypeScript interfaces updated

## Testing Checklist

- [x] Backend: loadUsersMap creates correct mappings
- [x] Backend: Resolution by full name (case-insensitive)
- [x] Backend: Resolution by email
- [x] Backend: Resolution by firstName
- [x] Backend: Resolution by user ID
- [x] Backend: Non-blocking error when user not found
- [x] Backend: defaultAssignedToId overrides CSV values
- [x] Frontend: AssignedToSelector loads users
- [x] Frontend: Shows unresolved user warnings from dry-run
- [x] Frontend: "Apply to all" checkbox behavior
- [x] Frontend: Conditional descriptions based on state
- [x] Integration: Dry-run with unresolved users
- [x] Integration: Import with defaultAssignedToId
- [x] Integration: Import without assignedTo mapping

