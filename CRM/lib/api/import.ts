import { getApiBaseUrl } from '@/lib/config'

const API_BASE_URL = getApiBaseUrl()

export interface ImportField {
  key: string
  label: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'select'
  description?: string
  options?: Array<{ value: string; label: string }>
}

export interface ImportMeta {
  fields: ImportField[]
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

  return response.json()
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
  mapping: Record<string, string>,
  delimiter: ',' | ';' = ',',
  dryRun: boolean = false,
): Promise<ImportResult> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('mapping', JSON.stringify(mapping))
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
  mapping: Record<string, string>,
  delimiter: ',' | ';' = ',',
  dryRun: boolean = false,
): Promise<ImportResult> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('mapping', JSON.stringify(mapping))
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

