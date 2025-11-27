const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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

  const response = await fetch(`${API_BASE_URL}/activities?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch activities')
  }

  return response.json()
}

