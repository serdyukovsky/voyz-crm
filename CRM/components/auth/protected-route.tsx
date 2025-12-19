"use client"

import { Navigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()

  // If authStatus === 'loading' → render loading screen
  if (authStatus === 'loading') {
    return <PageSkeleton />
  }

  // If unauthenticated → redirect to /login
  if (authStatus === 'unauthenticated') {
    // Save the attempted location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If authenticated → render children
  return <>{children}</>
}

