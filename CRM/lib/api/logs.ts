import { getApiBaseUrl } from '@/lib/config'

export interface Log {
  id: string
  level: string
  action: string
  entity?: string | null
  entityId?: string | null
  userId?: string | null
  message: string
  metadata?: Record<string, any> | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

export interface LogFilters {
  level?: string
  action?: string
  entity?: string
  entityId?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export async function getLogs(filters?: LogFilters): Promise<Log[]> {
  const token = localStorage.getItem('access_token')
  
  if (!token) {
    console.warn('No access token found, returning empty logs')
    return []
  }

  const queryParams = new URLSearchParams()
  
  if (filters?.level) queryParams.append('level', filters.level)
  if (filters?.action) queryParams.append('action', filters.action)
  if (filters?.entity) queryParams.append('entity', filters.entity)
  if (filters?.entityId) queryParams.append('entityId', filters.entityId)
  if (filters?.userId) queryParams.append('userId', filters.userId)
  if (filters?.startDate) queryParams.append('startDate', filters.startDate)
  if (filters?.endDate) queryParams.append('endDate', filters.endDate)

  try {
    const API_BASE_URL = getApiBaseUrl()
    const url = `${API_BASE_URL}/logs?${queryParams.toString()}`
    console.log('Fetching logs from:', url)
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    console.log('Logs API response status:', response.status, response.statusText)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized to fetch logs')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return []
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Failed to fetch logs:', response.status, errorText)
      throw new Error(`Failed to fetch logs: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log('Logs API response data:', data.length, 'logs')
    console.log('Sample log:', data[0] || 'No logs')
    return Array.isArray(data) ? data : []
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Network error: Unable to reach the API server')
      return []
    }
    console.error('Error fetching logs:', error)
    return []
  }
}

