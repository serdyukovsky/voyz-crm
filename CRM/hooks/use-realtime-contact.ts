"use client"

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseRealtimeContactOptions {
  contactId: string
  onDealUpdated?: (dealId: string, data: any) => void
  onTaskUpdated?: (taskId: string, data: any) => void
  onContactUpdated?: (data: any) => void
}

export function useRealtimeContact({
  contactId,
  onDealUpdated,
  onTaskUpdated,
  onContactUpdated,
}: UseRealtimeContactOptions) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001/realtime', {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      // Subscribe to contact updates
      socket.emit('subscribe:contact', { contactId })
    })

    // Listen for contact.deal.updated events
    socket.on('contact.deal.updated', (data: { contactId: string; dealId: string; [key: string]: any }) => {
      if (data.contactId === contactId) {
        onDealUpdated?.(data.dealId, data)
      }
    })

    // Listen for contact.task.updated events
    socket.on('contact.task.updated', (data: { contactId: string; taskId: string; [key: string]: any }) => {
      if (data.contactId === contactId) {
        onTaskUpdated?.(data.taskId, data)
      }
    })

    // Listen for contact.updated events
    socket.on('contact.updated', (data: { contactId: string; [key: string]: any }) => {
      if (data.contactId === contactId) {
        onContactUpdated?.(data)
      }
    })

    socketRef.current = socket

    return () => {
      socket.emit('unsubscribe:contact', { contactId })
      socket.disconnect()
    }
  }, [contactId, onDealUpdated, onTaskUpdated, onContactUpdated])

  return {
    connected: socketRef.current?.connected || false,
  }
}





