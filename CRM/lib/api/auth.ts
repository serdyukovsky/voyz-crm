const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface LoginDto {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
}

export async function login(credentials: LoginDto): Promise<LoginResponse> {
  try {
    // Normalize email (lowercase and trim)
    const normalizedCredentials = {
      ...credentials,
      email: credentials.email.toLowerCase().trim(),
    }
    
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
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:3001')
    }
    throw error
  }
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('access_token')
}

