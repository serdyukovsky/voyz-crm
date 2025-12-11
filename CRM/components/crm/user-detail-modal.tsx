"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Check } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { getUser, updateUser, type User, type UserRole } from '@/lib/api/users'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useUserRole } from '@/hooks/use-user-role'
// Define permissions to match backend structure
const PERMISSIONS_LIST = {
  DEALS_VIEW: 'deals.view',
  DEALS_CREATE: 'deals.create',
  DEALS_UPDATE: 'deals.update',
  DEALS_DELETE: 'deals.delete',
  DEALS_UPDATE_RESTRICTED: 'deals.update_restricted',
  TASKS_VIEW: 'tasks.view',
  TASKS_CREATE: 'tasks.create',
  TASKS_UPDATE: 'tasks.update',
  TASKS_DELETE: 'tasks.delete',
  FIELDS_VIEW: 'fields.view',
  FIELDS_MANAGE: 'fields.manage',
  PIPELINES_VIEW: 'pipelines.view',
  PIPELINES_MANAGE: 'pipelines.manage',
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  IMPORT: 'import',
  EXPORT: 'export',
  INTEGRATIONS_VIEW: 'integrations.view',
  INTEGRATIONS_MANAGE: 'integrations.manage',
  LOGS_VIEW: 'logs.view',
} as const

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: Object.values(PERMISSIONS_LIST),
  MANAGER: [
    PERMISSIONS_LIST.DEALS_VIEW,
    PERMISSIONS_LIST.DEALS_CREATE,
    PERMISSIONS_LIST.DEALS_UPDATE,
    PERMISSIONS_LIST.DEALS_UPDATE_RESTRICTED,
    PERMISSIONS_LIST.TASKS_VIEW,
    PERMISSIONS_LIST.TASKS_CREATE,
    PERMISSIONS_LIST.TASKS_UPDATE,
    PERMISSIONS_LIST.FIELDS_VIEW,
    PERMISSIONS_LIST.PIPELINES_VIEW,
    PERMISSIONS_LIST.USERS_VIEW,
    PERMISSIONS_LIST.EXPORT,
    PERMISSIONS_LIST.INTEGRATIONS_VIEW,
    PERMISSIONS_LIST.LOGS_VIEW,
  ],
  VIEWER: [
    PERMISSIONS_LIST.DEALS_VIEW,
    PERMISSIONS_LIST.TASKS_VIEW,
    PERMISSIONS_LIST.FIELDS_VIEW,
    PERMISSIONS_LIST.PIPELINES_VIEW,
  ],
}

const PERMISSIONS_GROUPS = {
  'Сделки': [
    { key: 'DEALS_VIEW', label: 'Просмотр сделок' },
    { key: 'DEALS_CREATE', label: 'Создание сделок' },
    { key: 'DEALS_UPDATE', label: 'Обновление сделок' },
    { key: 'DEALS_DELETE', label: 'Удаление сделок' },
  ],
  'Задачи': [
    { key: 'TASKS_VIEW', label: 'Просмотр задач' },
    { key: 'TASKS_CREATE', label: 'Создание задач' },
    { key: 'TASKS_UPDATE', label: 'Обновление задач' },
    { key: 'TASKS_DELETE', label: 'Удаление задач' },
  ],
  'Воронки': [
    { key: 'PIPELINES_VIEW', label: 'Просмотр воронок' },
    { key: 'PIPELINES_MANAGE', label: 'Управление воронками' },
  ],
  'Пользователи': [
    { key: 'USERS_VIEW', label: 'Просмотр пользователей' },
    { key: 'USERS_MANAGE', label: 'Управление пользователями' },
  ],
  'Другое': [
    { key: 'FIELDS_VIEW', label: 'Просмотр полей' },
    { key: 'FIELDS_MANAGE', label: 'Управление полями' },
    { key: 'EXPORT', label: 'Экспорт данных' },
    { key: 'INTEGRATIONS_VIEW', label: 'Просмотр интеграций' },
    { key: 'INTEGRATIONS_MANAGE', label: 'Управление интеграциями' },
    { key: 'LOGS_VIEW', label: 'Просмотр логов' },
  ],
}

interface UserDetailModalProps {
  userId: string | null
  isOpen: boolean
  onClose: () => void
  onUserUpdated?: () => void
}

function getRoleBadgeVariant(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'default'
    case 'MANAGER':
      return 'secondary'
    case 'VIEWER':
      return 'outline'
    default:
      return 'outline'
  }
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin'
    case 'MANAGER':
      return 'Manager'
    case 'VIEWER':
      return 'Viewer'
    default:
      return role
  }
}

export function UserDetailModal({ userId, isOpen, onClose, onUserUpdated }: UserDetailModalProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const { canManageUsers, isAdmin } = useUserRole()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [userRole, setUserRole] = useState<UserRole>('MANAGER')

  useEffect(() => {
    if (isOpen && userId) {
      loadUser()
    } else {
      setUser(null)
      setSelectedPermissions(new Set())
    }
  }, [isOpen, userId])

  const loadUser = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const userData = await getUser(userId)
      setUser(userData)
      setUserRole(userData.role)
      
      // Load user permissions from backend if available
      // For now, we'll use role-based permissions
      // Handle case when role is not in standard roles (e.g., super admin)
      const rolePermissions = ROLE_PERMISSIONS[userData.role] || 
        (userData.role === 'ADMIN' || userData.role?.toUpperCase() === 'ADMIN' 
          ? Object.values(PERMISSIONS_LIST) 
          : [])
      setSelectedPermissions(new Set(rolePermissions))
    } catch (error) {
      showError('Failed to load user', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (permission: string) => {
    if (!isAdmin || user?.role === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN') return // Can't change admin permissions
    
    const newPermissions = new Set(selectedPermissions)
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission)
    } else {
      newPermissions.add(permission)
    }
    setSelectedPermissions(newPermissions)
  }

  const handleSave = async () => {
    if (!user || !canManageUsers) return

    try {
      setSaving(true)
      // Update user role if changed
      if (userRole !== user.role) {
        await updateUser(user.id, { role: userRole })
      }
      
      // TODO: Update permissions when backend supports it
      // For now, permissions are managed through roles
      
      showSuccess(t('users.userUpdated') || 'User updated successfully')
      await loadUser()
      onUserUpdated?.()
    } catch (error) {
      showError(t('users.updateError') || 'Failed to update user', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !userId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-br-3xl">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : user ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">{t('users.userInfo') || 'Информация о пользователе'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('users.firstName')}</Label>
                    <Input value={user.firstName} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('users.lastName')}</Label>
                    <Input value={user.lastName} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('users.email')}</Label>
                    <Input value={user.email} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('users.role')}</Label>
                    <div className="mt-1">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              {canManageUsers && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t('users.permissions') || 'Права доступа'}</h3>
                    {user.role !== 'ADMIN' && user.role?.toUpperCase() !== 'ADMIN' && ROLE_PERMISSIONS[user.role] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const rolePermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[user.role] || []
                          setSelectedPermissions(new Set(rolePermissions))
                        }}
                      >
                        {t('users.applyRolePermissions') || 'Применить права роли'}
                      </Button>
                    )}
                  </div>
                  
                  {(user.role === 'ADMIN' || user.role?.toUpperCase() === 'ADMIN' || !ROLE_PERMISSIONS[user.role]) ? (
                    <p className="text-sm text-muted-foreground">
                      {t('users.adminHasAllPermissions') || 'Администратор имеет все права доступа'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(PERMISSIONS_GROUPS).map(([groupName, permissions]) => (
                        <div key={groupName} className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground">{groupName}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {permissions.map(({ key, label }) => {
                              const permissionKey = PERMISSIONS_LIST[key as keyof typeof PERMISSIONS_LIST]
                              const isChecked = selectedPermissions.has(permissionKey)
                              const isDisabled = !isAdmin || user.role === 'ADMIN'
                              
                              return (
                                <div key={key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`permission-${key}`}
                                    checked={isChecked}
                                    onCheckedChange={() => handlePermissionToggle(permissionKey)}
                                    disabled={isDisabled}
                                  />
                                  <Label
                                    htmlFor={`permission-${key}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {label}
                                  </Label>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {canManageUsers && (
              <div className="sticky bottom-0 border-t border-border/50 px-6 py-4 bg-card/95 backdrop-blur-sm flex items-center justify-end">
                <Button 
                  size="icon" 
                  className="h-10 w-10 rounded-full" 
                  onClick={handleSave} 
                  disabled={saving}
                  title={t('common.save') || 'Сохранить'}
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{t('users.userNotFound') || 'User not found'}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

