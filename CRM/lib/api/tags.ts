import { apiFetch } from './api-client'

export interface Tag {
  id: string
  name: string
  color: string
}

export async function getTags(): Promise<Tag[]> {
  const token = localStorage.getItem('access_token')
  if (!token) throw new Error('No access token found')

  const response = await apiFetch('/tags', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get tags')
  }

  return response.json()
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  const token = localStorage.getItem('access_token')
  if (!token) throw new Error('No access token found')

  const response = await apiFetch('/tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, color }),
  })

  if (!response.ok) {
    throw new Error('Failed to create tag')
  }

  return response.json()
}

export async function updateTagColor(name: string, color: string): Promise<Tag> {
  const token = localStorage.getItem('access_token')
  if (!token) throw new Error('No access token found')

  const response = await apiFetch(`/tags/${encodeURIComponent(name)}/color`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ color }),
  })

  if (!response.ok) {
    throw new Error('Failed to update tag color')
  }

  return response.json()
}

export async function deleteTag(name: string): Promise<void> {
  const token = localStorage.getItem('access_token')
  if (!token) throw new Error('No access token found')

  const response = await apiFetch(`/tags/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete tag')
  }
}
