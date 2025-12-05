import { getApiBaseUrl } from '../config'

export class UnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('access_token')
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const API_BASE_URL = getApiBaseUrl()
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      console.warn('API: Unauthorized request - token expired or invalid')
      
      // Clear invalid tokens
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      throw new UnauthorizedError()
    }

    return response
  } catch (error) {
    // If it's already an UnauthorizedError, just re-throw
    if (error instanceof UnauthorizedError) {
      throw error
    }
    
    // For network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('API: Network error - cannot reach server')
      throw new Error('Cannot connect to server. Please check your connection.')
    }
    
    throw error
  }
}


