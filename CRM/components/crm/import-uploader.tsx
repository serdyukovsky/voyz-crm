'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImportUploaderProps {
  onFileUpload: (file: File | null, preview: any[]) => void
}

export function ImportUploader({ onFileUpload }: ImportUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      processFile(file)
    }
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [])

  const processFile = (file: File) => {
    setSelectedFile(file)
    
    // Mock preview data - in real app, parse the file
    const mockPreview = [
      { 'Full Name': 'John Doe', 'Email': 'john@example.com', 'Company': 'Acme Inc', 'Phone': '+1234567890', 'Deal Amount': '$25000' },
      { 'Full Name': 'Jane Smith', 'Email': 'jane@example.com', 'Company': 'TechCorp', 'Phone': '+1987654321', 'Deal Amount': '$50000' },
      { 'Full Name': 'Bob Johnson', 'Email': 'bob@example.com', 'Company': 'StartupXYZ', 'Phone': '+1122334455', 'Deal Amount': '$15000' },
      { 'Full Name': 'Alice Williams', 'Email': 'alice@example.com', 'Company': 'Enterprise Co', 'Phone': '+1555666777', 'Deal Amount': '$75000' },
      { 'Full Name': 'Charlie Brown', 'Email': 'charlie@example.com', 'Company': 'Global Ltd', 'Phone': '+1999888777', 'Deal Amount': '$30000' },
    ]
    
    onFileUpload(file, mockPreview)
  }

  const clearFile = () => {
    setSelectedFile(null)
    onFileUpload(null, [])
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border border-dashed rounded-lg transition-colors
          ${isDragging 
            ? 'border-[#6B8AFF] bg-[#6B8AFF]/5' 
            : 'border-border hover:border-muted-foreground/50'
          }
          ${selectedFile ? 'bg-muted/20' : 'bg-transparent'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          accept=".csv,.xlsx"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="px-8 py-12 text-center">
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-[#6B8AFF]" />
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
                  clearFile()
                }}
                className="ml-4 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drag & drop your file here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports CSV and XLSX files
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
