import { getApiBaseUrl } from '@/lib/config'

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'EMAIL' | 'PHONE' | 'URL'

export interface CustomField {
  id: string
  name: string
  key: string
  type: CustomFieldType
  entityType: string
  group?: string
  isRequired: boolean
  isActive: boolean
  options?: {
    options?: string[]
  }
  order: number
  createdAt: string
  updatedAt: string
}

export interface CreateCustomFieldDto {
  name: string
  key?: string
  type: CustomFieldType
  entityType: 'contact' | 'deal'
  group?: string
  isRequired?: boolean
  options?: string[]
}

/**
 * Создание кастомного поля
 */
export async function createCustomField(dto: CreateCustomFieldDto): Promise<CustomField> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  let url = `${getApiBaseUrl()}/custom-fields`
  if (!getApiBaseUrl().includes('/api')) {
    url = `${getApiBaseUrl()}/api/custom-fields`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create custom field' }))
    throw new Error(error.message || `Failed to create custom field: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Получение кастомных полей по типу сущности
 */
export async function getCustomFields(entityType: 'contact' | 'deal'): Promise<CustomField[]> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  let url = `${getApiBaseUrl()}/custom-fields?entityType=${entityType}`
  if (!getApiBaseUrl().includes('/api')) {
    url = `${getApiBaseUrl()}/api/custom-fields?entityType=${entityType}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch custom fields' }))
    throw new Error(error.message || `Failed to fetch custom fields: ${response.statusText}`)
  }

  return response.json()
}

