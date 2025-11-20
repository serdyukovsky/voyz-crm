"use client"

import { Upload, Download, Trash2, FileText, Image as ImageIcon, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useRef } from 'react'
import type { DealFile } from '@/hooks/use-deal-files'

interface DealFilesPanelProps {
  files: DealFile[]
  onUpload: (file: File) => Promise<void>
  onDelete: (fileId: string) => Promise<void>
  onDownload: (file: DealFile) => Promise<void>
  uploading?: boolean
}

export function DealFilesPanel({
  files,
  onUpload,
  onDelete,
  onDownload,
  uploading = false
}: DealFilesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await onUpload(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Files</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          multiple
        />
      </div>

      {files.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-border/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">No files yet</p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3 w-3 mr-1" />
            Upload File
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 rounded-md border border-border/50 hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="text-muted-foreground">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file.size} • {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDownload(file)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => onDelete(file.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

