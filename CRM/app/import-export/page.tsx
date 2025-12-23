"use client"

import { useState, useEffect } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { ImportUploader } from "@/components/crm/import-uploader"
import { ImportPreviewTable } from "@/components/crm/import-preview-table"
import { AutoMappingForm } from "@/components/crm/auto-mapping-form"
import { PipelineSelector } from "@/components/crm/pipeline-selector"
import { AssignedToSelector } from "@/components/crm/assigned-to-selector"
import { DryRunSummary } from "@/components/crm/dry-run-summary"
import { ImportResult } from "@/components/crm/import-result"
import { ExportPanel } from "@/components/crm/export-panel"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { importDeals, type ImportResult as ImportResultType } from "@/lib/api/import"
import { type ParsedCsvRow } from "@/lib/utils/csv-parser"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { ErrorBoundary } from "@/components/crm/error-boundary"
import { useTranslation } from "@/lib/i18n/i18n-context"
import { getPipelines, type Pipeline } from "@/lib/api/pipelines"

type ImportStep = 'upload' | 'preview' | 'mapping' | 'dry-run' | 'result'

function ImportExportContent() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"import" | "export">("import")
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
  
  // File & Data
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<ParsedCsvRow[]>([])
  
  // Mapping (undefined means "not selected", not empty string)
  const [mapping, setMapping] = useState<Record<string, string | undefined>>({})
  
  // Pipeline для combined import (обязательно для deals, которые всегда включены)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  
  // Default assigned user для combined import (опционально, для "apply to all")
  const [defaultAssignedToId, setDefaultAssignedToId] = useState<string | undefined>(undefined)
  const [applyAssignedToAll, setApplyAssignedToAll] = useState(false)
  
  // Dry-run
  const [dryRunResult, setDryRunResult] = useState<ImportResultType | null>(null)
  const [isDryRunLoading, setIsDryRunLoading] = useState(false)
  
  // Import
  const [importResult, setImportResult] = useState<ImportResultType | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  
  // Error
  const [error, setError] = useState<string | null>(null)
  
  const { showSuccess, showError } = useToastNotification()

  // Загрузка pipelines для combined import (always needed for deals)
  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const data = await getPipelines()
        setPipelines(data)
      } catch (err) {
        console.error('Failed to load pipelines:', err)
      }
    }
    loadPipelines()
  }, [])

  // Обработка глобальных ошибок
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)
      setError(event.error?.message || 'An unexpected error occurred')
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      setError(event.reason?.message || 'An unexpected error occurred')
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const handleFileUpload = (file: File | null, headers: string[], rows: ParsedCsvRow[]) => {
    try {
      setUploadedFile(file)
      setCsvHeaders(headers)
      setCsvRows(rows)
      setMapping({})
      setSelectedPipelineId(undefined)
      setDefaultAssignedToId(undefined)
      setApplyAssignedToAll(false)
      setDryRunResult(null)
      setImportResult(null)
      setError(null)
      
      if (file && headers && headers.length > 0 && rows && rows.length > 0) {
        setCurrentStep('preview')
      } else {
        setCurrentStep('upload')
      }
    } catch (err) {
      console.error('Error in handleFileUpload:', err)
      setError(err instanceof Error ? err.message : 'Failed to process file upload')
      setCurrentStep('upload')
    }
  }

  const handleMappingChange = (newMapping: Record<string, string | undefined>) => {
    setMapping(newMapping)
  }

  const handleContinueToMapping = () => {
    // Разрешаем переход к mapping даже без pipeline
    // Pipeline можно выбрать на экране mapping
    setCurrentStep('mapping')
  }

  const handleDryRun = async () => {
    if (!uploadedFile) return

    // Validation: Check all required fields before Dry Run
    // Backend validation is source of truth - frontend mirrors backend rules
    // Only required field for deal import: title
    const errors: string[] = []

    // 1. Pipeline is required
    if (!selectedPipelineId) {
      errors.push('Pipeline is required')
    }

    // 2. Deal title is required (mapping must include 'title')
    // This is the ONLY required field for deal import
    const mappedFields = Object.values(mapping).filter(v => v !== undefined)
    if (!mappedFields.includes('title')) {
      errors.push('Deal: Title mapping is required')
    }
    
    // Contact fields are OPTIONAL - no validation needed
    // Deal import can continue without contact information

    if (errors.length > 0) {
      const errorMessage = errors.join('. ')
      setError(errorMessage)
      showError('Validation failed', errorMessage)
      return
    }

    setIsDryRunLoading(true)
    setError(null)

    try {
      // Combined import: always use deals API which handles both contacts and deals
      // CRITICAL: For dry-run, use only first 20 rows (previewRows)
      // csvRows contains ALL rows, but dry-run should only process preview
      const previewRows = csvRows.slice(0, 20) // Create new array, don't mutate csvRows
      console.log('[IMPORT] Dry-run: using previewRows (first 20 of', csvRows.length, 'total rows)')
      
      const result = await importDeals(
        previewRows, // Only first 20 rows for dry-run preview
        mapping, 
        selectedPipelineId!, 
        true, // dryRun
        applyAssignedToAll ? defaultAssignedToId : undefined
      )

      setDryRunResult(result)
      setCurrentStep('dry-run')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform dry-run'
      setError(errorMessage)
      showError('Dry-run failed', errorMessage)
    } finally {
      setIsDryRunLoading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!uploadedFile || !dryRunResult) return

    // No validation needed here - validation was already done before Dry Run
    // If we reached this point, all validations passed

    setIsImporting(true)
    setError(null)

    try {
      // Combined import: always use deals API which handles both contacts and deals
      // CRITICAL: For actual import, use ALL rows (csvRows contains all parsed rows)
      // csvRows is allRows - contains all CSV rows without any limitations
      console.log('[IMPORT] Actual import: using all rows (', csvRows.length, 'total rows)')
      
      const result = await importDeals(
        csvRows, // ALL rows for actual import (no limitations)
        mapping, 
        selectedPipelineId!, 
        false, // dryRun = false (actual import)
        applyAssignedToAll ? defaultAssignedToId : undefined
      )

      setImportResult(result)
      setCurrentStep('result')
      
      // CRITICAL: Check if any records were actually created/updated
      const totalImported = result.summary.created + result.summary.updated
      if (totalImported === 0) {
        console.warn('[IMPORT] No records were imported:', {
          created: result.summary.created,
          updated: result.summary.updated,
          failed: result.summary.failed,
          skipped: result.summary.skipped,
          total: result.summary.total,
          errors: result.errors?.length || 0,
          globalErrors: result.globalErrors?.length || 0,
        })
        showError(
          'Import completed with warnings',
          `No records were imported. Created: ${result.summary.created}, Updated: ${result.summary.updated}, Failed: ${result.summary.failed}, Skipped: ${result.summary.skipped}. Check errors for details.`
        )
      } else {
        showSuccess(
          'Import completed',
          `${totalImported} records imported successfully (${result.summary.created} created, ${result.summary.updated} updated)`
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import'
      setError(errorMessage)
      showError('Import failed', errorMessage)
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = () => {
    setUploadedFile(null)
    setCsvHeaders([])
    setCsvRows([])
    setMapping({})
    setSelectedPipelineId(undefined)
    setDefaultAssignedToId(undefined)
    setApplyAssignedToAll(false)
    setDryRunResult(null)
    setImportResult(null)
    setError(null)
    setCurrentStep('upload')
  }

  const hasAssignedToMapping = () => {
    // Проверяем есть ли маппинг для assignedToId
    return Object.values(mapping).includes('assignedToId')
  }
  
  // Validation: Check if required mappings are present
  const getMappingValidationErrors = () => {
    const errors: string[] = []
    const mappedFields = Object.values(mapping).filter(v => v !== undefined)
    
    // Deal title is REQUIRED
    if (!mappedFields.includes('title')) {
      errors.push('Deal: Title mapping is required')
    }
    
    return errors
  }
  
  const isDryRunDisabled = () => {
    // Disable if validation errors exist or pipeline not selected
    return getMappingValidationErrors().length > 0 || !selectedPipelineId || isDryRunLoading
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header with tabs */}
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-foreground mb-4">Import/Export</h1>
          <div className="flex gap-2 border-b border-border/50">
            <button
              onClick={() => {
                setActiveTab("import")
                handleReset()
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "import"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Import
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "export"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Export
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "import" ? (
          <div className="space-y-6">
            {/* Step Indicator */}
            {currentStep !== 'upload' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={currentStep === 'upload' ? 'text-foreground font-medium' : ''}>
                  {t('importExport.uploadFile')}
                </span>
                <span>→</span>
                <span className={currentStep === 'preview' ? 'text-foreground font-medium' : ''}>
                  {t('importExport.preview')}
                </span>
                <span>→</span>
                <span className={currentStep === 'mapping' ? 'text-foreground font-medium' : ''}>
                  {t('importExport.mapping')}
                </span>
                <span>→</span>
                <span className={currentStep === 'dry-run' ? 'text-foreground font-medium' : ''}>
                  {t('importExport.dryRun')}
                </span>
                <span>→</span>
                <span className={currentStep === 'result' ? 'text-foreground font-medium' : ''}>
                  {t('importExport.result')}
                </span>
              </div>
            )}


            {/* Step 1: Upload */}
            {currentStep === 'upload' && (
              <ImportUploader
                onFileUpload={handleFileUpload}
                disabled={isImporting || isDryRunLoading}
              />
            )}

            {/* Step 2: Preview */}
            {currentStep === 'preview' && csvHeaders.length > 0 && csvRows.length > 0 && (
              <div className="space-y-4">
                <ImportPreviewTable
                  headers={csvHeaders}
                  rows={csvRows.slice(0, 20)}
                  fileName={uploadedFile?.name}
                  totalRows={csvRows.length}
                />
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleContinueToMapping}
                  >
                    {t('importExport.continueToMapping')}
                  </Button>
                </div>
              </div>
            )}

            {/* Fallback если нет данных для preview */}
            {currentStep === 'preview' && (csvHeaders.length === 0 || csvRows.length === 0) && (
              <div className="p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      No data to preview
                    </p>
                    <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                      The CSV file appears to be empty or could not be parsed. Please try uploading a different file.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="mt-3"
                    >
                      Upload Another File
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Mapping */}
            {currentStep === 'mapping' && csvHeaders.length > 0 && (
              <ErrorBoundary>
                <div className="space-y-6">
                  {/* Pipeline Selection - required for combined import (deals need it) */}
                  <div className="w-full p-4 border-2 border-primary/30 rounded-lg bg-muted/30">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {t('importExport.selectPipeline')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('importExport.pipelineRequiredForMapping')}
                      </p>
                    </div>
                    
                    <div className="w-full">
                      <PipelineSelector
                        selectedPipelineId={selectedPipelineId}
                        onPipelineChange={setSelectedPipelineId}
                      />
                    </div>
                    
                    {/* Подсказка если pipeline не выбран */}
                    {!selectedPipelineId && (
                      <div className="flex items-start gap-2 p-3 mt-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            {t('importExport.pipelineRequired')}
                          </p>
                          <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                            {t('importExport.selectPipelineToMapStages')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Import Settings Section - AssignedTo */}
                  <div className="space-y-4">
                      <div className="border-l-4 border-primary pl-4">
                        <h3 className="text-base font-semibold text-foreground mb-1">
                          {t('importExport.importSettings')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t('importExport.selectOwner')}
                        </p>
                      </div>
                      
                      <AssignedToSelector
                        selectedUserId={defaultAssignedToId}
                        applyToAll={applyAssignedToAll}
                        onUserChange={setDefaultAssignedToId}
                        onApplyToAllChange={setApplyAssignedToAll}
                        hasAssignedToMapping={hasAssignedToMapping()}
                        dryRunErrors={dryRunResult?.errors || []}
                      />
                    </div>
                  
                  {/* Column Mapping Section */}
                  <div className="space-y-4">
                    <div className="border-l-4 border-primary pl-4">
                      <h3 className="text-base font-semibold text-foreground mb-1">
                        {t('importExport.columnMapping')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('importExport.mapCsvColumnsDescription')}
                      </p>
                    </div>
                    
                    <AutoMappingForm
                      csvColumns={csvHeaders}
                      onMappingChange={handleMappingChange}
                      initialMapping={mapping}
                      csvSampleData={csvRows}
                      selectedPipelineId={selectedPipelineId}
                    />
                  </div>
                  
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('preview')}
                    >
                      {t('importExport.back')}
                    </Button>
                    <div className="flex flex-col items-end gap-2">
                      {getMappingValidationErrors().length > 0 && (
                        <div className="flex items-start gap-2 p-2 border border-destructive/20 bg-destructive/5 rounded text-xs text-destructive">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <div>
                            {getMappingValidationErrors().map((err, idx) => (
                              <div key={idx}>{err}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button
                        onClick={handleDryRun}
                        disabled={isDryRunDisabled()}
                      >
                        {isDryRunLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('importExport.runningDryRun')}
                          </>
                        ) : (
                          t('importExport.runDryRun')
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>
            )}

            {/* Step 4: Dry-run Summary */}
            {currentStep === 'dry-run' && dryRunResult && (
              <div className="space-y-4">
                <DryRunSummary
                  summary={dryRunResult.summary}
                  errors={dryRunResult.errors}
                  globalErrors={dryRunResult.globalErrors}
                  stagesToCreate={dryRunResult.stagesToCreate}
                  isLoading={isImporting}
                  onConfirm={handleConfirmImport}
                  onCancel={() => setCurrentStep('mapping')}
                />
              </div>
            )}

            {/* Step 5: Import Result */}
            {currentStep === 'result' && importResult && (
              <ImportResult
                summary={importResult.summary}
                errors={importResult.errors}
                warnings={importResult.warnings}
                onReset={handleReset}
              />
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-start gap-2 p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-1">Error</p>
                  <p className="text-xs text-destructive/80">{error}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ExportPanel />
        )}
      </div>
    </CRMLayout>
  )
}

export default function ImportExportPage() {
  return (
    <ErrorBoundary>
      <ImportExportContent />
    </ErrorBoundary>
  )
}
