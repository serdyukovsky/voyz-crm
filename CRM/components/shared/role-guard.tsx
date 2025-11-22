"use client"

import React from 'react'
import { useUserRole } from '@/hooks/use-user-role'
import type { UserRole } from '@/lib/api/users'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { hasRole } = useUserRole()

  if (hasRole(allowedRoles)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
