let _apiBaseUrl: string | null = null
let _wsUrl: string | null = null

export function getApiBaseUrl(): string {
  if (_apiBaseUrl === null) {
    if (typeof import.meta === 'undefined') {
      throw new Error('import.meta is not available. This code must run in a Vite module context.')
    }
    _apiBaseUrl = import.meta.env.VITE_API_URL
    if (!_apiBaseUrl) {
      console.error('VITE_API_URL is not set. Available env vars:', Object.keys(import.meta.env))
      throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
    }
    console.log('✅ API Base URL loaded:', _apiBaseUrl)
  }
  return _apiBaseUrl
}

export function getWsUrl(): string {
  if (_wsUrl === null) {
    if (typeof import.meta === 'undefined') {
      throw new Error('import.meta is not available. This code must run in a Vite module context.')
    }
    _wsUrl = import.meta.env.VITE_WS_URL
    if (!_wsUrl) {
      throw new Error('VITE_WS_URL environment variable is not set. Please configure it in .env.local')
    }
  }
  return _wsUrl
}

