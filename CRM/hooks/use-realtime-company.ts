"use client"

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { getWsUrl } from '@/lib/config'

interface UseRealtimeCompanyOptions {
  companyId?: string
  onCompanyUpdated?: (data: any) => void
  onCompanyDeleted?: (data: any) => void
  onDealUpdated?: (dealId: string, data: any) => void
  onContactUpdated?: (contactId: string, data: any) => void
}

export function useRealtimeCompany({
  companyId,
  onCompanyUpdated,
  onCompanyDeleted,
  onDealUpdated,
  onContactUpdated,
}: UseRealtimeCompanyOptions) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const token = localStorage.getItem('access_token')
    if (!token) return

    const wsUrl = getWsUrl()
    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      // Subscribe to company updates if companyId is provided
      if (companyId) {
        socket.emit('subscribe:company', { companyId })
      }
    })

    // Listen for company.updated events
    socket.on('company.updated', (data: { companyId: string; [key: string]: any }) => {
      if (!companyId || data.companyId === companyId) {
        onCompanyUpdated?.(data)
      }
    })

    // Listen for company.deleted events
    socket.on('company.deleted', (data: { companyId: string; [key: string]: any }) => {
      if (!companyId || data.companyId === companyId) {
        onCompanyDeleted?.(data)
      }
    })

    // Listen for company.deal.updated events
    socket.on('company.deal.updated', (data: { companyId: string; dealId: string; [key: string]: any }) => {
      if (!companyId || data.companyId === companyId) {
        onDealUpdated?.(data.dealId, data)
      }
    })

    // Listen for company.contact.updated events
    socket.on('company.contact.updated', (data: { companyId: string; contactId: string; [key: string]: any }) => {
      if (!companyId || data.companyId === companyId) {
        onContactUpdated?.(data.contactId, data)
      }
    })

    socketRef.current = socket

    return () => {
      if (companyId) {
        socket.emit('unsubscribe:company', { companyId })
      }
      socket.disconnect()
    }
  }, [companyId, onCompanyUpdated, onCompanyDeleted, onDealUpdated, onContactUpdated])

  return {
    connected: socketRef.current?.connected || false,
  }
}





