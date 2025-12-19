# Mapping State Refactoring Summary

## Overview
Refactored mapping state to use `undefined` instead of empty string `""` to represent "not selected" state. This prevents issues with Radix UI Select component which doesn't handle empty strings properly.

## Problem
Radix UI Select treats empty string `""` as a valid value but doesn't display placeholder when value is empty string, creating confusing UX where the select appears empty but isn't actually in a "no selection" state.

## Solution
- Use `undefined` to represent "not selected" state internally
- Use sentinel value `__SKIP_COLUMN__` for Select component (since Radix UI Select requires non-empty string)
- Convert between sentinel value and `undefined` in handlers

## Files Modified

### 1. `/CRM/lib/api/import.ts`
**Changes:**
- Updated function signatures to accept `Record<string, string | undefined>` instead of `Record<string, string>`
- Added `cleanMapping` function to filter out `undefined` values before sending to API
- Functions affected:
  - `importContacts()`
  - `importDeals()`

**Code:**
```typescript
// Before
export async function importContacts(
  file: File,
  mapping: Record<string, string>,
  ...
): Promise<ImportResult>

// After
export async function importContacts(
  file: File,
  mapping: Record<string, string | undefined>,
  ...
): Promise<ImportResult> {
  // Filter out undefined values before sending to API
  const cleanMapping = Object.entries(mapping).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})
  
  formData.append('mapping', JSON.stringify(cleanMapping))
  ...
}
```

### 2. `/CRM/components/crm/auto-mapping-form.tsx`
**Changes:**
- Added `SKIP_COLUMN_VALUE` sentinel constant
- Updated all type signatures to use `Record<string, string | undefined>`
- Modified `handleMappingChange` to convert sentinel to `undefined`
- Updated auto-mapping logic to explicitly set `undefined` for low-confidence mappings
- Convert between `undefined` and sentinel value for Select component

**Code:**
```typescript
// Sentinel value
const SKIP_COLUMN_VALUE = '__SKIP_COLUMN__' as const

// Updated interface
interface AutoMappingFormProps {
  csvColumns: string[]
  entityType: 'contact' | 'deal'
  onMappingChange: (mapping: Record<string, string | undefined>) => void
  initialMapping?: Record<string, string | undefined>
}

// State
const [mapping, setMapping] = useState<Record<string, string | undefined>>(initialMapping)

// Auto-mapping with explicit undefined
const autoMapping: Record<string, string | undefined> = {}
autoMappings.forEach((am) => {
  if (am.suggestedField && am.confidence >= 0.6) {
    autoMapping[am.columnName] = am.suggestedField
  } else {
    autoMapping[am.columnName] = undefined  // Explicit undefined for low confidence
  }
})

// Convert undefined to sentinel for Select
const currentMapping = mapping[column]
const selectValue = currentMapping === undefined ? SKIP_COLUMN_VALUE : currentMapping

// Convert sentinel to undefined in handler
const handleMappingChange = (csvColumn: string, crmField: string | undefined) => {
  const actualValue = crmField === SKIP_COLUMN_VALUE ? undefined : crmField
  setMapping((prev) => ({ ...prev, [csvColumn]: actualValue }))
}

// SelectItem uses sentinel value
<SelectItem value={SKIP_COLUMN_VALUE}>— Skip this column —</SelectItem>
```

### 3. `/CRM/components/crm/column-mapping-form.tsx`
**Changes:**
- Added `SKIP_COLUMN_VALUE` sentinel constant
- Updated all type signatures to use `Record<string, string | undefined>`
- Modified validation to check for `undefined` instead of `'skip'`
- Convert between `undefined` and sentinel value for Select component

**Code:**
```typescript
// Sentinel value
const SKIP_COLUMN_VALUE = '__SKIP_COLUMN__' as const

// Updated interface
interface ColumnMappingFormProps {
  importedColumns?: string[]
  columns?: string[]
  onImport?: (mapping: Record<string, string | undefined>) => void
}

// State
const [mapping, setMapping] = useState<Record<string, string | undefined>>({})

// Handler with sentinel conversion
const handleMappingChange = (importedCol: string, crmField: string | undefined) => {
  const actualValue = crmField === SKIP_COLUMN_VALUE ? undefined : crmField
  setMapping((prev) => ({ ...prev, [importedCol]: actualValue }))
}

// Validation checks undefined
const mappedFields = Object.values(mapping).filter(v => v !== undefined)

// Select value conversion
<Select
  value={mapping[column] === undefined ? SKIP_COLUMN_VALUE : mapping[column]}
  onValueChange={(value) => handleMappingChange(column, value)}
>
```

### 4. `/CRM/app/import-export/page.tsx`
**Changes:**
- Updated mapping state type to `Record<string, string | undefined>`
- Updated `handleMappingChange` signature
- Modified `isMappingValid` to check for `undefined` instead of empty string

**Code:**
```typescript
// State
const [mapping, setMapping] = useState<Record<string, string | undefined>>({})

// Handler
const handleMappingChange = (newMapping: Record<string, string | undefined>) => {
  setMapping(newMapping)
}

// Validation
const isMappingValid = () => {
  const mappedFields = Object.values(mapping).filter(v => v !== undefined)
  return mappedFields.length > 0
}
```

## Key Principles

1. **Internal State**: Use `undefined` to represent "not selected"
   ```typescript
   mapping[column] = undefined  // Not selected
   mapping[column] = 'fullName' // Selected field
   ```

2. **Select Component**: Use sentinel value for Radix UI Select
   ```typescript
   const selectValue = mapping[column] ?? SKIP_COLUMN_VALUE
   ```

3. **Handler Conversion**: Convert sentinel back to undefined
   ```typescript
   const actualValue = value === SKIP_COLUMN_VALUE ? undefined : value
   ```

4. **API Calls**: Filter out undefined before sending
   ```typescript
   const cleanMapping = Object.entries(mapping)
     .reduce<Record<string, string>>((acc, [key, value]) => {
       if (value !== undefined) {
         acc[key] = value
       }
       return acc
     }, {})
   ```

5. **Validation**: Check for undefined
   ```typescript
   const mappedFields = Object.values(mapping).filter(v => v !== undefined)
   ```

## Benefits

1. **Type Safety**: `undefined` clearly indicates "no selection" at type level
2. **No Empty Strings**: Eliminates problematic `""` values entirely
3. **Explicit Intent**: `undefined` makes "not selected" state explicit
4. **Select Compatibility**: Sentinel value works perfectly with Radix UI Select
5. **Clean API Calls**: Only actual mappings are sent to backend

## Testing Checklist

- [ ] Empty mapping state shows placeholder in Select
- [ ] Selecting "Skip this column" sets mapping to undefined internally
- [ ] Auto-mapping with low confidence leaves mapping as undefined
- [ ] Auto-mapping with high confidence sets actual field value
- [ ] Import validation correctly identifies mapped vs unmapped columns
- [ ] API receives only non-undefined mappings
- [ ] TypeScript compilation passes with no errors

## Migration Notes

**Before:**
```typescript
mapping[column] = ''  // ❌ Empty string
if (value === '') { ... }  // ❌ Check for empty string
```

**After:**
```typescript
mapping[column] = undefined  // ✅ Undefined
if (value === undefined) { ... }  // ✅ Check for undefined
```

## Related Issues

This refactoring fixes the following issues identified in the audit:
1. `auto-mapping-form.tsx` - Line 242, 255: Empty string in Select value
2. `column-mapping-form.tsx` - Line 105: Empty string fallback
3. All mapping state now uses undefined consistently

## Future Improvements

1. Consider creating a shared `MappingState` type:
   ```typescript
   type MappingState = Record<string, string | undefined>
   ```

2. Create utility functions:
   ```typescript
   function cleanMapping(mapping: MappingState): Record<string, string>
   function toSelectValue(value: string | undefined): string
   function fromSelectValue(value: string): string | undefined
   ```

