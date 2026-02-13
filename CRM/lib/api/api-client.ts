import { getApiBaseUrl } from '../config'
import { refreshToken } from './auth'

export class UnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

// Global handler for 401 responses
let globalUnauthorizedHandler: (() => void) | null = null

// Guard to ensure logout is only triggered once per session
let isHandlingUnauthorized = false

// Guard to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

/**
 * Set global handler for 401 unauthorized responses
 * This will be called whenever any API request returns 401
 */
export function setGlobalUnauthorizedHandler(handler: () => void) {
  globalUnauthorizedHandler = handler
}

/**
 * Reset the unauthorized handler guard (for testing purposes)
 */
export function resetUnauthorizedHandlerGuard() {
  isHandlingUnauthorized = false
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error') {
    super(message)
    this.name = 'NetworkError'
  }
}

// Global handler for backend unavailable state
let globalBackendUnavailableHandler: ((isUnavailable: boolean) => void) | null = null

/**
 * Set global handler for backend unavailable state
 */
export function setGlobalBackendUnavailableHandler(handler: (isUnavailable: boolean) => void) {
  globalBackendUnavailableHandler = handler
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
  
  console.log('API Request:', { endpoint, url, API_BASE_URL })
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies (for refresh token)
    })
    
    console.log('API Response:', { url, status: response.status, ok: response.ok })

    // Notify backend is available if we got a response (even if error status)
    if (globalBackendUnavailableHandler) {
      globalBackendUnavailableHandler(false)
    }

    // Check for authentication errors - try refresh token first, then logout
    if (response.status === 401) {
      // Try to refresh token first
      try {
        // Wait for any ongoing refresh to complete
        if (refreshPromise) {
          const newToken = await refreshPromise
          if (newToken) {
            // Retry the original request with new token
            const retryHeaders: HeadersInit = {
              'Content-Type': 'application/json',
              ...options.headers,
              'Authorization': `Bearer ${newToken}`,
            }
            
            const retryResponse = await fetch(url, {
              ...options,
              headers: retryHeaders,
              credentials: 'include', // Include cookies for retry
            })
            
            // If retry succeeds, return the response
            if (retryResponse.ok || retryResponse.status !== 401) {
              return retryResponse
            }
          }
        } else if (!isRefreshing) {
          // Start refresh process
          isRefreshing = true
          refreshPromise = refreshToken()
            .then((result) => {
              isRefreshing = false
              return result.access_token
            })
            .catch((error) => {
              isRefreshing = false
              console.error('Failed to refresh token:', error)
              return null
            })
          
          const newToken = await refreshPromise
          refreshPromise = null
          
          if (newToken) {
            // Retry the original request with new token
            const retryHeaders: HeadersInit = {
              'Content-Type': 'application/json',
              ...options.headers,
              'Authorization': `Bearer ${newToken}`,
            }
            
            const retryResponse = await fetch(url, {
              ...options,
              headers: retryHeaders,
              credentials: 'include', // Include cookies for retry
            })
            
            // If retry succeeds, return the response
            if (retryResponse.ok || retryResponse.status !== 401) {
              return retryResponse
            }
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        // Continue to logout logic below
      }
      
      // If refresh failed or retry still returned 401, logout
      // Only handle unauthorized once per session to prevent multiple logouts
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true
        
        // Clear invalid tokens immediately
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        localStorage.removeItem('user_id')
        localStorage.removeItem('userId')
        
        // Call global handler if set (e.g., from AuthContext)
        // This will trigger logout, which is idempotent
        if (globalUnauthorizedHandler) {
          globalUnauthorizedHandler()
        } else {
          // Fallback: redirect to login if no handler is set
          // Only redirect if not already on /login
          if (typeof window !== 'undefined' && window.location.pathname !== '/app/login') {
            window.location.href = '/app/login'
          }
        }
        
        // Reset guard after a delay to allow logout to complete
        // This prevents infinite loops but allows recovery if needed
        setTimeout(() => {
          isHandlingUnauthorized = false
        }, 1000)
      }
      
      throw new UnauthorizedError()
    }

    // Also handle 403, but don't clear tokens (might be permission issue)
    if (response.status === 403) {
      throw new Error('Insufficient permissions')
    }

    return response
  } catch (error) {
    // If it's already an UnauthorizedError, just re-throw (this triggers logout)
    if (error instanceof UnauthorizedError) {
      throw error
    }
    
    // For network errors (connection refused, timeout, etc.)
    // DO NOT logout - this is an infrastructure issue, not auth failure
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('API: Network error - cannot reach server (backend may be down)')
      
      // Notify backend is unavailable
      if (globalBackendUnavailableHandler) {
        globalBackendUnavailableHandler(true)
      }
      
      // Throw NetworkError - this does NOT trigger logout
      throw new NetworkError('Cannot connect to server. The backend may be temporarily unavailable.')
    }
    
    // For other errors, re-throw as-is
    throw error
  }
}




