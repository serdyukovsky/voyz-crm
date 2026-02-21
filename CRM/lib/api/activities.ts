import { getApiBaseUrl } from '@/lib/config'

export type ActivityType =
  | 'DEAL_CREATED'
  | 'DEAL_UPDATED'
  | 'DEAL_DELETED'
  | 'FIELD_UPDATED'
  | 'STAGE_CHANGED'
  | 'CONTACT_LINKED'
  | 'CONTACT_UNLINKED'
  | 'CONTACT_UPDATED_IN_DEAL'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  | 'ASSIGNEE_CHANGED'
  | 'TAG_ADDED'
  | 'TAG_REMOVED'
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_DELETED'
  | 'COMPANY_CREATED'
  | 'COMPANY_UPDATED'
  | 'COMPANY_DELETED'
  | 'EMAIL_SENT'
  | 'LOGIN'
  | 'LOGOUT'

export interface Activity {
  id: string
  type: ActivityType
  dealId?: string
  taskId?: string
  contactId?: string
  userId: string
  payload?: Record<string, any>
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string
    avatarColor?: string | null
  }
  deal?: {
    id: string
    title: string
  }
  contact?: {
    id: string
    fullName: string
  }
  task?: {
    id: string
    title: string
  }
  // Parsed from payload for display
  fieldName?: string
  oldValue?: any
  newValue?: any
  message?: string
}

export interface ActivityFilters {
  entityType?: 'deal' | 'contact' | 'company' | 'task'
  entityId?: string
  type?: ActivityType
  startDate?: string
  endDate?: string
}

export async function getActivities(filters?: ActivityFilters): Promise<Activity[]> {
  const queryParams = new URLSearchParams()
  
  if (filters?.entityType) queryParams.append('entityType', filters.entityType)
  if (filters?.entityId) queryParams.append('entityId', filters.entityId)
  if (filters?.type) queryParams.append('type', filters.type)
  if (filters?.startDate) queryParams.append('startDate', filters.startDate)
  if (filters?.endDate) queryParams.append('endDate', filters.endDate)

  const API_BASE_URL = getApiBaseUrl()
  const url = `${API_BASE_URL}/activities?${queryParams.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('Failed to fetch activities:', response.status, errorText)
    throw new Error(`Failed to fetch activities: ${response.status} ${errorText}`)
  }

  const data = await response.json()

  // Transform activities to extract payload data for display
  const transformedActivities = data.map((activity: Activity) => {
    const transformed = { ...activity }

    // Parse payload for field update activities
    if (activity.payload && typeof activity.payload === 'object') {
      if ((activity as any).payload.field) {
        transformed.fieldName = (activity as any).payload.field
      }
      if ((activity as any).payload.oldValue !== undefined) {
        transformed.oldValue = (activity as any).payload.oldValue
      }
      if ((activity as any).payload.newValue !== undefined) {
        transformed.newValue = (activity as any).payload.newValue
      }
      if ((activity as any).payload.message) {
        transformed.message = (activity as any).payload.message
      }
    }

    return transformed
  })

  return transformedActivities
}

