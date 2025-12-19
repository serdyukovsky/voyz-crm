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
import { importContacts, importDeals, type ImportResult as ImportResultType } from "@/lib/api/import"
import { type ParsedCsvRow } from "@/lib/utils/csv-parser"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { ErrorBoundary } from "@/components/crm/error-boundary"
import { useTranslation } from "@/lib/i18n/i18n-context"

type ImportStep = 'upload' | 'preview' | 'mapping' | 'dry-run' | 'result'
type EntityType = 'contact' | 'deal'

function ImportExportContent() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"import" | "export">("import")
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
  const [entityType, setEntityType] = useState<EntityType>('contact')
  
  // File & Data
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<ParsedCsvRow[]>([])
  
  // Mapping (undefined means "not selected", not empty string)
  const [mapping, setMapping] = useState<Record<string, string | undefined>>({})
  
  // Pipeline для deal import (обязательно для resolution stages)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)
  
  // Default assigned user для deal import (опционально, для "apply to all")
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
    setCurrentStep('mapping')
  }

  const handleDryRun = async () => {
    if (!uploadedFile) return

    // Валидация для deals: требуется выбрать pipeline
    if (entityType === 'deal' && !selectedPipelineId) {
      const errorMessage = 'Please select a pipeline before performing dry-run'
      setError(errorMessage)
      showError('Pipeline required', errorMessage)
      return
    }

    setIsDryRunLoading(true)
    setError(null)

    try {
      const result = entityType === 'contact'
        ? await importContacts(uploadedFile, mapping, ',', true)
        : await importDeals(
            uploadedFile, 
            mapping, 
            selectedPipelineId!, 
            ',', 
            true,
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

    // Валидация для deals: требуется выбрать pipeline
    if (entityType === 'deal' && !selectedPipelineId) {
      const errorMessage = 'Please select a pipeline before confirming import'
      setError(errorMessage)
      showError('Pipeline required', errorMessage)
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const result = entityType === 'contact'
        ? await importContacts(uploadedFile, mapping, ',', false)
        : await importDeals(
            uploadedFile, 
            mapping, 
            selectedPipelineId!, 
            ',', 
            false,
            applyAssignedToAll ? defaultAssignedToId : undefined
          )

      setImportResult(result)
      setCurrentStep('result')
      showSuccess(
        'Import completed',
        `${result.summary.created + result.summary.updated} records imported successfully`
      )
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

  const isMappingValid = () => {
    // Проверяем что хотя бы одно поле замаплено (не undefined)
    // Это будет проверяться на backend, но базовая валидация здесь
    const mappedFields = Object.values(mapping).filter(v => v !== undefined)
    return mappedFields.length > 0
  }

  const hasAssignedToMapping = () => {
    // Проверяем есть ли маппинг для assignedToId
    return Object.values(mapping).includes('assignedToId')
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

            {/* Entity Type Selector */}
            {currentStep === 'upload' && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-foreground">{t('importExport.importType')}</label>
                <div className="flex gap-2">
                  <Button
                    variant={entityType === 'contact' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEntityType('contact')}
                  >
                    {t('importExport.contacts')}
                  </Button>
                  <Button
                    variant={entityType === 'deal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEntityType('deal')}
                  >
                    {t('importExport.deals')}
                  </Button>
                </div>
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
                  rows={csvRows}
                  fileName={uploadedFile?.name}
                />
                <div className="flex justify-end">
                  <Button onClick={handleContinueToMapping}>
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
                <div className="space-y-4">
                  {/* Pipeline Selector для Deals */}
                  {entityType === 'deal' && (
                    <>
                      <PipelineSelector
                        selectedPipelineId={selectedPipelineId}
                        onPipelineChange={setSelectedPipelineId}
                      />
                      <AssignedToSelector
                        selectedUserId={defaultAssignedToId}
                        applyToAll={applyAssignedToAll}
                        onUserChange={setDefaultAssignedToId}
                        onApplyToAllChange={setApplyAssignedToAll}
                        hasAssignedToMapping={hasAssignedToMapping()}
                        dryRunErrors={dryRunResult?.errors || []}
                      />
                    </>
                  )}
                  
                  <AutoMappingForm
                    csvColumns={csvHeaders}
                    entityType={entityType}
                    onMappingChange={handleMappingChange}
                    initialMapping={mapping}
                    csvSampleData={csvRows}
                  />
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('preview')}
                    >
                      {t('importExport.back')}
                    </Button>
                    <Button
                      onClick={handleDryRun}
                      disabled={
                        !isMappingValid() || 
                        isDryRunLoading || 
                        (entityType === 'deal' && !selectedPipelineId)
                      }
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
              </ErrorBoundary>
            )}

            {/* Step 4: Dry-run Summary */}
            {currentStep === 'dry-run' && dryRunResult && (
              <div className="space-y-4">
                <DryRunSummary
                  summary={dryRunResult.summary}
                  errors={dryRunResult.errors}
                  isLoading={isImporting}
                  onConfirm={handleConfirmImport}
                  onCancel={() => setCurrentStep('mapping')}
                  isConfirmDisabled={!isMappingValid()}
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
