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
      // Fallback to API URL if WS URL is not set
      const apiUrl = getApiBaseUrl()
      // Remove /api suffix if present, Socket.IO will add its own path
      const baseUrl = apiUrl.replace(/\/api\/?$/, '')
      _wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://')
      console.log('⚠️ VITE_WS_URL not set, using fallback:', _wsUrl)
    }
  }
  return _wsUrl
}

