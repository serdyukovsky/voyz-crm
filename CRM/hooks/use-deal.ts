"use client"

import { useState, useEffect } from 'react'
import { getApiBaseUrl } from '@/lib/config'

export interface Deal {
  id: string
  number: string
  title: string
  client?: string
  amount: number
  stage: string
  stageId?: string
  pipelineId?: string
  pipeline?: {
    id: string
    name: string
    stages?: Array<{
      id: string
      name: string
      order: number
      color: string
      isDefault: boolean
      isClosed: boolean
    }>
  }
  assignedTo: {
    id: string
    name: string
    avatar?: string
  }
  contactId?: string
  contact?: {
    id: string
    fullName: string
    email?: string
    phone?: string
    position?: string
    companyName?: string
    social?: {
      instagram?: string
      telegram?: string
      whatsapp?: string
      vk?: string
    }
    stats?: {
      activeDeals: number
      closedDeals: number
      totalDeals: number
      totalDealVolume?: number
    }
  }
  createdAt: string
  expectedClose?: string
  tags: string[]
  customFields?: CustomField[]
}

export interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'checkbox' | 'relation'
  value: any
  options?: string[]
  group: string
  order: number
}

interface UseDealOptions {
  dealId: string
  realtime?: boolean
}

export function useDeal({ dealId, realtime = false }: UseDealOptions) {
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDeal = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check sessionStorage for quick initial load (for new deals)
      let quickDealData = null
      if (typeof window !== 'undefined') {
        const savedDeal = sessionStorage.getItem(`deal-${dealId}`)
        if (savedDeal) {
          try {
            quickDealData = JSON.parse(savedDeal)
            // Set quick data immediately for better UX
            setDeal(quickDealData)
            setLoading(false)
            // Clear the "isNew" flag
            sessionStorage.removeItem(`deal-${dealId}-isNew`)
          } catch (e) {
            console.error('Failed to parse saved deal from sessionStorage:', e)
          }
        }
      }

      // Always fetch from API to get complete and up-to-date data
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('No access token found')
      }

      const API_BASE_URL = getApiBaseUrl()
      console.log('Loading deal from API:', dealId)
      const response = await fetch(`${API_BASE_URL}/deals/${dealId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          // If we have quick data, keep it even if API returns 404 (deal might be very new)
          if (quickDealData) {
            console.warn('Deal not found in API but has sessionStorage data, keeping sessionStorage data')
            return
          }
          throw new Error('Deal not found')
        }
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to load deal: ${response.status} ${errorText}`)
      }
      
      setLoading(true) // Set loading again while processing API response

      const data = await response.json()
      
      // Transform API response to Deal format
      const dealData: Deal = {
        id: data.id,
        number: data.number || `DL-${data.id.slice(0, 8)}`,
        title: data.title || 'Untitled Deal',
        client: data.contact?.fullName || data.company?.name || undefined,
        amount: data.amount ? Number(data.amount) : 0,
        stage: data.stage?.id || data.stageId || 'new',
        stageId: data.stage?.id || data.stageId,
        pipelineId: data.pipelineId || data.pipeline?.id,
        pipeline: data.pipeline ? {
          id: data.pipeline.id,
          name: data.pipeline.name || 'Unknown Pipeline',
          stages: data.pipeline.stages || [],
        } : undefined,
        assignedTo: data.assignedTo ? {
          id: data.assignedTo.id,
          name: data.assignedTo.name || 'Unknown User',
          avatar: data.assignedTo.avatar,
        } : {
          id: 'unassigned',
          name: 'Unassigned',
        },
        contactId: data.contactId,
        contact: data.contact ? {
          id: data.contact.id,
          fullName: data.contact.fullName || 'Unknown Contact',
          email: data.contact.email,
          phone: data.contact.phone,
          position: data.contact.position,
          companyName: data.contact.companyName,
          social: data.contact.social,
          stats: data.contact.stats,
        } : undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        expectedClose: data.expectedCloseAt,
        tags: data.tags || [],
        customFields: data.customFields || [],
      }
      
      setDeal(dealData)
      
      // Save to sessionStorage for offline access
      if (typeof window !== 'undefined') {
        try {
          // Create clean object without circular references
          const cleanDeal = {
            id: dealData.id,
            number: dealData.number,
            title: dealData.title,
            client: dealData.client,
            amount: dealData.amount,
            stage: dealData.stage,
            assignedTo: dealData.assignedTo,
            contactId: dealData.contactId,
            contact: dealData.contact ? {
              id: dealData.contact.id,
              fullName: dealData.contact.fullName,
              email: dealData.contact.email,
              phone: dealData.contact.phone,
              position: dealData.contact.position,
              companyName: dealData.contact.companyName,
            } : undefined,
            createdAt: dealData.createdAt,
            expectedClose: dealData.expectedClose,
            tags: dealData.tags,
            customFields: dealData.customFields,
          }
          sessionStorage.setItem(`deal-${dealId}`, JSON.stringify(cleanDeal))
        } catch (e) {
          console.error('Failed to save deal to sessionStorage:', e instanceof Error ? e.message : String(e))
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load deal'
      console.error('useDeal - error loading deal:', errorMessage)
      setError(errorMessage)
      setDeal(null) // Ensure deal is null on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeal()
  }, [dealId])

  const updateDeal = async (updates: Partial<Deal>) => {
    if (!deal) return
    
    const updatedDeal = { ...deal, ...updates }
    setDeal(updatedDeal)
    
    // Save to API
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('No access token found')
      }

      const API_BASE_URL = getApiBaseUrl()
      const response = await fetch(`${API_BASE_URL}/deals/${dealId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to update deal: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      // Update local state with response
      setDeal({ ...updatedDeal, ...data })
    } catch (error) {
      console.error('Failed to update deal on server:', error)
      // Still update local state even if API call fails
    }
    
    // Save to sessionStorage for offline access
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`deal-${dealId}`, JSON.stringify(updatedDeal))
    }
  }

  const updateField = async (fieldId: string, value: any) => {
    if (!deal) return
    
    const updatedCustomFields = deal.customFields?.map(field =>
      field.id === fieldId ? { ...field, value } : field
    ) || []
    
    await updateDeal({ customFields: updatedCustomFields })
  }

  return {
    deal,
    loading,
    error,
    updateDeal,
    updateField,
    refetch: loadDeal
  }
}

