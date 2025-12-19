# Deal Stage Mapping Support

## Summary
Added support for mapping CSV columns to deal stages with automatic resolution by stage name within a selected pipeline.

## Changes

### Backend

#### 1. `csv-import.service.ts`
- **Updated `importDeals` method signature**: Now requires `pipelineId` parameter for stage resolution
- **Added `loadPipelineStagesMap` helper method**: Loads all stages for a given pipeline into a Map (stageName -> stageId)
- **Enhanced `mapDealRow` method**: 
  - Accepts `pipelineId` and `stagesMap` parameters
  - Resolves stage names to stage IDs (case-insensitive matching)
  - Supports both stage names and stage IDs from CSV
  - Provides detailed error messages with available stages when stage not found
- **Updated metadata**: `stageId` field description now indicates it accepts stage name and will be auto-resolved

#### 2. `import-export.controller.ts`
- **Updated `/api/import/deals` endpoint**: 
  - Added `pipelineId` parameter to request body
  - Removed `pipelineId` from mapping validation (now passed separately)
  - Added validation for `pipelineId` parameter

### Frontend

#### 1. `lib/api/import.ts`
- **Updated `importDeals` function**: Now requires `pipelineId` parameter
- **Added validation**: Throws error if `pipelineId` is not provided

#### 2. `app/import-export/page.tsx`
- **Added state**: `selectedPipelineId` to track selected pipeline
- **Updated `handleDryRun`**: Validates that pipeline is selected before proceeding
- **Updated `handleConfirmImport`**: Validates that pipeline is selected before import
- **Updated `handleFileUpload`**: Resets `selectedPipelineId` on new file upload
- **Updated `handleReset`**: Resets `selectedPipelineId` on reset
- **Added UI**: Integrated `PipelineSelector` component in mapping step for deals
- **Updated validation**: Disables dry-run button if pipeline not selected for deals

#### 3. `components/crm/pipeline-selector.tsx` (New)
- **Purpose**: Allows users to select a pipeline before importing deals
- **Features**:
  - Fetches all pipelines on mount
  - Auto-selects first pipeline if none selected
  - Displays available stages for selected pipeline
  - Shows loading/error states
  - Provides helpful description about stage name matching
  - Visual stage chips with sorted display (by position)

## Data Flow

1. **User uploads CSV** → Proceeds to mapping step
2. **For deal imports**: User must select a pipeline first
3. **User maps CSV columns** → Maps stage column to `stageId` field
4. **Dry-run/Import**: 
   - Frontend sends `pipelineId` and mapping to backend
   - Backend loads stages for selected pipeline
   - For each row, backend resolves stage name to stage ID
   - If stage not found, error is returned with available stages list

## Stage Resolution Logic

```typescript
// Backend resolution (case-insensitive)
1. Check if value is already a valid stage ID → use it
2. Otherwise, search by stage name (case-insensitive)
3. If found → use resolved stage ID
4. If not found → error with list of available stages
```

## CSV Example

```csv
number,title,amount,stage,assignedTo
DEL-001,New Deal,50000,Qualification,John Doe
DEL-002,Hot Lead,75000,proposal,Jane Smith
DEL-003,Closed,100000,Won,John Doe
```

In this example:
- "Qualification", "proposal", "Won" are stage names
- They will be matched (case-insensitive) to stages in the selected pipeline
- If a stage name doesn't match, the import will fail for that row with a clear error

## UI Behavior

### Before Changes
- No pipeline selection required
- Stage mapping was unclear
- Stage resolution not supported

### After Changes
- Pipeline selection required for deal imports
- Clear UI showing available stages
- Stage names from CSV are auto-resolved to stage IDs
- Helpful error messages if stage not found
- Dry-run validates stage resolution before actual import

## Validation

### Frontend
- Pipeline must be selected before dry-run or import
- Dry-run button disabled if no pipeline selected

### Backend
- Validates `pipelineId` exists
- Validates `stageId` (stage name) is provided in CSV
- Validates stage exists in selected pipeline
- Returns error with available stages if not found

## Benefits

1. **User-friendly**: Users can use stage names instead of IDs in CSV
2. **Safe**: Dry-run validates all stage names before import
3. **Clear errors**: If stage not found, error shows available stages
4. **Case-insensitive**: "Qualification" = "qualification" = "QUALIFICATION"
5. **Flexible**: Supports both stage names and stage IDs in CSV

## Testing Checklist

- [ ] Upload deal CSV with stage names
- [ ] Select pipeline in UI
- [ ] Verify available stages display
- [ ] Run dry-run with valid stage names
- [ ] Run dry-run with invalid stage name → check error message
- [ ] Run dry-run with mixed case stage names
- [ ] Confirm import with valid data
- [ ] Verify stages resolved correctly in database

