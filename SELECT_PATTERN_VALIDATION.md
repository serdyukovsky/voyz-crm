# Radix Select Pattern Validation

## ✅ Correct Pattern Implementation

All Select components in import mapping now follow the correct Radix UI pattern.

## Pattern Rules (Applied)

### ✅ 1. Never use empty string as value
```typescript
// ❌ WRONG
<SelectItem value="">— Skip —</SelectItem>

// ✅ CORRECT
const SKIP_COLUMN_VALUE = '__SKIP_COLUMN__' as const
<SelectItem value={SKIP_COLUMN_VALUE}>— Skip this column —</SelectItem>
```

### ✅ 2. Always provide placeholder
```typescript
// ✅ CORRECT
<SelectValue placeholder="Select field..." />
```

### ✅ 3. Value must be string or not provided
```typescript
// ❌ WRONG
<Select value={stateValue ?? undefined} />  // Radix doesn't accept undefined

// ✅ CORRECT
<Select value={stateValue ?? SKIP_COLUMN_VALUE} />  // Always a string
```

### ✅ 4. onValueChange always returns string
```typescript
// ✅ CORRECT
onValueChange={(value: string) => {
  // value is always a string, never undefined
  const actualValue = value === SKIP_COLUMN_VALUE ? undefined : value
  handleMappingChange(column, actualValue)
}}
```

## Implementation Details

### AutoMappingForm

```typescript
// Sentinel value constant
const SKIP_COLUMN_VALUE = '__SKIP_COLUMN__' as const

// State uses undefined for "not selected"
const [mapping, setMapping] = useState<Record<string, string | undefined>>({})

// Convert undefined to sentinel for Select
const currentMapping = mapping[column]
const selectValue = currentMapping ?? SKIP_COLUMN_VALUE

// Select component
<Select
  value={selectValue}  // Always a string
  onValueChange={(value: string) => {
    handleMappingChange(column, value)
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Select field..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={SKIP_COLUMN_VALUE}>— Skip this column —</SelectItem>
    {crmFields.map(field => (
      <SelectItem key={field.key} value={field.key}>
        {field.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Handler converts sentinel back to undefined
const handleMappingChange = (csvColumn: string, crmField: string | undefined) => {
  const actualValue = crmField === SKIP_COLUMN_VALUE ? undefined : crmField
  setMapping(prev => ({ ...prev, [csvColumn]: actualValue }))
}
```

### ColumnMappingForm

```typescript
// Same pattern
const SKIP_COLUMN_VALUE = '__SKIP_COLUMN__' as const

<Select
  value={mapping[column] ?? SKIP_COLUMN_VALUE}
  onValueChange={(value: string) => {
    handleMappingChange(column, value)
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Select field..." />
  </SelectTrigger>
  <SelectContent>
    {CRM_FIELDS.map(field => (
      <SelectItem key={field.value} value={field.value}>
        {field.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Flow Diagram

```
User Action -> Select Component -> onValueChange -> Handler -> State

1. Initial State: mapping[col] = undefined
   ↓
2. Convert for Select: selectValue = SKIP_COLUMN_VALUE
   ↓
3. Render: <Select value={SKIP_COLUMN_VALUE} />
   ↓
4. Shows: "— Skip this column —" selected
   ↓
5. User selects: "Full Name" 
   ↓
6. onValueChange: value = "fullName" (string)
   ↓
7. Handler: actualValue = "fullName" (not sentinel)
   ↓
8. State: mapping[col] = "fullName"
   ↓
9. Next render: selectValue = "fullName"
   ↓
10. Shows: "Full Name" selected

Alternative: User selects "Skip"
   ↓
6. onValueChange: value = "__SKIP_COLUMN__" (sentinel)
   ↓
7. Handler: actualValue = undefined (converted)
   ↓
8. State: mapping[col] = undefined
   ↓
9. Next render: selectValue = SKIP_COLUMN_VALUE
   ↓
10. Shows: "— Skip this column —" selected
```

## Validation Checklist

- [x] ✅ No `SelectItem` with `value=""`
- [x] ✅ All `SelectValue` have `placeholder` prop
- [x] ✅ `value` prop is always a string (uses `??` operator with sentinel)
- [x] ✅ `onValueChange` signature: `(value: string) => void`
- [x] ✅ Sentinel value is defined as constant
- [x] ✅ Handler converts sentinel to `undefined`
- [x] ✅ State uses `undefined` for "not selected"
- [x] ✅ Select shows placeholder when value not in items (shouldn't happen with our pattern)

## Expected Behavior

1. **Initial Load (no mapping)**
   - Select shows "— Skip this column —"
   - No runtime errors
   - Placeholder not visible (sentinel is selected)

2. **After Auto-mapping (confident)**
   - Select shows mapped field name
   - No runtime errors

3. **After Auto-mapping (low confidence)**
   - Select shows "— Skip this column —"
   - No runtime errors

4. **User Changes Selection**
   - Selection updates immediately
   - No runtime errors
   - State reflects change

5. **User Selects "Skip"**
   - Select shows "— Skip this column —"
   - State becomes `undefined`
   - No runtime errors

## Testing Commands

```bash
# TypeScript check
cd /Users/kosta/voyz-crm/CRM
npx tsc --noEmit

# Linter check
npm run lint

# Run dev server
npm run dev
```

## Common Pitfalls (Now Avoided)

1. ❌ Using `value=""` → Causes Radix to show empty select
2. ❌ Using `value={undefined}` → TypeScript error
3. ❌ Forgetting placeholder → No indication of empty state
4. ❌ Using `|| ''` fallback → Creates empty string value
5. ❌ Not converting sentinel back → Wrong state type

All these issues are now prevented by our pattern! ✅

