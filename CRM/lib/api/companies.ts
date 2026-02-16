import { getApiBaseUrl } from '@/lib/config'

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

  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('No access token found - redirecting to login')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    if (typeof window !== 'undefined') {
      window.location.href = '/app/login'
    }
    
    return []
  }

  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.append('search', params.search)
  if (params?.industry) queryParams.append('industry', params.industry)

  try {
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/companies?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // If unauthorized, redirect to login
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to fetch companies - redirecting to login')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        if (typeof window !== 'undefined') {
          window.location.href = '/app/login'
        }
        
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
  const API_BASE_URL = getApiBaseUrl()
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
  const API_BASE_URL = getApiBaseUrl()
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
  const API_BASE_URL = getApiBaseUrl()
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
  const API_BASE_URL = getApiBaseUrl()
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

