'use client'

import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type ImportSummary, type ImportError } from '@/lib/api/import'
import { cn } from '@/lib/utils'

interface DryRunSummaryProps {
  summary: ImportSummary
  errors: ImportError[]
  isLoading?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  isConfirmDisabled?: boolean
}

export function DryRunSummary({
  summary,
  errors,
  isLoading = false,
  onConfirm,
  onCancel,
  isConfirmDisabled = false,
}: DryRunSummaryProps) {
  const hasErrors = errors.length > 0
  const hasWarnings = summary.skipped > 0
  const canProceed = summary.created > 0 || summary.updated > 0

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

      {/* Errors */}
      {hasErrors && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {errors.length} error{errors.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="max-h-[200px] overflow-y-auto border border-destructive/20 rounded-lg">
            <div className="divide-y divide-border">
              {errors.slice(0, 10).map((error, idx) => (
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
            {errors.length > 10 && (
              <div className="p-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground text-center">
                  ... and {errors.length - 10} more error{errors.length - 10 !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
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
                  Importing...
                </>
              ) : (
                `Confirm Import (${summary.created + summary.updated} records)`
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

