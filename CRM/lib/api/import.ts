import { getApiBaseUrl } from '@/lib/config'

const API_BASE_URL = getApiBaseUrl()

export interface ImportField {
  key: string
  label: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'multi-select' | 'boolean' | 'text'
  description?: string
  options?: Array<{ value: string; label: string }>
  group?: string
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color?: string
  isDefault?: boolean
  isClosed?: boolean
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  isDefault: boolean
  isActive: boolean
  stages: PipelineStage[]
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  fullName: string
}

export interface ContactsImportMeta {
  systemFields: ImportField[]
  customFields: ImportField[]
  users: User[]
}

export interface DealsImportMeta {
  systemFields: ImportField[]
  customFields: ImportField[]
  pipelines: Pipeline[]
  users: User[]
}

export type ImportMeta = ContactsImportMeta | DealsImportMeta

// Legacy compatibility - combine all fields
export function getAllFields(meta: ImportMeta | any): ImportField[] {
  // Handle new structure with systemFields and/or customFields
  if (meta.systemFields !== undefined || meta.customFields !== undefined) {
    const systemFieldsArray = Array.isArray(meta.systemFields) ? meta.systemFields : []
    const customFieldsArray = Array.isArray(meta.customFields) ? meta.customFields : []
    return [...systemFieldsArray, ...customFieldsArray]
  }
  
  // Handle legacy structure with just 'fields'
  if (meta.fields && Array.isArray(meta.fields)) {
    return meta.fields
  }
  
  // Fallback to empty array
  console.warn('getAllFields: Unexpected meta structure', meta)
  return []
}

export interface AutoMappingResult {
  columnName: string
  suggestedField: string | null
  confidence: number
}

export interface ImportSummary {
  total: number
  created: number
  updated: number
  failed: number
  skipped: number
}

export interface ImportError {
  row: number
  field?: string
  value?: string
  error: string
}

export interface ImportResult {
  summary: ImportSummary
  errors: ImportError[]
  warnings?: string[]
}

/**
 * Получение метаданных полей для импорта
 */
export async function getImportMeta(entityType: 'contact' | 'deal'): Promise<ImportMeta> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  // API_BASE_URL уже должен содержать /api (из-за setGlobalPrefix в main.ts)
  // Но на всякий случай проверяем и добавляем если нужно
  let url = `${API_BASE_URL}/import/meta?entityType=${entityType}`
  if (!API_BASE_URL.includes('/api')) {
    url = `${API_BASE_URL}/api/import/meta?entityType=${entityType}`
  }
  
  console.log('Fetching import meta from:', url, 'API_BASE_URL:', API_BASE_URL)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get import meta: ${error}`)
  }

  const data = await response.json()
  console.log('Import meta API response:', JSON.stringify(data, null, 2))
  console.log('systemFields:', data.systemFields)
  console.log('customFields:', data.customFields)
  console.log('systemFields is array?', Array.isArray(data.systemFields))
  console.log('customFields is array?', Array.isArray(data.customFields))
  return data
}

/**
 * Автоматическое сопоставление CSV колонок с полями CRM
 */
export async function autoMapColumns(
  columns: string[],
  entityType: 'contact' | 'deal',
): Promise<AutoMappingResult[]> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  // API_BASE_URL уже должен содержать /api
  let url = `${API_BASE_URL}/import/auto-map?entityType=${entityType}`
  if (!API_BASE_URL.includes('/api')) {
    url = `${API_BASE_URL}/api/import/auto-map?entityType=${entityType}`
  }
  
  console.log('Auto-mapping columns:', url)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ columns }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to auto-map columns: ${error}`)
  }

  return response.json()
}

/**
 * Импорт контактов из CSV
 */
export async function importContacts(
  file: File,
  mapping: Record<string, string | undefined>,
  delimiter: ',' | ';' = ',',
  dryRun: boolean = false,
): Promise<ImportResult> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  // Filter out undefined values from mapping before sending to API
  const cleanMapping = Object.entries(mapping).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})

  const formData = new FormData()
  formData.append('file', file)
  formData.append('mapping', JSON.stringify(cleanMapping))
  formData.append('delimiter', delimiter)

  // API_BASE_URL уже должен содержать /api
  let url = `${API_BASE_URL}/import/contacts?dryRun=${dryRun ? 'true' : 'false'}`
  if (!API_BASE_URL.includes('/api')) {
    url = `${API_BASE_URL}/api/import/contacts?dryRun=${dryRun ? 'true' : 'false'}`
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to import contacts: ${error}`)
  }

  return response.json()
}

/**
 * Импорт сделок из CSV
 */
export async function importDeals(
  file: File,
  mapping: Record<string, string | undefined>,
  pipelineId: string,
  delimiter: ',' | ';' = ',',
  dryRun: boolean = false,
  defaultAssignedToId?: string,
): Promise<ImportResult> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  if (!pipelineId) {
    throw new Error('Pipeline is required for deal import')
  }

  // Filter out undefined values from mapping before sending to API
  const cleanMapping = Object.entries(mapping).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})

  const formData = new FormData()
  formData.append('file', file)
  formData.append('mapping', JSON.stringify(cleanMapping))
  formData.append('pipelineId', pipelineId)
  if (defaultAssignedToId) {
    formData.append('defaultAssignedToId', defaultAssignedToId)
  }
  formData.append('delimiter', delimiter)

  // API_BASE_URL уже должен содержать /api
  let url = `${API_BASE_URL}/import/deals?dryRun=${dryRun ? 'true' : 'false'}`
  if (!API_BASE_URL.includes('/api')) {
    url = `${API_BASE_URL}/api/import/deals?dryRun=${dryRun ? 'true' : 'false'}`
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to import deals: ${error}`)
  }

  return response.json()
}

