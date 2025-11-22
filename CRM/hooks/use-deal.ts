"use client"

import { useState, useEffect } from 'react'

export interface Deal {
  id: string
  number: string
  title: string
  client?: string
  amount: number
  stage: string
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
      // Load from sessionStorage for new deals, or fetch from API
      if (typeof window !== 'undefined') {
        const savedDeal = sessionStorage.getItem(`deal-${dealId}`)
        const isNew = sessionStorage.getItem(`deal-${dealId}-isNew`) === 'true'
        
        if (savedDeal) {
          const dealData = JSON.parse(savedDeal)
          setDeal(dealData)
          setLoading(false)
          return
        }
      }

      // TODO: Fetch from API when backend is ready
      // const response = await fetch(`/api/deals/${dealId}`)
      // const data = await response.json()
      
      // Mock data for now
      const mockDeal: Deal = {
        id: dealId,
        number: "DL-2024-0342",
        title: "Enterprise License - Q1 2024",
        client: "Acme Corporation",
        amount: 125000,
        stage: "qualified",
        assignedTo: {
          id: "1",
          name: "Alex Chen",
          avatar: "/abstract-geometric-shapes.png"
        },
        createdAt: "2024-01-15",
        expectedClose: "2024-03-01",
        tags: [],
        customFields: []
      }
      
      setDeal(mockDeal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deal')
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
    
    // TODO: Save to API
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

