'use client'

interface ImportPreviewTableProps {
  data: any[]
  maxRows?: number
}

export function ImportPreviewTable({ data, maxRows = 20 }: ImportPreviewTableProps) {
  if (!data || data.length === 0) return null

  const columns = Object.keys(data[0])
  const previewData = data.slice(0, maxRows)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {previewData.length} of {data.length} rows
        </p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {columns.map((column, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                >
                  {columns.map((column, colIdx) => (
                    <td key={colIdx} className="px-4 py-3 text-foreground">
                      {row[column]}
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
