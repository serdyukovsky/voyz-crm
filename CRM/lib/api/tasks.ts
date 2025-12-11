import { getApiBaseUrl } from '@/lib/config'

export interface Task {
  id: string
  title: string
  description?: string
  status?: string
  priority?: string
  deadline?: string
  deal?: {
    id: string
    title: string
  }
  contact?: {
    id: string
    fullName: string
  }
  assignedTo?: {
    id: string
    name: string
  }
  createdAt?: string
  updatedAt?: string
}

export async function getTasks(params?: {
  dealId?: string
  contactId?: string
  assignedToId?: string
  status?: string
}): Promise<Task[]> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return []
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('No access token found, redirecting to login')
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return []
  }

  const queryParams = new URLSearchParams()
  if (params?.dealId) queryParams.append('dealId', params.dealId)
  if (params?.contactId) queryParams.append('contactId', params.contactId)
  if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId)
  if (params?.status) queryParams.append('status', params.status)

  try {
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/tasks?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to fetch tasks - token may be invalid or expired')
        // Clear invalid token
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return []
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Failed to fetch tasks:', response.status, errorText)
      return [] // Return empty array instead of throwing
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return [] // Return empty array instead of throwing
  }
}

export async function getTask(id: string): Promise<Task> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch task')
  }

  return response.json()
}

export interface CreateTaskDto {
  title: string
  description?: string
  status?: string
  priority?: string
  type?: string
  deadline?: string
  dealId?: string
  contactId?: string
  assignedToId: string
}

export async function createTask(data: CreateTaskDto): Promise<Task> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('createTask can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  try {
    const API_BASE_URL = getApiBaseUrl()
    console.log('API: Creating task with data:', data)
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    console.log('API: Task creation response status:', response.status, response.statusText)

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to create task - token may be invalid or expired')
        const errorText = await response.text().catch(() => 'Unauthorized')
        console.warn('Error details:', errorText)
        
        // Clear invalid token
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        // Throw error to trigger redirect in component
        throw new Error('UNAUTHORIZED')
      }

      let errorMessage = 'Unknown error'
      try {
        const errorData = await response.json()
        // Handle NestJS validation error format
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
      console.error('API: Error creating task:', response.status, errorMessage)
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('API: Task created successfully:', result)
    return result
  } catch (error) {
    console.error('API: Error creating task:', error)
    if (error instanceof Error) {
      console.error('API: Error message:', error.message)
      console.error('API: Error stack:', error.stack)
    }
    throw error
  }
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: string
  priority?: string
  deadline?: string
  dealId?: string
  contactId?: string
  assignedToId?: string
  result?: string
}

export async function updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
  if (typeof window === 'undefined') {
    throw new Error('updateTask can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('API: No access token found - redirecting to login')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    
    throw new Error('No access token found')
  }

  try {
    const API_BASE_URL = getApiBaseUrl()
    console.log('API: Updating task with data:', { id, data })
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn('API: Unauthorized - redirecting to login')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        throw new Error('UNAUTHORIZED')
      }

      let errorMessage = 'Unknown error'
      try {
        const errorData = await response.json()
        if (errorData.message) {
          errorMessage = Array.isArray(errorData.message) 
            ? errorData.message.join(', ')
            : errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        const errorText = await response.text().catch(() => 'Unknown error')
        errorMessage = errorText || `HTTP ${response.status} ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    return response.json()
  } catch (error) {
    console.error('API: Error updating task:', error)
    throw error
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('deleteTask can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('API: No access token found - redirecting to login')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    
    throw new Error('No access token found')
  }

  try {
    const API_BASE_URL = getApiBaseUrl()
    console.log('API: Deleting task:', id)
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // 401 = Unauthorized (token invalid/expired) - redirect to login
      if (response.status === 401) {
        console.warn('API: Unauthorized - redirecting to login')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        throw new Error('UNAUTHORIZED')
      }

      // 403 = Forbidden (user authenticated but lacks permission) - show error, don't redirect
      if (response.status === 403) {
        let errorMessage = 'You do not have permission to delete this task'
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = Array.isArray(errorData.message) 
              ? errorData.message.join(', ')
              : errorData.message
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          const errorText = await response.text().catch(() => 'You do not have permission to delete this task')
          if (errorText && errorText !== 'Unknown error') {
            errorMessage = errorText
          }
        }
        throw new Error(errorMessage)
      }

      let errorMessage = 'Unknown error'
      try {
        const errorData = await response.json()
        if (errorData.message) {
          errorMessage = Array.isArray(errorData.message) 
            ? errorData.message.join(', ')
            : errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        const errorText = await response.text().catch(() => 'Unknown error')
        errorMessage = errorText || `HTTP ${response.status} ${response.statusText}`
      }
      throw new Error(errorMessage)
    }
  } catch (error) {
    console.error('API: Error deleting task:', error)
    throw error
  }
}






