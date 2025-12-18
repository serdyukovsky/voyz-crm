'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseCsvFile, type ParsedCsvRow } from '@/lib/utils/csv-parser'

interface ImportUploaderProps {
  onFileUpload: (file: File | null, headers: string[], rows: ParsedCsvRow[]) => void
  disabled?: boolean
}

export function ImportUploader({ onFileUpload, disabled = false }: ImportUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith('.csv')) {
        await processFile(file)
      } else {
        setError('Please upload a CSV file')
      }
    },
    [disabled],
  )

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await processFile(file)
      }
    },
    [],
  )

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported')
      return
    }

    setSelectedFile(file)
    setError(null)
    setIsParsing(true)

    try {
      // Парсим первые 20 строк для предпросмотра
      const { headers, rows } = await parseCsvFile(file, ',', 20)
      onFileUpload(file, headers, rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
      setSelectedFile(null)
      onFileUpload(null, [], [])
    } finally {
      setIsParsing(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError(null)
    onFileUpload(null, [], [])
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border border-dashed rounded-lg transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-muted-foreground/50'
          }
          ${selectedFile ? 'bg-muted/20' : 'bg-transparent'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          accept=".csv"
          onChange={handleFileInput}
          disabled={disabled || isParsing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="px-8 py-12 text-center">
          {isParsing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Parsing CSV file...</p>
            </div>
          ) : selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  clearFile()
                }}
                disabled={disabled}
                className="ml-4 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drag & drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports CSV files only
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
