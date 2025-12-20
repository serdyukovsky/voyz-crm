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
  entityType: 'contact' | 'deal'
  onMappingChange: (mapping: Record<string, string | undefined>) => void
  initialMapping?: Record<string, string | undefined>
  csvSampleData?: ParsedCsvRow[]
  selectedPipelineId?: string
  onValidationChange?: (isValid: boolean, missingFields: string[]) => void
}

export function AutoMappingForm({ 
  csvColumns, 
  entityType,
  onMappingChange,
  initialMapping = {},
  csvSampleData = [],
  selectedPipelineId,
  onValidationChange,
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
  
  // Helper to get field display name (description for Russian, label otherwise)
  // Adds entity prefix if field has entity property
  const getFieldLabel = (field: ImportField) => {
    let label: string
    if (language === 'ru' && field.description) {
      label = field.description
    } else {
      label = field.label
    }
    
    // Add entity prefix if field has entity property
    if (field.entity) {
      return `${field.entity.toUpperCase()}: ${label}`
    }
    
    return label
  }

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

  // Notify parent about validation state changes
  useEffect(() => {
    if (onValidationChange && crmFields.length > 0) {
      const missingFields = getMissingRequiredFields()
      const isValid = missingFields.length === 0
      const missingFieldLabels = missingFields.map(f => getFieldLabel(f))
      onValidationChange(isValid, missingFieldLabels)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping, crmFields])

  const loadFields = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const meta = await getImportMeta(entityType)
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
  // For deals, pipeline is always selected before mapping, so we can safely access stages
  const getSelectedPipelineStages = () => {
    if (!importMeta || !('pipelines' in importMeta)) return []
    // For deals, selectedPipelineId is guaranteed to be set (validated before mapping step)
    if (entityType === 'deal' && selectedPipelineId) {
      const pipeline = importMeta.pipelines.find(p => p.id === selectedPipelineId)
      return pipeline?.stages || []
    }
    // For contacts, no pipeline needed
    return []
  }

  // Helper to check if mapping has any stage fields
  const hasStageFieldMapped = (): boolean => {
    return Object.values(mapping).some(fieldKey => isStageField(fieldKey))
  }

  // Helper to get required fields
  const getRequiredFields = (): ImportField[] => {
    return crmFields.filter(field => field.required)
  }

  // Helper to check which required fields are not mapped
  // stageId НЕ валидируется на этапе mapping для deals - стадии резолвятся автоматически
  const getMissingRequiredFields = (): ImportField[] => {
    const requiredFields = getRequiredFields()
    const mappedFieldKeys = new Set(Object.values(mapping).filter(v => v !== undefined))
    
    // Исключаем stageId из валидации для deals - стадии резолвятся автоматически
    return requiredFields.filter(field => {
      // Для deals, stageId не валидируется - стадии резолвятся автоматически по имени
      if (entityType === 'deal' && field.key === 'stageId') {
        return false
      }
      return !mappedFieldKeys.has(field.key)
    })
  }

  // Helper to check if all required fields are mapped
  const isValidMapping = (): boolean => {
    return getMissingRequiredFields().length === 0
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
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{t('importExport.examples')}</span>
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
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* DEBUG: Show if data is loading */}
                    {isLoading && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        ⏳ Loading fields...
                      </div>
                    )}
                    {!isLoading && !importMeta && (
                      <div className="px-2 py-1.5 text-xs text-destructive">
                        ❌ Failed to load import meta!
                      </div>
                    )}
                    {!isLoading && importMeta && (!importMeta.systemFields || importMeta.systemFields.length === 0) && (
                      <div className="px-2 py-1.5 text-xs text-destructive">
                        ❌ No system fields found! systemFields: {JSON.stringify(importMeta.systemFields)}
                      </div>
                    )}
                    
                    {/* Sentinel value for "skip" - never use empty string "" */}
                    <SelectItem value={SKIP_COLUMN_VALUE}>{t('importExport.skipColumn')}</SelectItem>
                    
                    {/* If current mapping is a stage field, show stages from selected pipeline */}
                    {isStageField(normalizedMapping) ? (
                      <>
                        {!selectedPipelineId ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md mx-2 my-1">
                            <span className="font-medium">ℹ️ {t('importExport.selectPipelineToSeeStages')}</span>
                          </div>
                        ) : getSelectedPipelineStages().length === 0 ? (
                          <div className="px-3 py-2 text-xs text-yellow-600 bg-yellow-50 rounded-md mx-2 my-1">
                            <span className="font-medium">ℹ️ {t('importExport.noStagesInPipeline')}</span>
                          </div>
                        ) : (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-primary/5 border-b border-primary/20">
                              📍 {t('importExport.mapCsvValueToStage')}
                            </div>
                            {getSelectedPipelineStages().map((stage) => (
                              <SelectItem key={stage.id} value={stage.name}>
                                <div className="flex items-center gap-2">
                                  {stage.color && (
                                    <div 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: stage.color }}
                                    />
                                  )}
                                  <span>{stage.name}</span>
                                  {stage.isDefault && (
                                    <Badge variant="outline" className="text-xs">Default</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </>
                    ) : (
                      /* Show regular field mapping - ALL fields from meta without entity filtering */
                      <>
                        {/* Show ALL fields from crmFields (which includes all fields from meta) */}
                        {crmFields.length > 0 && (
                          <>
                            {crmFields.map((field, fieldIdx) => (
                              <SelectItem key={`${field.entity || 'default'}-${field.key}-${fieldIdx}`} value={field.key}>
                                <div className="flex items-center gap-2">
                                  <span>{getFieldLabel(field)}</span>
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
                    )}
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
                  title={t('importExport.createField')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Validation error if required fields are not mapped */}
      {!isValidMapping() && (
        <div className="flex items-start gap-2 p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Required Fields Missing</p>
            <p className="text-xs text-destructive/80 mt-1">
              The following required fields must be mapped before you can proceed:
            </p>
            <ul className="mt-2 space-y-1">
              {getMissingRequiredFields().map((field, fieldIdx) => (
                <li key={`${field.key}-${fieldIdx}`} className="text-xs text-destructive/80 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-destructive/60" />
                  <strong>{getFieldLabel(field)}</strong>
                  {field.description && field.description !== getFieldLabel(field) && (
                    <span className="text-destructive/60">({field.description})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}


      {crmFields.length > 0 && (
        <div className="p-3 border border-border/50 bg-muted/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Fields marked as "Required" must be mapped for the import to succeed.
            Auto-mapped fields with high confidence are pre-selected. Click the <Plus className="inline h-3 w-3 mx-0.5" /> button to create a new custom field.
            {entityType === 'deal' && hasStageFieldMapped() && (
              <> When mapping stage fields, CSV values will be matched to stage names in the selected pipeline.</>
            )}
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

