import { getApiBaseUrl } from '@/lib/config'
import { apiFetch, NetworkError } from './api-client'

export interface LoginDto {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  permissions?: string[]
  avatarColor?: string | null
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  user: User
}

export async function login(credentials: LoginDto): Promise<LoginResponse> {
  try {
    // Normalize email (lowercase and trim)
    const normalizedCredentials = {
      ...credentials,
      email: credentials.email.toLowerCase().trim(),
    }
    
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedCredentials),
    })

    if (!response.ok) {
      let errorMessage = 'Login failed'
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        
        // Add status code to error message for debugging
        if (response.status === 401) {
          errorMessage = 'Invalid email or password'
        } else if (response.status === 404) {
          errorMessage = 'API endpoint not found. Is the backend running?'
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.'
        }
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }
      
      throw new Error(errorMessage)
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const apiUrl = getApiBaseUrl()
      throw new Error(`Cannot connect to server at ${apiUrl}. Please check your VITE_API_URL configuration and ensure the backend is running.`)
    }
    throw error
  }
}

/**
 * Get current authenticated user
 * Returns user if token is valid, throws error if token is expired/invalid
 * Throws NetworkError if backend is unavailable (does not clear auth state)
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const response = await apiFetch('/auth/me')
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('Failed to get current user')
    }
    
    return response.json()
  } catch (error) {
    // Re-throw NetworkError as-is (preserves auth state)
    if (error instanceof NetworkError) {
      throw error
    }
    
    // For other errors during fetch (network issues), throw NetworkError
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new NetworkError('Cannot connect to backend server')
    }
    
    // Re-throw other errors
    throw error
  }
}

export async function logout() {
  // Try to call logout API before clearing tokens
  try {
    const token = localStorage.getItem('access_token')
    if (token) {
      const API_BASE_URL = getApiBaseUrl()
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      
      // Check if response is ok, but don't throw error if it fails
      if (!response.ok) {
        console.warn('Logout API call failed, but clearing tokens anyway')
      }
    }
  } catch (error) {
    // Ignore errors - we'll clear tokens anyway
    console.warn('Logout API call error:', error)
  }
  
  // Always clear tokens from localStorage
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  localStorage.removeItem('user_id')
  localStorage.removeItem('userId')
}

/**
 * Refresh access token using refresh token from HttpOnly cookie
 * Returns new access token
 */
export async function refreshToken(): Promise<{ access_token: string }> {
  try {
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies (refresh token is in HttpOnly cookie)
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Refresh token expired or invalid
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()
    
    // Update access token in localStorage
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token)
    }
    
    return data
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new NetworkError('Cannot connect to server')
    }
    throw error
  }
}

// Legacy function - kept for backward compatibility but should not be used
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('access_token')
}
