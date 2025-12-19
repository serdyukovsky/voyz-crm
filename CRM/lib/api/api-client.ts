import { getApiBaseUrl } from '../config'

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
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    // Notify backend is available if we got a response (even if error status)
    if (globalBackendUnavailableHandler) {
      globalBackendUnavailableHandler(false)
    }

    // Check for authentication errors - ONLY logout on HTTP 401
    if (response.status === 401) {
      // Only handle unauthorized once per session to prevent multiple logouts
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true
        console.warn('API: Unauthorized request (401) - token expired or invalid')
        
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
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        
        // Reset guard after a delay to allow logout to complete
        // This prevents infinite loops but allows recovery if needed
        setTimeout(() => {
          isHandlingUnauthorized = false
        }, 1000)
      } else {
        console.warn('API: Unauthorized request (401) - already handling, skipping duplicate logout')
      }
      
      throw new UnauthorizedError()
    }

    // Also handle 403, but don't clear tokens (might be permission issue)
    if (response.status === 403) {
      console.warn('API: Forbidden request (403) - insufficient permissions')
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




