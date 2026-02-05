"use client"

import { useState, useEffect, useMemo } from 'react'
import type { UserRole } from '@/lib/api/users'

interface UseUserRoleOptions {
  userRole?: UserRole | null
}

export function useUserRole({ userRole }: UseUserRoleOptions = {}) {
  const [storedRole, setStoredRole] = useState<UserRole | null>(null)

  // Read role from localStorage on mount and when it changes
  useEffect(() => {
    const readRole = () => {
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          try {
            const user = JSON.parse(userStr)
            setStoredRole(user.role as UserRole)
          } catch {
            setStoredRole(null)
          }
        } else {
          setStoredRole(null)
        }
      }
    }

    readRole()

    // Listen for storage changes (e.g., login/logout in another tab)
    window.addEventListener('storage', readRole)

    // Custom event for same-tab updates
    window.addEventListener('user-changed', readRole)

    return () => {
      window.removeEventListener('storage', readRole)
      window.removeEventListener('user-changed', readRole)
    }
  }, [])

  const currentRole = userRole || storedRole

  const isAdmin = currentRole === 'ADMIN'
  const isManager = currentRole === 'MANAGER' || isAdmin
  const isViewer = currentRole === 'VIEWER'
  const canEdit = isManager || isAdmin
  const canDelete = isAdmin // Only admin can delete deals
  const canManageUsers = isAdmin // Only admin can manage users
  const canManagePipelines = isAdmin // Only admin can create/delete pipelines
  const canDeleteTasks = isManager || isAdmin // Manager can delete tasks (but only own tasks - checked in backend)

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
    canManagePipelines,
    canDeleteTasks,
    hasRole,
  }
}






