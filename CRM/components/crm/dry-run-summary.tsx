'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp, Search, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type ImportSummary, type ImportError, type StageToCreate } from '@/lib/api/import'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface DryRunSummaryProps {
  summary: ImportSummary
  errors: ImportError[] // Row-specific errors (row >= 0)
  globalErrors?: string[] // Global errors (mapping, pipeline, etc.)
  stagesToCreate?: StageToCreate[]
  isLoading?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  isConfirmDisabled?: boolean
}

export function DryRunSummary({
  summary,
  errors,
  globalErrors = [],
  stagesToCreate = [],
  isLoading = false,
  onConfirm,
  onCancel,
  isConfirmDisabled = false,
}: DryRunSummaryProps) {
  const { t } = useTranslation()
  const [isErrorsExpanded, setIsErrorsExpanded] = useState(true)
  const [isGlobalErrorsExpanded, setIsGlobalErrorsExpanded] = useState(true)
  const [errorSearchTerm, setErrorSearchTerm] = useState('')
  const [showAllErrors, setShowAllErrors] = useState(false)
  
  const hasErrors = errors.length > 0
  const hasGlobalErrors = globalErrors.length > 0
  const hasWarnings = summary.skipped > 0
  const hasStagesToCreate = stagesToCreate.length > 0
  const canProceed = summary.created > 0 || summary.updated > 0

  // Filter errors based on search term
  const filteredErrors = errors.filter(error => {
    if (!errorSearchTerm) return true
    const searchLower = errorSearchTerm.toLowerCase()
    return (
      error.row.toString().includes(searchLower) ||
      error.field?.toLowerCase().includes(searchLower) ||
      error.value?.toLowerCase().includes(searchLower) ||
      error.error.toLowerCase().includes(searchLower)
    )
  })

  // Group errors by field for better visualization
  const errorsByField = filteredErrors.reduce<Record<string, ImportError[]>>((acc, error) => {
    const fieldKey = error.field || 'General'
    if (!acc[fieldKey]) {
      acc[fieldKey] = []
    }
    acc[fieldKey].push(error)
    return acc
  }, {})

  const displayedErrors = showAllErrors ? filteredErrors : filteredErrors.slice(0, 10)
  const hasMoreErrors = filteredErrors.length > 10

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Import Preview</h3>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 border border-border rounded-lg bg-card">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-lg font-semibold text-foreground">{summary.total}</p>
        </div>
        <div className="p-3 border border-green-500/20 rounded-lg bg-green-500/5">
          <p className="text-xs text-muted-foreground mb-1">Will Create</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {summary.created}
          </p>
        </div>
        <div className="p-3 border border-blue-500/20 rounded-lg bg-blue-500/5">
          <p className="text-xs text-muted-foreground mb-1">Will Update</p>
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {summary.updated}
          </p>
        </div>
        <div className="p-3 border border-yellow-500/20 rounded-lg bg-yellow-500/5">
          <p className="text-xs text-muted-foreground mb-1">Skipped</p>
          <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
            {summary.skipped}
          </p>
        </div>
        <div className="p-3 border border-destructive/20 rounded-lg bg-destructive/5">
          <p className="text-xs text-muted-foreground mb-1">Failed</p>
          <p className="text-lg font-semibold text-destructive">
            {summary.failed}
          </p>
        </div>
      </div>

      {/* Stages to Create */}
      {hasStagesToCreate && (
        <div className="flex items-start gap-2 p-3 border border-blue-500/20 bg-blue-500/5 rounded-lg">
          <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
              {stagesToCreate.length} {t('importExport.stagesToCreate')}
            </p>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mb-3">
              {t('importExport.stagesToCreateDescription')}
            </p>
            <div className="space-y-2">
              {stagesToCreate.map((stage, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono bg-background">
                      #{stage.order}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{stage.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="flex items-start gap-2 p-3 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
              {summary.skipped} row{summary.skipped !== 1 ? 's' : ''} will be skipped
            </p>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
              These rows have missing required fields or validation errors.
            </p>
          </div>
        </div>
      )}

      {/* Global Errors - shown separately from row errors */}
      {hasGlobalErrors && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsGlobalErrorsExpanded(!isGlobalErrorsExpanded)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {isGlobalErrorsExpanded ? (
                <ChevronUp className="h-4 w-4 text-destructive" />
              ) : (
                <ChevronDown className="h-4 w-4 text-destructive" />
              )}
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                {globalErrors.length} global error{globalErrors.length !== 1 ? 's' : ''}
              </p>
            </button>
          </div>
          
          {isGlobalErrorsExpanded && (
            <div className="border border-destructive/20 rounded-lg overflow-hidden">
              <div className="divide-y divide-border">
                {globalErrors.map((error, idx) => (
                  <div key={idx} className="p-3 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive" className="text-xs shrink-0">
                        Global
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row Errors */}
      {hasErrors && (
        <div className="space-y-3">
          {/* Error Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsErrorsExpanded(!isErrorsExpanded)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {isErrorsExpanded ? (
                <ChevronUp className="h-4 w-4 text-destructive" />
              ) : (
                <ChevronDown className="h-4 w-4 text-destructive" />
              )}
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                {errors.length} error{errors.length !== 1 ? 's' : ''} found
              </p>
              {filteredErrors.length < errors.length && (
                <Badge variant="outline" className="text-xs">
                  {filteredErrors.length} shown
                </Badge>
              )}
            </button>
            {errors.length > 5 && (
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search errors..."
                  value={errorSearchTerm}
                  onChange={(e) => setErrorSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            )}
          </div>

          {/* Error List */}
          {isErrorsExpanded && (
            <div className="border border-destructive/20 rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <div className="divide-y divide-border">
                  {displayedErrors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Row Badge */}
                        <Badge 
                          variant="outline" 
                          className="text-xs font-mono shrink-0 bg-background"
                        >
                          #{error.row}
                        </Badge>
                        
                        {/* Error Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Field */}
                          {error.field && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {error.field}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Value */}
                          {error.value && (
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide shrink-0">
                                Value:
                              </span>
                              <code className="text-xs font-mono text-foreground/80 bg-muted px-1.5 py-0.5 rounded break-all">
                                {error.value.length > 50 ? `${error.value.substring(0, 50)}...` : error.value}
                              </code>
                            </div>
                          )}
                          
                          {/* Error Message */}
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                            <p className="text-xs text-destructive leading-relaxed">
                              {error.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Show More Button */}
              {hasMoreErrors && !showAllErrors && (
                <div className="p-3 border-t border-border bg-muted/20">
                  <button
                    onClick={() => setShowAllErrors(true)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Show {filteredErrors.length - 10} more error{filteredErrors.length - 10 !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
              
              {/* Error Summary by Field */}
              {filteredErrors.length > 3 && (
                <div className="p-3 border-t border-border bg-muted/10">
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-2">
                    Errors by field:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(errorsByField).map(([field, fieldErrors]) => (
                      <Badge 
                        key={field} 
                        variant="outline" 
                        className="text-xs"
                      >
                        {field}: {fieldErrors.length}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {!hasErrors && canProceed && (
        <div className="flex items-start gap-2 p-3 border border-green-500/20 bg-green-500/5 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
              Ready to import
            </p>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">
              {summary.created + summary.updated} record{summary.created + summary.updated !== 1 ? 's' : ''} will be {summary.created > 0 && summary.updated > 0 ? 'created or updated' : summary.created > 0 ? 'created' : 'updated'}.
            </p>
          </div>
        </div>
      )}

      {/* Warning about stages creation */}
      {hasStagesToCreate && (onConfirm || onCancel) && (
        <div className="flex items-start gap-2 p-3 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
            {t('importExport.stagesWillBeAdded')}
          </p>
        </div>
      )}

      {/* Actions */}
      {(onConfirm || onCancel) && (
        <div className="flex items-center gap-3 pt-2">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          {onConfirm && (
            <Button
              onClick={onConfirm}
              disabled={isLoading || isConfirmDisabled || !canProceed}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {hasStagesToCreate ? t('importExport.importingAndCreatingStages') : t('importExport.importing')}
                </>
              ) : (
                hasStagesToCreate
                  ? `${t('importExport.importAndCreateStages')} (${summary.created + summary.updated} ${t('importExport.records')})`
                  : `${t('importExport.confirmImport')} (${summary.created + summary.updated} ${t('importExport.records')})`
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

