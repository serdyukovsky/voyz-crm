const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Check if backend is available
async function checkBackendAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

export interface Company {
  id: string
  name: string
  industry?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  employees?: number
  stats?: {
    totalDeals: number
    activeDeals: number
    closedDeals: number
    totalDealVolume: number
  }
}

export async function getCompanies(params?: {
  search?: string
  industry?: string
}): Promise<Company[]> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return []
  }

  const backendAvailable = await checkBackendAvailable()
  
  if (!backendAvailable) {
    // Return empty array if backend is not available (filters will be empty)
    console.warn('Backend not available, returning empty companies list')
    return []
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('No access token found, returning empty companies list')
    return []
  }

  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.append('search', params.search)
  if (params?.industry) queryParams.append('industry', params.industry)

  try {
    const response = await fetch(`${API_BASE_URL}/companies?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // If unauthorized, return empty array instead of throwing
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to fetch companies')
        return []
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to fetch companies: ${response.status} ${errorText}`)
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Network error: Unable to reach the API server')
      return [] // Return empty array instead of throwing
    }
    // For other errors, still return empty array to prevent app crash
    console.error('Error fetching companies:', error)
    return []
  }
}

export async function getCompany(id: string): Promise<Company> {
  const response = await fetch(`${API_BASE_URL}/companies/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch company')
  }

  return response.json()
}

export interface CreateCompanyDto {
  name: string
  industry?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  employees?: number
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {}

export async function createCompany(data: CreateCompanyDto): Promise<Company> {
  const response = await fetch(`${API_BASE_URL}/companies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create company')
  }

  return response.json()
}

export async function updateCompany(id: string, data: UpdateCompanyDto): Promise<Company> {
  const response = await fetch(`${API_BASE_URL}/companies/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update company')
  }

  return response.json()
}

export async function deleteCompany(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/companies/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete company')
  }
}

