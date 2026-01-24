import { Contact, CreateContactDto, UpdateContactDto, Company, Task } from '@/types/contact'

// Re-export types for easier imports
export type { Contact, CreateContactDto, UpdateContactDto, Company, Task }

import { getApiBaseUrl } from '@/lib/config'

// Mock data for development
const mockCompanies: Company[] = [
  { id: '1', name: 'Acme Corp', website: 'https://acme.com', industry: 'Technology' },
  { id: '2', name: 'TechStart Inc', website: 'https://techstart.com', industry: 'Software' },
  { id: '3', name: 'Growth Labs', website: 'https://growthlabs.com', industry: 'Marketing' },
]

const mockContacts: Contact[] = [
  {
    id: '1',
    fullName: 'John Smith',
    email: 'john.smith@acme.com',
    phone: '+1 (555) 123-4567',
    position: 'CEO',
    companyName: 'Acme Corp',
    companyId: '1',
    company: mockCompanies[0],
    tags: ['VIP', 'Enterprise'],
    notes: 'Key decision maker. Prefers email communication.',
    social: {
      instagram: 'https://instagram.com/johnsmith',
      telegram: '@johnsmith',
      whatsapp: '+15551234567',
      vk: 'https://vk.com/johnsmith',
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    deals: [
      {
        id: '1',
        name: 'Enterprise Software License',
        stage: 'negotiation',
        status: 'active',
        amount: 125000,
        responsibleManager: { id: '1', name: 'Sarah Wilson', avatar: 'SW' },
      },
    ],
    stats: {
      activeDeals: 1,
      closedDeals: 2,
      totalDeals: 3,
      totalDealVolume: 250000,
    },
  },
  {
    id: '2',
    fullName: 'Emma Davis',
    email: 'emma.davis@techstart.com',
    phone: '+1 (555) 234-5678',
    position: 'CTO',
    companyName: 'TechStart Inc',
    companyId: '2',
    company: mockCompanies[1],
    tags: ['Technical'],
    notes: 'Technical lead. Very responsive.',
    social: {
      telegram: '@emmadavis',
      whatsapp: '+15552345678',
    },
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-18T11:20:00Z',
    deals: [
      {
        id: '2',
        name: 'Cloud Migration Project',
        stage: 'in-progress',
        status: 'active',
        amount: 85000,
        responsibleManager: { id: '2', name: 'Mike Chen', avatar: 'MC' },
      },
    ],
    stats: {
      activeDeals: 1,
      closedDeals: 0,
      totalDeals: 1,
      totalDealVolume: 85000,
    },
  },
  {
    id: '3',
    fullName: 'Mike Chen',
    email: 'mike.chen@growthlabs.com',
    phone: '+1 (555) 345-6789',
    position: 'Marketing Director',
    companyName: 'Growth Labs',
    companyId: '3',
    company: mockCompanies[2],
    tags: ['Marketing', 'SMB'],
    social: {
      instagram: 'https://instagram.com/mikechen',
      vk: 'https://vk.com/mikechen',
    },
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-01-15T16:45:00Z',
    deals: [],
    stats: {
      activeDeals: 0,
      closedDeals: 1,
      totalDeals: 1,
      totalDealVolume: 35000,
    },
  },
]

// Check if backend is available
async function checkBackendAvailable(): Promise<boolean> {
  try {
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' })
    return response.ok
  } catch {
    return false
  }
}

// API Functions
export async function getContacts(params?: {
  search?: string
  companyName?: string
  companyId?: string
  hasActiveDeals?: boolean
  hasClosedDeals?: boolean
}): Promise<Contact[]> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return []
  }

  const backendAvailable = await checkBackendAvailable()

  if (!backendAvailable) {
    // Return mock data with filtering
    let filtered = [...mockContacts]

    if (params?.search) {
      const searchLower = params.search.toLowerCase()
      filtered = filtered.filter(
        (contact) =>
          contact.fullName.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.phone?.includes(searchLower) ||
          contact.companyName?.toLowerCase().includes(searchLower)
      )
    }

    if (params?.companyName) {
      filtered = filtered.filter((contact) => contact.companyName === params.companyName)
    }

    if (params?.companyId) {
      filtered = filtered.filter((contact) => contact.companyId === params.companyId)
    }

    if (params?.hasActiveDeals !== undefined) {
      filtered = filtered.filter((contact) =>
        params.hasActiveDeals
          ? contact.stats.activeDeals > 0
          : contact.stats.activeDeals === 0
      )
    }

    if (params?.hasClosedDeals !== undefined) {
      filtered = filtered.filter((contact) =>
        params.hasClosedDeals
          ? contact.stats.closedDeals > 0
          : contact.stats.closedDeals === 0
      )
    }

    return filtered
  }

  // Real API call
  const token = localStorage.getItem('access_token')
  if (!token) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return []
  }

  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.append('search', params.search)
  if (params?.companyName) queryParams.append('companyName', params.companyName)
  if (params?.companyId) queryParams.append('companyId', params.companyId)
  if (params?.hasActiveDeals !== undefined)
    queryParams.append('hasActiveDeals', String(params.hasActiveDeals))
  if (params?.hasClosedDeals !== undefined)
    queryParams.append('hasClosedDeals', String(params.hasClosedDeals))

  try {
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/contacts?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // If unauthorized, redirect to login
      if (response.status === 401 || response.status === 403) {
        // Clear invalid token
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return []
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`Failed to fetch contacts: ${response.status} ${errorText}`)
      return [] // Return empty array instead of mock data
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return mockContacts // Return mock data instead of throwing
    }
    // For other errors, return mock data to prevent app crash
    console.error('Error fetching contacts:', error)
    return mockContacts
  }
}

export async function getContact(id: string): Promise<Contact> {
  const backendAvailable = await checkBackendAvailable()

  if (!backendAvailable) {
    const contact = mockContacts.find((c) => c.id === id)
    if (!contact) {
      throw new Error('Contact not found')
    }
    return contact
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch contact')
  }

  return response.json()
}

export async function getContactTasks(contactId: string): Promise<Task[]> {
  const backendAvailable = await checkBackendAvailable()

  if (!backendAvailable) {
    // Return mock tasks
    return []
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/contacts/${contactId}/tasks`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch contact tasks')
  }

  return response.json()
}

export async function createContact(data: CreateContactDto): Promise<Contact> {
  const backendAvailable = await checkBackendAvailable()

  if (!backendAvailable) {
    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      position: data.position,
      companyName: data.companyName,
      companyId: data.companyId,
      company: data.companyId
        ? mockCompanies.find((c) => c.id === data.companyId)
        : undefined,
      tags: data.tags || [],
      notes: data.notes,
      social: data.social,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deals: [],
      stats: {
        activeDeals: 0,
        closedDeals: 0,
        totalDeals: 0,
      },
    }
    mockContacts.push(newContact)
    return newContact
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create contact')
  }

  return response.json()
}

export async function updateContact(id: string, data: UpdateContactDto, dealId?: string): Promise<Contact> {
  const backendAvailable = await checkBackendAvailable()

  if (!backendAvailable) {
    const index = mockContacts.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new Error('Contact not found')
    }

    const updatedContact: Contact = {
      ...mockContacts[index],
      ...data,
      company: data.companyId
        ? mockCompanies.find((c) => c.id === data.companyId)
        : mockContacts[index].company,
      updatedAt: new Date().toISOString(),
    }

    mockContacts[index] = updatedContact
    return updatedContact
  }

  const API_BASE_URL = getApiBaseUrl()
  const updateData = dealId ? { ...data, dealId } : data
  console.log('[updateContact] Sending update data:', { id, updateData, dealId })
  const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(updateData),
  })

  if (!response.ok) {
    throw new Error('Failed to update contact')
  }

  return response.json()
}

export async function deleteContact(id: string): Promise<void> {
  const backendAvailable = await checkBackendAvailable()

  if (!backendAvailable) {
    const index = mockContacts.findIndex((c) => c.id === id)
    if (index !== -1) {
      mockContacts.splice(index, 1)
    }
    return
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete contact')
  }
}

export async function getCompanies(): Promise<Company[]> {
  const backendAvailable = await checkBackendAvailable()

  if (!backendAvailable) {
    return mockCompanies
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/companies`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch companies')
  }

  return response.json()
}

// Deal contact linking
export async function linkContactToDeal(dealId: string, contactId: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/deals/${dealId}/link-contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify({ contactId }),
  })

  if (!response.ok) {
    throw new Error('Failed to link contact to deal')
  }
}

export async function unlinkContactFromDeal(dealId: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/deals/${dealId}/unlink-contact`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to unlink contact from deal')
  }
}
