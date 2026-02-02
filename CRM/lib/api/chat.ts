import { getApiBaseUrl } from '../config'

export interface ChatThread {
  id: string
  title?: string
  dealId?: string
  deal?: {
    id: string
    title: string
    number: string
  }
  taskId?: string
  task?: {
    id: string
    title: string
  }
  participants: Array<{
    id: string
    name: string
    email: string
    avatar?: string
    joinedAt: string
    lastReadAt?: string
  }>
  messages?: ChatMessage[]
  lastMessage?: ChatMessage
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  threadId: string
  content: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
  recipient?: {
    id: string
    name: string
    avatar?: string
  }
  dealId?: string
  deal?: {
    id: string
    title: string
    number: string
  }
  taskId?: string
  task?: {
    id: string
    title: string
  }
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface CreateThreadDto {
  dealId?: string
  taskId?: string
  title?: string
  participantIds: string[]
}

export interface SendMessageDto {
  content: string
  recipientId?: string
  dealId?: string
  taskId?: string
}

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function getOrCreateThread(dto: CreateThreadDto): Promise<ChatThread> {
  const response = await fetch(`${getApiBaseUrl()}/chat/threads`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get or create thread' }))
    console.error('API error:', error, 'Status:', response.status)
    throw new Error(error.message || `Failed to get or create thread: ${response.status}`)
  }

  const data = await response.json()
  console.log('Thread created/found:', data)
  return data
}

export async function getUserThreads(): Promise<ChatThread[]> {
  const response = await fetch(`${getApiBaseUrl()}/chat/threads`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch threads')
  }

  return response.json()
}

export async function getThread(threadId: string): Promise<ChatThread> {
  const response = await fetch(`${getApiBaseUrl()}/chat/threads/${threadId}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch thread')
  }

  return response.json()
}

export async function sendMessage(
  threadId: string,
  dto: SendMessageDto,
): Promise<ChatMessage> {
  const response = await fetch(`${getApiBaseUrl()}/chat/threads/${threadId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  })

  if (!response.ok) {
    throw new Error('Failed to send message')
  }

  return response.json()
}
