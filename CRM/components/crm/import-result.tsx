'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type ImportSummary, type ImportError } from '@/lib/api/import'

interface ImportResultProps {
  summary: ImportSummary
  errors: ImportError[] // Row-specific errors (row >= 0)
  globalErrors?: string[] // Global errors (mapping, pipeline, etc.)
  warnings?: string[]
  onReset?: () => void
}

export function ImportResult({
  summary,
  errors,
  globalErrors = [],
  warnings = [],
  onReset,
}: ImportResultProps) {
  const [isErrorsExpanded, setIsErrorsExpanded] = useState(true)
  const [isGlobalErrorsExpanded, setIsGlobalErrorsExpanded] = useState(true)
  const [errorSearchTerm, setErrorSearchTerm] = useState('')
  const [showAllErrors, setShowAllErrors] = useState(false)
  
  const hasErrors = errors.length > 0
  const hasGlobalErrors = globalErrors.length > 0
  const hasWarnings = warnings.length > 0
  const isSuccess = summary.failed === 0 && (summary.created > 0 || summary.updated > 0)

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

  // Group errors by field
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Import Result</h3>
        {onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Import Another File
          </Button>
        )}
      </div>

      {/* Success/Error Banner */}
      {isSuccess && !hasErrors && (
        <div className="flex items-start gap-2 p-4 border border-green-500/20 bg-green-500/5 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
              Import completed successfully!
            </p>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">
              {summary.created + summary.updated} record{summary.created + summary.updated !== 1 ? 's' : ''} {summary.created > 0 && summary.updated > 0 ? 'created or updated' : summary.created > 0 ? 'created' : 'updated'}.
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

      {hasErrors && (
        <div className="flex items-start gap-2 p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
          <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive mb-1">
              Import completed with errors
            </p>
            <p className="text-xs text-destructive/80">
              {summary.created + summary.updated} record{summary.created + summary.updated !== 1 ? 's' : ''} imported, but {summary.failed} row{summary.failed !== 1 ? 's' : ''} failed.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 border border-border rounded-lg bg-card">
          <p className="text-xs text-muted-foreground mb-1">Total Processed</p>
          <p className="text-lg font-semibold text-foreground">{summary.total}</p>
        </div>
        <div className="p-3 border border-green-500/20 rounded-lg bg-green-500/5">
          <p className="text-xs text-muted-foreground mb-1">Created</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {summary.created}
          </p>
        </div>
        <div className="p-3 border border-blue-500/20 rounded-lg bg-blue-500/5">
          <p className="text-xs text-muted-foreground mb-1">Updated</p>
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

      {/* Warnings */}
      {hasWarnings && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              Warnings
            </p>
          </div>
          <div className="p-3 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
            <ul className="space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx} className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Errors */}
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
                {errors.length} error{errors.length !== 1 ? 's' : ''}
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
    </div>
  )
}

