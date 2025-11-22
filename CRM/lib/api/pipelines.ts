const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

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
    const response = await fetch(`${API_BASE_URL}/pipelines`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // If unauthorized, return empty array instead of throwing
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to fetch pipelines')
        return []
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to fetch pipelines: ${response.status} ${errorText}`)
    }

    return response.json()
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
  const response = await fetch(`${API_BASE_URL}/pipelines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create pipeline')
  }

  return response.json()
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
  const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}/stages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create stage')
  }

  return response.json()
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

