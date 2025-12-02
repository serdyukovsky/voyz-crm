import { getApiBaseUrl } from '@/lib/config'

export type CommentType = 'COMMENT' | 'INTERNAL_NOTE' | 'CLIENT_MESSAGE'

export interface Comment {
  id: string
  content: string
  type: CommentType
  dealId?: string
  taskId?: string
  contactId?: string
  userId: string
  user: {
    id: string
    name?: string
    fullName?: string
    email: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateCommentDto {
  content: string
  type?: CommentType
  dealId?: string
  taskId?: string
  contactId?: string
}

export async function createComment(data: CreateCommentDto): Promise<Comment> {
  if (typeof window === 'undefined') {
    throw new Error('createComment can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  try {
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: data.content,
        type: data.type || 'COMMENT',
        dealId: data.dealId,
        taskId: data.taskId,
        contactId: data.contactId,
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Unknown error'
      try {
        const errorData = await response.json()
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
        const errorText = await response.text().catch(() => 'Unknown error')
        errorMessage = errorText || `HTTP ${response.status} ${response.statusText}`
      }
      throw new Error(`Failed to create comment: ${response.status} ${errorMessage}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error creating comment:', error)
    throw error
  }
}

export async function getDealComments(dealId: string): Promise<Comment[]> {
  if (typeof window === 'undefined') {
    return []
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('No access token found, returning empty comments list')
    return []
  }

  try {
    const API_BASE_URL = getApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/comments/deal/${dealId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        throw new Error('UNAUTHORIZED')
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Failed to fetch comments:', response.status, errorText)
      return []
    }

    const data = await response.json()
    return data || []
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Network error: Unable to reach the API server')
      return []
    }
    console.error('Error fetching comments:', error)
    return []
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('deleteComment can only be called on the client side')
  }

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete comment')
  }
}


