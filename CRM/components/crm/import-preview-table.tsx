'use client'

import { type ParsedCsvRow } from '@/lib/utils/csv-parser'

interface ImportPreviewTableProps {
  headers?: string[]
  rows?: ParsedCsvRow[]
  data?: any[] // Для обратной совместимости со старым API
  fileName?: string
  totalRows?: number
}

export function ImportPreviewTable({ 
  headers, 
  rows, 
  data, // Для обратной совместимости
  fileName,
  totalRows 
}: ImportPreviewTableProps) {
  // Поддержка старого API (data вместо headers/rows)
  let finalHeaders: string[] = []
  let finalRows: ParsedCsvRow[] = []

  if (data && data.length > 0) {
    // Старый формат: data - массив объектов
    finalHeaders = Object.keys(data[0] || {})
    finalRows = data.map((row) => {
      const parsedRow: ParsedCsvRow = {}
      finalHeaders.forEach((header) => {
        parsedRow[header] = String(row[header] || '')
      })
      return parsedRow
    })
  } else if (headers && rows) {
    // Новый формат: headers и rows отдельно
    finalHeaders = headers
    finalRows = rows
  }

  if (!finalHeaders || finalHeaders.length === 0 || !finalRows || finalRows.length === 0) {
    return null
  }

  const previewRows = finalRows.slice(0, 20)
  const displayedCount = previewRows.length
  const actualTotal = totalRows || finalRows.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {fileName || 'CSV Preview'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Showing {displayedCount} of {actualTotal} {actualTotal === 1 ? 'row' : 'rows'}
            {actualTotal > displayedCount && ' (first 20 rows)'}
          </p>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <tr className="border-b border-border">
                {finalHeaders.map((header, idx) => (
                  <th
                    key={`header-${idx}-${header}`}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIdx) => (
                <tr
                  key={`row-${rowIdx}`}
                  className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                >
                  {finalHeaders.map((header, colIdx) => (
                    <td 
                      key={`cell-${rowIdx}-${colIdx}`} 
                      className="px-4 py-2 text-foreground whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                      title={String(row[header] || '')}
                    >
                      {row[header] || <span className="text-muted-foreground italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
