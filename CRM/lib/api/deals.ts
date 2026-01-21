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

export interface PaginatedDealsResponse {
  data: Deal[]
  nextCursor?: string
  hasMore: boolean
  total?: number // Total count matching filters
}

export async function getDeals(params?: {
  search?: string
  pipelineId?: string
  stageId?: string
  assignedToId?: string
  contactId?: string
  companyId?: string
  limit?: number
  cursor?: string
}): Promise<PaginatedDealsResponse> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return { data: [], nextCursor: undefined, hasMore: false }
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    
    return { data: [], nextCursor: undefined, hasMore: false }
  }

  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.append('search', params.search)
  if (params?.pipelineId) queryParams.append('pipelineId', params.pipelineId)
  if (params?.stageId) queryParams.append('stageId', params.stageId)
  if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId)
  if (params?.contactId) queryParams.append('contactId', params.contactId)
  if (params?.companyId) queryParams.append('companyId', params.companyId)
  if (params?.limit) queryParams.append('limit', String(params.limit))
  if (params?.cursor) queryParams.append('cursor', params.cursor)

  try {
    const API_BASE_URL = getApiBaseUrl()
    const url = `${API_BASE_URL}/deals?${queryParams.toString()}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // If unauthorized, redirect to login
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        return { data: [], nextCursor: undefined, hasMore: false }
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Failed to fetch deals:', response.status, errorText)
      throw new Error(`Failed to fetch deals: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    // API always returns paginated response now
    if (data && typeof data === 'object' && 'data' in data && 'hasMore' in data) {
      return data as PaginatedDealsResponse
    }
    
    // Fallback: if somehow we get an array, convert it to paginated format
    if (Array.isArray(data)) {
      return {
        data: data,
        nextCursor: undefined,
        hasMore: false,
      }
    }
    
    // Fallback: return empty paginated response
    return {
      data: [],
      nextCursor: undefined,
      hasMore: false,
    }
  } catch (error) {
    console.error('Error fetching deals:', error)
    // Re-throw error so caller can handle it
    throw error
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
    
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cleanData),
    })

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
    return result
  } catch (error) {
    console.error('API: Error creating deal:', error)
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

export interface BulkDeleteRequest {
  mode: 'IDS' | 'FILTER'
  ids?: string[]
  excludedIds?: string[]
  filter?: {
    pipelineId?: string
    stageId?: string
    assignedToId?: string
    contactId?: string
    companyId?: string
    search?: string
  }
}

export interface BulkDeleteResponse {
  deletedCount: number
  failedCount: number
  errors?: Array<{ id: string; error: string }>
}

export async function bulkDeleteDeals(request: BulkDeleteRequest): Promise<BulkDeleteResponse> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/deals/bulk`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Failed to bulk delete deals: ${response.status} ${errorText}`)
  }

  return response.json()
}

export interface BulkAssignRequest {
  mode: 'IDS' | 'FILTER'
  ids?: string[]
  excludedIds?: string[]
  filter?: {
    pipelineId?: string
    stageId?: string
    assignedToId?: string
    contactId?: string
    companyId?: string
    search?: string
  }
  assignedToId?: string | null
}

export interface BulkAssignResponse {
  updatedCount: number
  failedCount: number
  errors?: Array<{ id: string; error: string }>
}

export async function bulkAssignDeals(request: BulkAssignRequest): Promise<BulkAssignResponse> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/deals/bulk-assignee`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Failed to bulk assign deals: ${response.status} ${errorText}`)
  }

  return response.json()
}

export async function getDealsCount(params?: {
  pipelineId?: string
  stageId?: string
  assignedToId?: string
  contactId?: string
  companyId?: string
  search?: string
}): Promise<number> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const queryParams = new URLSearchParams()
  if (params?.pipelineId) queryParams.append('pipelineId', params.pipelineId)
  if (params?.stageId) queryParams.append('stageId', params.stageId)
  if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId)
  if (params?.contactId) queryParams.append('contactId', params.contactId)
  if (params?.companyId) queryParams.append('companyId', params.companyId)
  if (params?.search) queryParams.append('search', params.search)

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/deals/count?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get deals count')
  }

  const data = await response.json()
  return data.count || 0
}
