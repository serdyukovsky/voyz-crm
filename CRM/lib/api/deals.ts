const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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
    const response = await fetch(`${API_BASE_URL}/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to create deal: ${response.status} ${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error creating deal:', error)
    throw error
  }
}

export async function updateDeal(id: string, data: Partial<Deal> & { stageId?: string; assignedToId?: string }): Promise<Deal> {
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

