"use client"

import { useEffect, useRef } from 'react'

interface UseRealtimeDealOptions {
  dealId: string
  onFieldUpdate?: (fieldId: string, value: any) => void
  onTaskCreated?: (task: any) => void
  onTaskUpdated?: (taskId: string, updates: any) => void
  onCommentAdded?: (comment: any) => void
  onFileUploaded?: (file: any) => void
}

export function useRealtimeDeal({
  dealId,
  onFieldUpdate,
  onTaskCreated,
  onTaskUpdated,
  onCommentAdded,
  onFileUploaded
}: UseRealtimeDealOptions) {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // TODO: Connect to WebSocket when backend is ready
    // Use Socket.IO instead of raw WebSocket for consistency
    // import { getWsUrl } from '@/lib/config'
    // const wsUrl = getWsUrl()
    // const socket = io(wsUrl, { auth: { token }, path: `/deals/${dealId}/realtime` })
    // 
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data)
    //   
    //   switch (data.type) {
    //     case 'field_updated':
    //       onFieldUpdate?.(data.fieldId, data.value)
    //       break
    //     case 'task_created':
    //       onTaskCreated?.(data.task)
    //       break
    //     case 'task_updated':
    //       onTaskUpdated?.(data.taskId, data.updates)
    //       break
    //     case 'comment_added':
    //       onCommentAdded?.(data.comment)
    //       break
    //     case 'file_uploaded':
    //       onFileUploaded?.(data.file)
    //       break
    //   }
    // }
    // 
    // wsRef.current = ws
    // 
    // return () => {
    //   ws.close()
    // }

    // For now, return a no-op cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [dealId, onFieldUpdate, onTaskCreated, onTaskUpdated, onCommentAdded, onFileUploaded])

  return {
    connected: false // TODO: Return actual connection status
  }
}

