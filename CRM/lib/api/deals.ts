import { getApiBaseUrl } from '@/lib/config'

export interface Deal {
  id: string
  title: string
  number?: string
  amount: number
  stage?: {
    id: string
    name: string
  }
  stageId?: string // For updates
  contact?: {
    id: string
    fullName: string
    email?: string
  }
  company?: {
    id: string
    name: string
    industry?: string
  }
  assignedTo?: {
    id: string
    name: string
    avatar?: string
  }
  assignedToId?: string // For updates
  status?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export async function getDeals(params?: {
  search?: string
  pipelineId?: string
  stageId?: string
  assignedToId?: string
  contactId?: string
  companyId?: string
}): Promise<Deal[]> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return []
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('No access token found, returning empty deals list')
    return []
  }

  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.append('search', params.search)
  if (params?.pipelineId) queryParams.append('pipelineId', params.pipelineId)
  if (params?.stageId) queryParams.append('stageId', params.stageId)
  if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId)
  if (params?.contactId) queryParams.append('contactId', params.contactId)
  if (params?.companyId) queryParams.append('companyId', params.companyId)

  try {
    const API_BASE_URL = getApiBaseUrl()
    const url = `${API_BASE_URL}/deals?${queryParams.toString()}`
    console.log('Fetching deals from:', url)
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    console.log('Deals API response status:', response.status, response.statusText)

    if (!response.ok) {
      // If unauthorized, return empty array instead of throwing
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to fetch deals')
        return []
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Failed to fetch deals:', response.status, errorText)
      throw new Error(`Failed to fetch deals: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log('Deals API response data:', data.length, 'deals')
    return data
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Network error: Unable to reach the API server')
      return [] // Return empty array instead of throwing
    }
    // For other errors, still return empty array to prevent app crash
    console.error('Error fetching deals:', error)
    return []
  }
}

export async function getDeal(id: string): Promise<Deal> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/deals/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch deal')
  }

  return response.json()
}

export async function createDeal(data: {
  title: string
  amount?: number
  pipelineId: string
  stageId: string
  contactId?: string
  companyId?: string
  assignedToId?: string
  description?: string
}): Promise<Deal> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('createDeal can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  try {
    // Clean data to remove any circular references or non-serializable values
    const cleanData = {
      title: String(data.title || ''),
      amount: data.amount !== undefined ? Number(data.amount) : 0,
      pipelineId: String(data.pipelineId || ''),
      stageId: String(data.stageId || ''),
      contactId: data.contactId ? String(data.contactId) : undefined,
      companyId: data.companyId ? String(data.companyId) : undefined,
      assignedToId: data.assignedToId ? String(data.assignedToId) : undefined,
      description: data.description ? String(data.description) : undefined,
    }
    
    console.log('API: Creating deal with clean data:', cleanData)
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cleanData),
    })

    console.log('API: Deal creation response status:', response.status, response.statusText)

    if (!response.ok) {
      let errorMessage = 'Unknown error'
      try {
        const errorData = await response.json()
        // Handle NestJS error format
        if (errorData.message) {
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join(', ')
          } else {
            errorMessage = errorData.message
          }
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        // If JSON parsing fails, try text
        const errorText = await response.text().catch(() => 'Unknown error')
        errorMessage = errorText || `HTTP ${response.status} ${response.statusText}`
      }
      console.error('API: Error response:', response.status, errorMessage)
      throw new Error(`Failed to create deal: ${response.status} ${errorMessage}`)
    }

    const result = await response.json()
    console.log('API: Deal created successfully:', result?.id, result?.title, result?.amount)
    return result
  } catch (error) {
    // Log error without circular references
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('API: Error creating deal:', errorMessage)
    if (errorStack) {
      console.error('API: Error stack:', errorStack)
    }
    throw error
  }
}

export async function updateDeal(id: string, data: Partial<Deal> & { stageId?: string; assignedToId?: string }): Promise<Deal> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/deals/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update deal')
  }

  return response.json()
}

export async function deleteDeal(id: string): Promise<void> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/deals/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete deal')
  }
}

