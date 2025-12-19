'use client'

import { useState } from 'react'
import { ArrowRight, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { normalizeSelectValue, toSelectValue, fromSelectValue } from '@/lib/utils/mapping'

// Sentinel value for "skip this column" - never use empty string
const SKIP_COLUMN_VALUE = '__SKIP_COLUMN__' as const

interface ColumnMappingFormProps {
  importedColumns?: string[]
  columns?: string[] // Альтернативное имя для совместимости
  onImport?: (mapping: Record<string, string | undefined>) => void
}

const CRM_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'phone', label: 'Phone' },
  { value: 'deal_amount', label: 'Deal Amount' },
  { value: 'stage', label: 'Stage' },
  { value: 'assigned_to', label: 'Assigned To' },
  { value: 'created_at', label: 'Created Date' },
  { value: 'notes', label: 'Notes' },
  { value: SKIP_COLUMN_VALUE, label: '— Skip this column —' },
]

export function ColumnMappingForm({ 
  importedColumns, 
  columns,
  onImport 
}: ColumnMappingFormProps) {
  // Поддержка обоих вариантов props для совместимости
  const columnsToUse = importedColumns || columns || []
  
  const [mapping, setMapping] = useState<Record<string, string | undefined>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleMappingChange = (importedCol: string, crmField: string | undefined) => {
    try {
      // Convert sentinel value to undefined, then normalize
      // This provides runtime safety against empty strings, null, etc.
      const rawValue = fromSelectValue(crmField, SKIP_COLUMN_VALUE)
      const actualValue = normalizeSelectValue(rawValue)
      setMapping((prev) => ({ ...prev, [importedCol]: actualValue }))
    } catch (err) {
      console.error('Error in handleMappingChange:', err)
    }
  }

  const validateMapping = () => {
    const errors: string[] = []
    // Filter out undefined values (skipped columns)
    const mappedFields = Object.values(mapping).filter(v => v !== undefined)
    
    if (!mappedFields.includes('name')) {
      errors.push('Name field is required')
    }
    if (!mappedFields.includes('email')) {
      errors.push('Email field is required')
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleImport = () => {
    if (validateMapping() && onImport) {
      onImport(mapping)
    }
  }

  // Если нет колонок, показываем сообщение
  if (!columnsToUse || columnsToUse.length === 0) {
    return (
      <div className="p-4 border border-border rounded-lg">
        <p className="text-sm text-muted-foreground">No columns to map</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Map Columns</h3>
        <p className="text-xs text-muted-foreground">
          Match your imported columns to CRM fields
        </p>
      </div>

      <div className="space-y-3">
        {columnsToUse.map((column, index) => (
          <div
            key={`${column}-${index}`}
            className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/10"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{column}</p>
            </div>
            
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            
            <div className="flex-1">
              <Select
                value={toSelectValue(normalizeSelectValue(mapping[column]), SKIP_COLUMN_VALUE)}
                onValueChange={(value: string) => {
                  // onValueChange always returns a string (never undefined)
                  // We convert sentinel value to undefined in the handler
                  try {
                    handleMappingChange(column, value)
                  } catch (err) {
                    console.error('Error in Select onValueChange:', err)
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-card border-border">
                  {/* Placeholder shows when value doesn't match any Item */}
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  {/* Sentinel value always first - never use empty string "" */}
                  {CRM_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {validationErrors.length > 0 && (
        <div className="flex items-start gap-2 p-3 border border-red-500/20 bg-red-500/5 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Validation Errors:</p>
            <ul className="text-xs text-red-600/80 dark:text-red-400/80 space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {onImport && (
        <Button
          onClick={handleImport}
          className="w-full bg-[#6B8AFF] hover:bg-[#5A7AEF] text-white"
        >
          Import Data
        </Button>
      )}
    </div>
  )
}
