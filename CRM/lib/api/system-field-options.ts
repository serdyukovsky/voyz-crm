import { getApiBaseUrl } from '@/lib/config'
import { apiFetch } from './api-client'

const API_BASE_URL = getApiBaseUrl()

/**
 * Get available options for a system field
 */
export async function getSystemFieldOptions(
  entityType: 'deal' | 'contact',
  fieldName: string,
): Promise<string[]> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  try {
    const response = await apiFetch(
      `/system-field-options?entityType=${entityType}&fieldName=${fieldName}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Failed to get system field options: ${response.statusText}`)
    }

    const data = await response.json()
    return data.options || []
  } catch (error) {
    console.error(`[GET SYSTEM FIELD OPTIONS] Error getting options for ${entityType}.${fieldName}:`, error)
    throw error
  }
}

/**
 * Add a new option to a system field
 */
export async function addSystemFieldOption(
  entityType: 'deal' | 'contact',
  fieldName: string,
  option: string,
): Promise<string[]> {
  const token = localStorage.getItem('access_token')
  if (!token) throw new Error('No access token found')

  const response = await apiFetch(
    `/system-field-options/add?entityType=${entityType}&fieldName=${fieldName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ option }),
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(errorData.message || 'Failed to add option')
  }

  const data = await response.json()
  return data.options || []
}

/**
 * Remove an option from a system field
 */
export async function removeSystemFieldOption(
  entityType: 'deal' | 'contact',
  fieldName: string,
  option: string,
): Promise<string[]> {
  const token = localStorage.getItem('access_token')
  if (!token) throw new Error('No access token found')

  const response = await apiFetch(
    `/system-field-options/remove?entityType=${entityType}&fieldName=${fieldName}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ option }),
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(errorData.message || 'Failed to remove option')
  }

  const data = await response.json()
  return data.options || []
}
