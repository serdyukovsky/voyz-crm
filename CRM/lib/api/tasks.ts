const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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
  const queryParams = new URLSearchParams()
  if (params?.dealId) queryParams.append('dealId', params.dealId)
  if (params?.contactId) queryParams.append('contactId', params.contactId)
  if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId)
  if (params?.status) queryParams.append('status', params.status)

  const response = await fetch(`${API_BASE_URL}/tasks?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch tasks')
  }

  return response.json()
}

export async function getTask(id: string): Promise<Task> {
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





