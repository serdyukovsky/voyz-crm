'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  getImportMeta, 
  autoMapColumns, 
  getAllFields,
  type ImportField, 
  type ImportMeta,
  type AutoMappingResult 
} from '@/lib/api/import'
import { cn } from '@/lib/utils'
import { normalizeSelectValue, toSelectValue, fromSelectValue } from '@/lib/utils/mapping'
import { ErrorBoundary } from './error-boundary'
import { CreateFieldDialog } from './create-field-dialog'

// Sentinel value for "skip this column" - never use empty string
const SKIP_COLUMN_VALUE = '__SKIP_COLUMN__' as const

interface ParsedCsvRow {
  [key: string]: string
}

interface AutoMappingFormProps {
  csvColumns: string[]
  entityType: 'contact' | 'deal'
  onMappingChange: (mapping: Record<string, string | undefined>) => void
  initialMapping?: Record<string, string | undefined>
  csvSampleData?: ParsedCsvRow[]
}

export function AutoMappingForm({ 
  csvColumns, 
  entityType,
  onMappingChange,
  initialMapping = {},
  csvSampleData = [],
}: AutoMappingFormProps) {
  const [importMeta, setImportMeta] = useState<ImportMeta | null>(null)
  const [crmFields, setCrmFields] = useState<ImportField[]>([])
  const [autoMappings, setAutoMappings] = useState<AutoMappingResult[]>([])
  
  // Normalize initial mapping for runtime safety (handles empty strings, null from external sources)
  const normalizedInitialMapping = Object.entries(initialMapping).reduce<Record<string, string | undefined>>(
    (acc, [key, value]) => {
      acc[key] = normalizeSelectValue(value)
      return acc
    },
    {}
  )
  
  const [mapping, setMapping] = useState<Record<string, string | undefined>>(normalizedInitialMapping)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAutoMap, setIsLoadingAutoMap] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Create field dialog state
  const [isCreateFieldDialogOpen, setIsCreateFieldDialogOpen] = useState(false)
  const [createFieldForColumn, setCreateFieldForColumn] = useState<string | null>(null)

  // Загружаем метаданные полей CRM
  useEffect(() => {
    loadFields()
  }, [entityType])

  // Автоматический маппинг при изменении колонок
  useEffect(() => {
    if (csvColumns.length > 0 && crmFields.length > 0) {
      performAutoMapping()
    }
  }, [csvColumns, crmFields, entityType])

  // Применяем auto-mapping при получении результатов
  useEffect(() => {
    if (autoMappings.length > 0 && Object.keys(mapping).length === 0) {
      const autoMapping: Record<string, string | undefined> = {}
      autoMappings.forEach((am) => {
        // Only set mapping if suggestedField exists and confidence is sufficient
        // Normalize for runtime safety (API might return empty strings or null)
        if (am.suggestedField && am.confidence >= 0.6) {
          autoMapping[am.columnName] = normalizeSelectValue(am.suggestedField)
        } else {
          autoMapping[am.columnName] = undefined
        }
      })
      setMapping(autoMapping)
      onMappingChange(autoMapping)
    }
  }, [autoMappings])

  // Уведомляем родителя об изменениях маппинга
  useEffect(() => {
    onMappingChange(mapping)
  }, [mapping])

  const loadFields = async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log('Loading import meta for entity type:', entityType)
      const meta = await getImportMeta(entityType)
      console.log('Import meta loaded:', meta)
      console.log('meta.systemFields:', meta.systemFields)
      console.log('meta.customFields:', meta.customFields)
      setImportMeta(meta)
      // Combine system and custom fields for backward compatibility
      const allFields = getAllFields(meta)
      console.log('All fields after getAllFields:', allFields)
      console.log('All fields count:', allFields.length)
      setCrmFields(allFields)
    } catch (err) {
      console.error('Error loading import meta:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load fields'
      setError(errorMessage)
      // Показываем более детальную ошибку
      if (err instanceof Error && err.message.includes('fetch')) {
        setError('Network error: Failed to fetch. Please check your connection and API URL.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const performAutoMapping = async () => {
    if (!csvColumns || csvColumns.length === 0) {
      return
    }

    setIsLoadingAutoMap(true)
    try {
      const results = await autoMapColumns(csvColumns, entityType)
      if (results && Array.isArray(results)) {
        setAutoMappings(results)
      }
    } catch (err) {
      console.error('Auto-mapping failed:', err)
      // Не показываем ошибку пользователю, просто не применяем auto-mapping
      setAutoMappings([])
    } finally {
      setIsLoadingAutoMap(false)
    }
  }

  const handleMappingChange = (csvColumn: string, crmField: string | undefined) => {
    try {
      if (!csvColumn || typeof csvColumn !== 'string') {
        console.warn('Invalid csvColumn:', csvColumn)
        return
      }
      setMapping((prev) => {
        // Convert sentinel value to undefined, then normalize
        // This provides runtime safety against empty strings, null, etc.
        const rawValue = fromSelectValue(crmField, SKIP_COLUMN_VALUE)
        const actualValue = normalizeSelectValue(rawValue)
        const newMapping = { ...prev, [csvColumn]: actualValue }
        return newMapping
      })
    } catch (err) {
      console.error('Error in handleMappingChange:', err)
    }
  }

  const handleCreateField = (columnName: string) => {
    setCreateFieldForColumn(columnName)
    setIsCreateFieldDialogOpen(true)
  }

  const handleFieldCreated = async (fieldKey: string) => {
    // Reload fields to get the newly created one
    await loadFields()
    
    // Auto-map the column to the new field
    if (createFieldForColumn) {
      handleMappingChange(createFieldForColumn, fieldKey)
    }
    setCreateFieldForColumn(null)
  }

  const getAutoMapping = (columnName: string): AutoMappingResult | undefined => {
    return autoMappings.find((am) => am.columnName === columnName)
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 1.0) {
      return <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Exact</Badge>
    } else if (confidence >= 0.8) {
      return <Badge variant="default" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">High</Badge>
    } else if (confidence >= 0.6) {
      return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">Medium</Badge>
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading fields...</span>
      </div>
    )
  }

  // Helper to get sample values for a column
  const getSampleValues = (columnName: string): string[] => {
    if (!csvSampleData || csvSampleData.length === 0) {
      return []
    }
    
    const samples: string[] = []
    for (const row of csvSampleData) {
      const value = row[columnName]
      if (value && value.trim() !== '' && !samples.includes(value)) {
        samples.push(value)
        if (samples.length >= 2) break
      }
    }
    return samples
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Error loading fields</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFields}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!csvColumns || csvColumns.length === 0) {
    return (
      <div className="p-4 border border-border rounded-lg">
        <p className="text-sm text-muted-foreground">No columns to map</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Map Columns to CRM Fields</h3>
          <p className="text-xs text-muted-foreground">
            {isLoadingAutoMap 
              ? 'Auto-mapping columns...' 
              : 'Match your CSV columns to CRM fields. Auto-mapping suggestions are shown with confidence badges.'
            }
          </p>
        </div>
        {isLoadingAutoMap && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="space-y-3">
        {csvColumns.map((column, index) => {
          if (!column || typeof column !== 'string') {
            return null
          }

          const autoMapping = getAutoMapping(column)
          const currentMapping = mapping[column]
          
          // Normalize mapping value for runtime safety (handles empty strings, null, etc.)
          // Then convert to Select-compatible value using sentinel
          // Radix Select requires a string value (never undefined or empty string)
          const normalizedMapping = normalizeSelectValue(currentMapping)
          const selectValue = toSelectValue(normalizedMapping, SKIP_COLUMN_VALUE)
          
          const isAutoMapped = autoMapping?.suggestedField && autoMapping.confidence >= 0.6
          const isCurrentAutoMapped = normalizedMapping === autoMapping?.suggestedField
          
          // Get sample values for this column
          const sampleValues = getSampleValues(column)

          return (
            <div
              key={`${column}-${index}`}
              className={cn(
                "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                isCurrentAutoMapped && autoMapping?.confidence === 1.0
                  ? "border-green-500/20 bg-green-500/5"
                  : isCurrentAutoMapped && autoMapping?.confidence >= 0.8
                  ? "border-blue-500/20 bg-blue-500/5"
                  : "border-border bg-muted/10"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{column}</p>
                  {autoMapping && autoMapping.confidence >= 0.6 && (
                    <div className="flex items-center gap-1">
                      {getConfidenceBadge(autoMapping.confidence)}
                      {isCurrentAutoMapped && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  )}
                </div>
                {/* Sample values from CSV */}
                {sampleValues.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Examples:</span>
                    {sampleValues.map((sample, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-muted/50 text-foreground/80 border border-border/50 font-mono"
                        title={sample}
                      >
                        {sample.length > 25 ? `${sample.substring(0, 25)}...` : sample}
                      </span>
                    ))}
                  </div>
                )}
                {autoMapping?.suggestedField && autoMapping.confidence >= 0.6 && !isCurrentAutoMapped && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested: <span className="font-medium">{autoMapping.suggestedField}</span>
                  </p>
                )}
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <Select
                  value={selectValue}
                  onValueChange={(value: string) => {
                    // onValueChange always returns a string (never undefined)
                    // We convert sentinel value to undefined in the handler
                    try {
                      handleMappingChange(column, value)
                    } catch (err) {
                      console.error('Error changing mapping:', err)
                    }
                  }}
                >
                  <SelectTrigger className="h-9 bg-card border-border">
                    {/* Placeholder shows when value doesn't match any Item */}
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Sentinel value for "skip" - never use empty string "" */}
                    <SelectItem value={SKIP_COLUMN_VALUE}>— Skip this column —</SelectItem>
                    
                    {/* Group fields by category if metadata is available */}
                    {importMeta && 'systemFields' in importMeta && importMeta.systemFields.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">System Fields</div>
                        {importMeta.systemFields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            <div className="flex items-center gap-2">
                              <span>{field.label}</span>
                              {field.required && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    
                    {importMeta && 'customFields' in importMeta && importMeta.customFields.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Custom Fields</div>
                        {importMeta.customFields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            <div className="flex items-center gap-2">
                              <span>{field.label}</span>
                              {field.required && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    
                    {/* Fallback for legacy structure without groups */}
                    {!importMeta && crmFields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        <div className="flex items-center gap-2">
                          <span>{field.label}</span>
                          {field.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Create New Field Button */}
              <div className="flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateField(column)}
                  disabled={isLoading}
                  className="h-9"
                  title="Create new custom field"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {crmFields.length > 0 && (
        <div className="p-3 border border-border/50 bg-muted/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Fields marked as "Required" must be mapped for the import to succeed.
            Auto-mapped fields with high confidence are pre-selected. Click the <Plus className="inline h-3 w-3 mx-0.5" /> button to create a new custom field.
          </p>
        </div>
      )}
      
      {/* Create Field Dialog */}
      <CreateFieldDialog
        open={isCreateFieldDialogOpen}
        onOpenChange={setIsCreateFieldDialogOpen}
        entityType={entityType}
        suggestedName={createFieldForColumn || ''}
        onFieldCreated={handleFieldCreated}
      />
    </div>
  )
}

