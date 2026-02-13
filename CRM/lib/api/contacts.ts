import { Contact, CreateContactDto, UpdateContactDto, Company, Task } from '@/types/contact'

// Re-export types for easier imports
export type { Contact, CreateContactDto, UpdateContactDto, Company, Task }

import { getApiBaseUrl } from '@/lib/config'


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
      console.warn('Network error: Unable to reach the API server')
      return []
    }
    console.error('Error fetching contacts:', error)
    return []
  }
}

export async function getContact(id: string): Promise<Contact> {
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
