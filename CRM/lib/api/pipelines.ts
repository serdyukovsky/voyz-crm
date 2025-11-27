const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface Stage {
  id: string
  name: string
  order: number
  color: string
  isDefault: boolean
  isClosed: boolean
  createdAt: string
  updatedAt: string
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  isDefault: boolean
  isActive: boolean
  order: number
  stages: Stage[]
  createdAt: string
  updatedAt: string
}

export interface CreatePipelineDto {
  name: string
  description?: string
  isDefault?: boolean
}

export interface UpdatePipelineDto {
  name?: string
  description?: string
  isDefault?: boolean
  isActive?: boolean
}

export interface CreateStageDto {
  name: string
  order: number
  color?: string
  isDefault?: boolean
  isClosed?: boolean
}

export interface UpdateStageDto {
  name?: string
  order?: number
  color?: string
  isDefault?: boolean
  isClosed?: boolean
}

export async function getPipelines(): Promise<Pipeline[]> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return []
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('No access token found, returning empty pipelines list')
    return []
  }

  try {
    console.log('Fetching pipelines from:', `${API_BASE_URL}/pipelines`)
    const response = await fetch(`${API_BASE_URL}/pipelines`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    console.log('Pipelines response status:', response.status, response.statusText)

    if (!response.ok) {
      // If unauthorized, clear token and throw error to trigger redirect
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to fetch pipelines - token may be invalid or expired')
        const errorText = await response.text().catch(() => 'Unauthorized')
        console.warn('Error details:', errorText)
        
        // Clear invalid token
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        // Throw error to trigger redirect in component
        throw new Error('UNAUTHORIZED')
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Failed to fetch pipelines:', response.status, errorText)
      throw new Error(`Failed to fetch pipelines: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log('Pipelines fetched successfully:', data.length, 'pipelines')
    return data
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Network error: Unable to reach the API server')
      return [] // Return empty array instead of throwing
    }
    // For other errors, still return empty array to prevent app crash
    console.error('Error fetching pipelines:', error)
    return []
  }
}

export async function getPipeline(id: string): Promise<Pipeline> {
  const response = await fetch(`${API_BASE_URL}/pipelines/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch pipeline')
  }

  return response.json()
}

export async function createPipeline(data: CreatePipelineDto): Promise<Pipeline> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('createPipeline can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  try {
    console.log('API: Creating pipeline with data:', data)
    const url = `${API_BASE_URL}/pipelines`
    console.log('API: POST URL:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    console.log('API: Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('API: Error response:', response.status, errorText)
      throw new Error(`Failed to create pipeline: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('API: Pipeline created successfully:', result)
    return result
  } catch (error) {
    console.error('API: Error creating pipeline:', error)
    if (error instanceof Error) {
      console.error('API: Error message:', error.message)
      console.error('API: Error stack:', error.stack)
    }
    throw error
  }
}

export async function updatePipeline(id: string, data: UpdatePipelineDto): Promise<Pipeline> {
  const response = await fetch(`${API_BASE_URL}/pipelines/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update pipeline')
  }

  return response.json()
}

export async function createStage(pipelineId: string, data: CreateStageDto): Promise<Stage> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('createStage can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  try {
    const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}/stages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to create stage: ${response.status} ${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error creating stage:', error)
    throw error
  }
}

export async function updateStage(id: string, data: UpdateStageDto): Promise<Stage> {
  const response = await fetch(`${API_BASE_URL}/stages/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update stage')
  }

  return response.json()
}

export async function deleteStage(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/stages/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete stage')
  }
}

export async function deletePipeline(id: string): Promise<void> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const response = await fetch(`${API_BASE_URL}/pipelines/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete pipeline')
  }
}

