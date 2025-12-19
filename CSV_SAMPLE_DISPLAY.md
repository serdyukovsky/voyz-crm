# CSV Sample Values Display

## Summary
Enhanced the mapping UI to show real example values from the CSV for each column, making it easier for users to verify correct field mapping.

## Changes

### Frontend Components

#### 1. `components/crm/auto-mapping-form.tsx`
- **Added `csvSampleData` prop**: Accepts `ParsedCsvRow[]` (array of CSV rows)
- **Added `getSampleValues` helper**: Extracts 1-2 unique non-empty sample values per column
- **Enhanced UI**:
  - Displays "Examples:" label with up to 2 sample values
  - Values shown in monospace font with muted background
  - Long values truncated to 25 chars with ellipsis
  - Full value visible on hover (title attribute)

#### 2. `components/crm/column-mapping-form.tsx`
- **Added `csvSampleData` prop**: Accepts `ParsedCsvRow[]`
- **Added `getSampleValues` helper**: Same logic as AutoMappingForm
- **Enhanced UI**: Same visual treatment as AutoMappingForm

#### 3. `app/import-export/page.tsx`
- **Updated `AutoMappingForm` usage**: Passes `csvRows` as `csvSampleData` prop

## UI Appearance

### Before
```
┌─────────────────────────────────────────┐
│ fullName              →  [Select field] │
└─────────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────────┐
│ fullName              →  [Select field] │
│ EXAMPLES: "John Doe"  "Jane Smith"      │
└─────────────────────────────────────────┘
```

## Sample Extraction Logic

```typescript
const getSampleValues = (columnName: string): string[] => {
  if (!csvSampleData || csvSampleData.length === 0) {
    return []
  }
  
  const samples: string[] = []
  for (const row of csvSampleData) {
    const value = row[columnName]
    // Only include non-empty, unique values
    if (value && value.trim() !== '' && !samples.includes(value)) {
      samples.push(value)
      if (samples.length >= 2) break  // Max 2 samples
    }
  }
  return samples
}
```

## Features

1. **Smart Sampling**:
   - Shows up to 2 unique values per column
   - Skips empty/whitespace-only values
   - Deduplicates values (same value not shown twice)

2. **Visual Design**:
   - Compact display with uppercase "EXAMPLES:" label
   - Monospace font for data values
   - Muted background and border
   - Truncation for long values (>25 chars)
   - Full value on hover via `title` attribute

3. **Performance**:
   - Extracts samples lazily (only when rendering)
   - Stops after finding 2 samples (no full scan)
   - No impact on CSV parsing or mapping logic

## Benefits

1. **Improved UX**: Users can verify mapping correctness at a glance
2. **Reduced Errors**: Easier to spot mismatched fields (e.g., phone vs email)
3. **Especially Helpful For**:
   - Contact fields (email, phone, name)
   - Ambiguous column names ("value", "amount", "id")
   - Similar field types (firstName vs fullName)
4. **Non-intrusive**: Samples appear inline, don't clutter UI

## Example Use Case

**CSV Columns:**
```csv
contact_name,email_address,mobile_number
John Doe,john@example.com,+1234567890
Jane Smith,jane@example.com,+0987654321
```

**Mapping UI Display:**
```
┌────────────────────────────────────────────────────┐
│ contact_name                    →  [Full Name    ▼] │
│ EXAMPLES: "John Doe"  "Jane Smith"                  │
├────────────────────────────────────────────────────┤
│ email_address                   →  [Email        ▼] │
│ EXAMPLES: "john@example.com"  "jane@example.com"    │
├────────────────────────────────────────────────────┤
│ mobile_number                   →  [Phone        ▼] │
│ EXAMPLES: "+1234567890"  "+0987654321"              │
└────────────────────────────────────────────────────┘
```

The user can immediately verify:
- ✅ `contact_name` → Full Name (sees "John Doe")
- ✅ `email_address` → Email (sees "john@example.com")
- ✅ `mobile_number` → Phone (sees "+1234567890")

## Technical Notes

- **Data Source**: Uses existing `csvRows` state from parent component
- **No Backend Changes**: Pure frontend enhancement
- **Backward Compatible**: Works without `csvSampleData` (shows no samples)
- **Type Safe**: Uses same `ParsedCsvRow` interface as CSV parser

## Testing

- [x] Upload CSV with various column types
- [x] Verify 1-2 samples displayed per column
- [x] Test with empty columns (no samples shown)
- [x] Test with long values (truncation works)
- [x] Test with duplicate values (only shows once)
- [x] Verify hover shows full value for truncated samples
- [x] Test with both AutoMappingForm and ColumnMappingForm

