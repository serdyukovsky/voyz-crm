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
import { useTranslation } from '@/lib/i18n/i18n-context'

// Sentinel value for "skip this column" - never use empty string
const SKIP_COLUMN_VALUE = '__SKIP_COLUMN__' as const

interface ParsedCsvRow {
  [key: string]: string
}

interface AutoMappingFormProps {
  csvColumns: string[]
  onMappingChange: (mapping: Record<string, string | undefined>) => void
  initialMapping?: Record<string, string | undefined>
  csvSampleData?: ParsedCsvRow[]
  selectedPipelineId?: string
}

export function AutoMappingForm({ 
  csvColumns, 
  onMappingChange,
  initialMapping = {},
  csvSampleData = [],
  selectedPipelineId,
}: AutoMappingFormProps) {
  const { t, language } = useTranslation()
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
  
  // Helper to get field display name with explicit entity prefix
  // Examples: "Deal: Title", "Contact: Full Name"
  const getFieldLabel = (field: ImportField) => {
    let label: string
    if (language === 'ru' && field.description) {
      label = field.description
    } else {
      label = field.label
    }
    
    // Always add entity prefix if field has entity property
    // This makes it explicit which entity the field belongs to
    if (field.entity) {
      const entityName = field.entity.charAt(0).toUpperCase() + field.entity.slice(1)
      return `${entityName}: ${label}`
    }
    
    return label
  }

  // Group fields by entity for visual organization
  // CRITICAL: Exclude pipelineId from mappable fields - it's passed separately, not as CSV column
  const getGroupedFields = () => {
    const grouped: { deal: ImportField[]; contact: ImportField[]; other: ImportField[] } = {
      deal: [],
      contact: [],
      other: []
    }
    
    crmFields.forEach(field => {
      // CRITICAL: pipelineId must NEVER be in mapping - it's a top-level parameter, not a CSV field
      if (field.key === 'pipelineId') {
        console.warn('[AUTO MAPPING] Excluding pipelineId from mappable fields - it should be passed separately');
        return; // Skip pipelineId
      }
      
      if (field.entity === 'deal') {
        grouped.deal.push(field)
      } else if (field.entity === 'contact') {
        grouped.contact.push(field)
      } else {
        grouped.other.push(field)
      }
    })
    
    return grouped
  }

  // Загружаем метаданные полей CRM (always combined/mixed)
  useEffect(() => {
    loadFields()
  }, [])

  // Автоматический маппинг при изменении колонок
  useEffect(() => {
    if (csvColumns.length > 0 && crmFields.length > 0) {
      performAutoMapping()
    }
  }, [csvColumns, crmFields])

  // Применяем auto-mapping при получении результатов
  useEffect(() => {
    if (autoMappings.length > 0 && Object.keys(mapping).length === 0) {
      const autoMapping: Record<string, string | undefined> = {}
      autoMappings.forEach((am) => {
        // CRITICAL: Never map pipelineId - it's a top-level parameter, not a CSV column
        if (am.suggestedField === 'pipelineId') {
          console.warn('[AUTO MAPPING] Skipping pipelineId - it should not be mapped to CSV columns');
          return;
        }
        
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
      // Always use 'deal' for API call (backend returns mixed/combined meta anyway)
      const meta = await getImportMeta('deal')
      setImportMeta(meta)
      // Combine system and custom fields for backward compatibility
      const allFields = getAllFields(meta)
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
      // Always use 'deal' for API call (backend handles combined/mixed mapping)
      const results = await autoMapColumns(csvColumns, 'deal')
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
      
      // CRITICAL: Never allow pipelineId to be mapped
      // pipelineId is a top-level parameter, NOT a CSV column mapping
      const rawValue = fromSelectValue(crmField, SKIP_COLUMN_VALUE)
      const actualValue = normalizeSelectValue(rawValue)
      if (actualValue === 'pipelineId') {
        console.warn('[MAPPING] Attempted to map pipelineId - blocking. pipelineId must be passed separately, not as CSV column mapping.');
        return;
      }
      
      setMapping((prev) => {
        // Convert sentinel value to undefined, then normalize
        // This provides runtime safety against empty strings, null, etc.
        const newMapping = { ...prev, [csvColumn]: actualValue }
        // Double-check: remove pipelineId if somehow it got in
        if (Object.values(newMapping).includes('pipelineId')) {
          console.warn('[MAPPING] Found pipelineId in mapping - removing it');
          const cleaned: Record<string, string | undefined> = {};
          Object.entries(newMapping).forEach(([key, value]) => {
            if (value !== 'pipelineId') {
              cleaned[key] = value;
            }
          });
          return cleaned;
        }
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
      return <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">{t('importExport.confidence.exact')}</Badge>
    } else if (confidence >= 0.8) {
      return <Badge variant="default" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">{t('importExport.confidence.high')}</Badge>
    } else if (confidence >= 0.6) {
      return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">{t('importExport.confidence.medium')}</Badge>
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">{t('common.loading')}</span>
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

  // Helper to check if a field is a stage field
  const isStageField = (fieldKey: string | undefined): boolean => {
    if (!fieldKey) return false
    const field = crmFields.find(f => f.key === fieldKey)
    return field?.type === 'stage'
  }

  // Helper to get stages from the selected pipeline
  // Pipeline is always selected before mapping for combined import
  const getSelectedPipelineStages = () => {
    if (!importMeta || !('pipelines' in importMeta)) return []
    if (selectedPipelineId) {
      const pipeline = importMeta.pipelines.find(p => p.id === selectedPipelineId)
      return pipeline?.stages || []
    }
    return []
  }

  // Helper to check if mapping has any stage fields
  const hasStageFieldMapped = (): boolean => {
    return Object.values(mapping).some(fieldKey => isStageField(fieldKey))
  }


  if (error) {
    return (
      <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{t('common.error')}</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFields}
              className="mt-3"
            >
              {t('common.back')}
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

  const groupedFields = getGroupedFields()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{t('importExport.mapColumns')}</h3>
          <p className="text-xs text-muted-foreground">
            {isLoadingAutoMap 
              ? t('importExport.autoMapping')
              : t('importExport.autoMappingComplete')
            }
          </p>
        </div>
        {isLoadingAutoMap && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Required mapping hint (shown once) */}
      {!Object.values(mapping).includes('title') && (
        <div className="flex items-start gap-2 p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <div>
            <p className="text-xs font-medium text-destructive">Deal: Title mapping is required</p>
            <p className="text-xs text-destructive/80 mt-1">
              {t('importExport.selectTitleColumn')}
            </p>
          </div>
        </div>
      )}

      {/* Unified Mapping Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full table-fixed">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wide w-1/2">
                CSV Column
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wide w-1/2">
                CRM Field
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wide w-12">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
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
            <tr
              key={`${column}-${index}`}
              className={cn(
                "transition-colors",
                isCurrentAutoMapped && autoMapping?.confidence === 1.0
                  ? "bg-green-500/5"
                  : isCurrentAutoMapped && autoMapping?.confidence >= 0.8
                  ? "bg-blue-500/5"
                  : "hover:bg-muted/30"
              )}
            >
              {/* CSV Column Cell */}
              <td className="px-4 py-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{column}</span>
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{t('importExport.examples')}</span>
                      {sampleValues.map((sample, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/50 text-foreground/80 border border-border/50 font-mono"
                          title={sample}
                        >
                          {sample.length > 20 ? `${sample.substring(0, 20)}...` : sample}
                        </span>
                      ))}
                    </div>
                  )}
                  {autoMapping?.suggestedField && autoMapping.confidence >= 0.6 && !isCurrentAutoMapped && (
                    <p className="text-xs text-muted-foreground">
                      Suggested: <span className="font-medium">{autoMapping.suggestedField}</span>
                    </p>
                  )}
                </div>
              </td>
              
              {/* CRM Field Cell */}
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <Select
                    value={selectValue}
                    onValueChange={(value: string) => {
                      try {
                        handleMappingChange(column, value)
                      } catch (err) {
                        console.error('Error changing mapping:', err)
                      }
                    }}
                  >
                    <SelectTrigger className={cn(
                      "h-9 bg-card border-border w-full"
                    )}>
                      <SelectValue placeholder={t('common.select')} />
                    </SelectTrigger>
                  <SelectContent className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                    {/* Sentinel value for "skip" */}
                    <SelectItem value={SKIP_COLUMN_VALUE}>{t('importExport.skipColumn')}</SelectItem>
                    
                    {/* Show grouped fields: DEAL, CONTACT, OTHER */}
                    <>
                      {/* DEAL Fields Group */}
                      {groupedFields.deal.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-primary/5 border-b border-primary/20 sticky top-0">
                            DEAL Fields
                          </div>
                          {groupedFields.deal.map((field, fieldIdx) => (
                            <SelectItem key={`deal-${field.key}-${fieldIdx}`} value={field.key}>
                              <div className="flex items-center gap-2 w-full">
                                <span className="truncate">{getFieldLabel(field)}</span>
                                {field.required && (
                                  <Badge variant="outline" className="text-xs">{t('importExport.required')}</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {/* CONTACT Fields Group */}
                      {groupedFields.contact.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-primary/5 border-b border-primary/20 sticky top-0">
                            CONTACT Fields
                          </div>
                          {groupedFields.contact.map((field, fieldIdx) => (
                            <SelectItem key={`contact-${field.key}-${fieldIdx}`} value={field.key}>
                              <div className="flex items-center gap-2 w-full">
                                <span className="truncate">{getFieldLabel(field)}</span>
                                {field.required && (
                                  <Badge variant="outline" className="text-xs">{t('importExport.required')}</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {/* Other Fields Group (if any) */}
                      {groupedFields.other.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-b border-border sticky top-0">
                            Other Fields
                          </div>
                          {groupedFields.other.map((field, fieldIdx) => (
                            <SelectItem key={`other-${field.key}-${fieldIdx}`} value={field.key}>
                              <div className="flex items-center gap-2 w-full">
                                <span className="truncate">{getFieldLabel(field)}</span>
                                {field.required && (
                                  <Badge variant="outline" className="text-xs">{t('importExport.required')}</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {/* Fallback if no fields available */}
                      {crmFields.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          {t('importExport.noFieldsAvailable')}
                        </div>
                      )}
                    </>
                  </SelectContent>
                </Select>
                </div>
              </td>
              
              {/* Actions Cell */}
              <td className="px-4 py-3">
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateField(column)}
                    disabled={isLoading}
                    className="h-8 w-8 p-0"
                    title={t('importExport.createField')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          )
        })}
          </tbody>
        </table>
      </div>

      {crmFields.length > 0 && (
        <div className="p-3 border border-border/50 bg-muted/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Fields marked as "Required" must be mapped for the import to succeed.
            Auto-mapped fields with high confidence are pre-selected. Click the <Plus className="inline h-3 w-3 mx-0.5" /> button to create a new custom field.
            {hasStageFieldMapped() && (
              <> When mapping stage fields, CSV values will be matched to stage names in the selected pipeline.</>
            )}
          </p>
        </div>
      )}
      
      {/* Create Field Dialog */}
      <CreateFieldDialog
        open={isCreateFieldDialogOpen}
        onOpenChange={setIsCreateFieldDialogOpen}
        entityType="deal"
        suggestedName={createFieldForColumn || ''}
        onFieldCreated={handleFieldCreated}
      />
    </div>
  )
}

