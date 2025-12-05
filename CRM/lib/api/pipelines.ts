import { getApiBaseUrl } from '@/lib/config'

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
    const API_BASE_URL = getApiBaseUrl()
    console.log('Fetching pipelines from:', `${API_BASE_URL}/pipelines`)
    const response = await fetch(`${API_BASE_URL}/pipelines`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    console.log('Pipelines response status:', response.status, response.statusText)

    if (!response.ok) {
      // If unauthorized, clear token and redirect to login
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to fetch pipelines - token may be invalid or expired')
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
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Failed to fetch pipelines:', response.status, errorText)
      throw new Error(`Failed to fetch pipelines: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log('Pipelines fetched successfully:', data.length, 'pipelines')
    // Ensure stages array exists for each pipeline
    const pipelinesWithStages = data.map((pipeline: any) => ({
      ...pipeline,
      stages: pipeline.stages || []
    }))
    // Log stages for debugging
    pipelinesWithStages.forEach((pipeline: any, index: number) => {
      console.log(`Pipeline ${index + 1}:`, {
        id: pipeline.id,
        name: pipeline.name,
        stagesCount: pipeline.stages?.length || 0,
        hasStages: !!pipeline.stages,
        stages: pipeline.stages || [],
        rawStages: pipeline.stages
      })
      // Log full pipeline object for debugging
      if (pipeline.stages && pipeline.stages.length > 0) {
        console.log(`Pipeline ${index + 1} stages details:`, JSON.stringify(pipeline.stages, null, 2))
      } else {
        console.warn(`Pipeline ${index + 1} has NO stages!`, pipeline)
      }
    })
    return pipelinesWithStages
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
  const API_BASE_URL = getApiBaseUrl()
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
    const API_BASE_URL = getApiBaseUrl()
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
      console.error('API: Error response:', response.status, errorMessage)
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('API: Pipeline created successfully:', result)
    // Ensure stages array exists
    const pipelineWithStages = {
      ...result,
      stages: result.stages || []
    }
    console.log('API: Pipeline with stages:', pipelineWithStages)
    return pipelineWithStages
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
  const API_BASE_URL = getApiBaseUrl()
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
    const API_BASE_URL = getApiBaseUrl()
    console.log('API: Creating stage with data:', { pipelineId, data })
    const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}/stages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    console.log('API: Stage creation response status:', response.status, response.statusText)

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to create stage - token may be invalid or expired')
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
      console.error('API: Error creating stage:', response.status, errorMessage)
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('API: Stage created successfully:', result)
    return result
  } catch (error) {
    console.error('API: Error creating stage:', error)
    if (error instanceof Error) {
      console.error('API: Error message:', error.message)
      console.error('API: Error stack:', error.stack)
    }
    throw error
  }
}

export async function updateStage(id: string, data: UpdateStageDto): Promise<Stage> {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('updateStage can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  try {
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/stages/${id}`, {
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
        console.warn('Unauthorized to update stage - token may be invalid or expired')
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
      console.error('API: Error updating stage:', response.status, errorMessage)
      throw new Error(errorMessage)
    }

    return response.json()
  } catch (error) {
    console.error('API: Error updating stage:', error)
    if (error instanceof Error) {
      console.error('API: Error message:', error.message)
      console.error('API: Error stack:', error.stack)
    }
    throw error
  }
}

export async function deleteStage(id: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
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

  const API_BASE_URL = getApiBaseUrl()
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

