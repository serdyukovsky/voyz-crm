import { getApiBaseUrl } from '@/lib/config'

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName?: string
  avatar?: string
  avatarColor?: string | null
  phone?: string
  telegramUsername?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserDto {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  telegramUsername?: string
  role?: UserRole
  isActive?: boolean
}

export interface UpdateUserDto {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  role?: UserRole
  isActive?: boolean
  avatar?: string
  avatarColor?: string
}

export async function getUsers(): Promise<User[]> {
  if (typeof window === 'undefined') {
    return []
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    if (typeof window !== 'undefined') {
      window.location.href = '/app/login'
    }
    
    return []
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      
      if (typeof window !== 'undefined') {
        window.location.href = '/app/login'
      }
      
      throw new Error('UNAUTHORIZED')
    }
    throw new Error('Failed to fetch users')
  }

  return response.json()
}

export async function getUser(id: string): Promise<User> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }

  return response.json()
}

export async function getMyProfile(): Promise<User> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot fetch profile on server side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    if (typeof window !== 'undefined') {
      window.location.href = '/app/login'
    }
    
    throw new Error('UNAUTHORIZED')
  }

  const API_BASE_URL = getApiBaseUrl()
  const url = `${API_BASE_URL}/users/me`
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      
      if (typeof window !== 'undefined') {
        window.location.href = '/app/login'
      }
      
      throw new Error('UNAUTHORIZED')
    }
    
    const error = await response.json().catch(() => ({ message: 'Failed to fetch profile' }))
    throw new Error(error.message || 'Failed to fetch profile')
  }

  const data = await response.json()
  return data
}

export async function createUser(data: CreateUserDto): Promise<User> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create user' }))
    throw new Error(error.message || 'Failed to create user')
  }

  return response.json()
}

export async function updateUser(id: string, data: UpdateUserDto): Promise<User> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update user' }))
    throw new Error(error.message || 'Failed to update user')
  }

  return response.json()
}

export async function updateMyProfile(data: UpdateUserDto): Promise<User> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update profile on server side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    if (typeof window !== 'undefined') {
      window.location.href = '/app/login'
    }
    
    throw new Error('UNAUTHORIZED')
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      console.warn('Unauthorized to update profile - redirecting to login')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      
      if (typeof window !== 'undefined') {
        window.location.href = '/app/login'
      }
      
      throw new Error('UNAUTHORIZED')
    }
    
    const error = await response.json().catch(() => ({ message: 'Failed to update profile' }))
    throw new Error(error.message || 'Failed to update profile')
  }

  return response.json()
}

export async function deleteUser(id: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete user')
  }
}






