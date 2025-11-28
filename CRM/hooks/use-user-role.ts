"use client"

import { useMemo } from 'react'
import type { UserRole } from '@/lib/api/users'

interface UseUserRoleOptions {
  userRole?: UserRole | null
}

export function useUserRole({ userRole }: UseUserRoleOptions = {}) {
  // Get role from localStorage or context if not provided
  const currentRole = useMemo(() => {
    if (userRole) return userRole
    
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          return user.role as UserRole
        } catch {
          return null
        }
      }
    }
    
    return null
  }, [userRole])

  const isAdmin = currentRole === 'ADMIN'
  const isManager = currentRole === 'MANAGER' || isAdmin
  const isViewer = currentRole === 'VIEWER'
  const canEdit = isManager || isAdmin
  const canDelete = isAdmin
  const canManageUsers = isAdmin

  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentRole) return false
    return roles.includes(currentRole)
  }

  return {
    role: currentRole,
    isAdmin,
    isManager,
    isViewer,
    canEdit,
    canDelete,
    canManageUsers,
    hasRole,
  }
}






