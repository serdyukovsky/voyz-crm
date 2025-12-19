"use client"

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

/**
 * Banner component that displays when backend is unavailable
 * Shows a non-intrusive warning that backend connection is lost
 */
export function BackendUnavailableBanner() {
  const { isBackendUnavailable, refreshAuth } = useAuth()

  if (!isBackendUnavailable) {
    return null
  }

  const handleRetry = () => {
    refreshAuth()
  }

  return (
    <Alert variant="destructive" className="border-orange-500/20 bg-orange-500/10 mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-sm font-medium">Backend Unavailable</AlertTitle>
      <AlertDescription className="text-sm mt-1 flex items-center justify-between">
        <span>
          Cannot connect to the backend server. Your authentication state is preserved.
          The connection will be restored automatically when the backend is available.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="ml-4"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}


