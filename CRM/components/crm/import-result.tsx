'use client'

import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type ImportSummary, type ImportError } from '@/lib/api/import'

interface ImportResultProps {
  summary: ImportSummary
  errors: ImportError[]
  warnings?: string[]
  onReset?: () => void
}

export function ImportResult({
  summary,
  errors,
  warnings = [],
  onReset,
}: ImportResultProps) {
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0
  const isSuccess = summary.failed === 0 && (summary.created > 0 || summary.updated > 0)

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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {errors.length} error{errors.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="max-h-[300px] overflow-y-auto border border-destructive/20 rounded-lg">
            <div className="divide-y divide-border">
              {errors.map((error, idx) => (
                <div key={idx} className="p-3 bg-destructive/5">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs">
                      Row {error.row}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      {error.field && (
                        <p className="text-xs text-muted-foreground mb-1">
                          Field: <span className="font-medium">{error.field}</span>
                        </p>
                      )}
                      {error.value && (
                        <p className="text-xs text-muted-foreground mb-1">
                          Value: <span className="font-mono">{error.value}</span>
                        </p>
                      )}
                      <p className="text-xs text-destructive">{error.error}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

