"use client"

import { useAuth } from '@/contexts/auth-context'
import { PageSkeleton } from '@/components/shared/loading-skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * ProtectedRoute component that:
 * - Blocks access when user is not authenticated
 * - Redirects to /login when unauthenticated
 * - Shows loading state while checking auth
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authStatus } = useAuth()

  // If authStatus === 'loading' → render loading screen
  if (authStatus === 'loading') {
    return <PageSkeleton />
  }

  // If unauthenticated → redirect to landing page
  if (authStatus === 'unauthenticated') {
    window.location.href = '/'
    return <PageSkeleton />
  }

  // If authenticated → render children
  return <>{children}</>
}

