"use client"

import { useState, useEffect } from 'react'

export interface DealFile {
  id: string
  name: string
  size: string
  type: string
  url: string
  uploadedBy: {
    id: string
    name: string
    avatar?: string
  }
  uploadedAt: string
  thumbnailUrl?: string
}

interface UseDealFilesOptions {
  dealId: string
}

export function useDealFiles({ dealId }: UseDealFilesOptions) {
  const [files, setFiles] = useState<DealFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const loadFiles = async () => {
    try {
      setLoading(true)
      // TODO: Fetch from API
      // const response = await fetch(`/api/deals/${dealId}/files`)
      // const data = await response.json()
      
      // Mock data
      const mockFiles: DealFile[] = [
        {
          id: "1",
          name: "Proposal_Q1_2024.pdf",
          size: "2.4 MB",
          type: "application/pdf",
          url: "#",
          uploadedBy: { id: "1", name: "Alex Chen" },
          uploadedAt: "2024-01-15T16:00:00"
        }
      ]
      
      setFiles(mockFiles)
    } catch (err) {
      console.error('Failed to load files:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [dealId])

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      // TODO: Upload via API
      // const formData = new FormData()
      // formData.append('file', file)
      // const response = await fetch(`/api/deals/${dealId}/files`, {
      //   method: 'POST',
      //   body: formData
      // })
      
      const newFile: DealFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type,
        url: URL.createObjectURL(file),
        uploadedBy: { id: "1", name: "Current User" },
        uploadedAt: new Date().toISOString()
      }
      
      setFiles(prev => [...prev, newFile])
      return newFile
    } catch (err) {
      console.error('Failed to upload file:', err)
      throw err
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileId: string) => {
    try {
      // TODO: Delete via API
      // await fetch(`/api/deals/${dealId}/files/${fileId}`, {
      //   method: 'DELETE'
      // })
      
      setFiles(prev => prev.filter(file => file.id !== fileId))
    } catch (err) {
      console.error('Failed to delete file:', err)
      throw err
    }
  }

  const downloadFile = async (file: DealFile) => {
    // TODO: Implement download
    window.open(file.url, '_blank')
  }

  return {
    files,
    loading,
    uploading,
    uploadFile,
    deleteFile,
    downloadFile,
    refetch: loadFiles
  }
}

