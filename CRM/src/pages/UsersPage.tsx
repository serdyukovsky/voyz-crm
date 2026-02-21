"use client"

import { useState, useEffect } from 'react'
import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { getApiBaseUrl } from "@/lib/config"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, MoreVertical, Settings } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { getUsers, type User, type UserRole } from '@/lib/api/users'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { format } from 'date-fns'
import { useUserRole } from '@/hooks/use-user-role'
import { CreateUserModal } from '@/components/crm/create-user-modal'
import { UserDetailModal } from '@/components/crm/user-detail-modal'
import { createUser } from '@/lib/api/users'

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

export default function UsersPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToastNotification()
  const { canManageUsers } = useUserRole()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      showError('Failed to load users', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
    telegramUsername?: string
    role?: UserRole
    isActive?: boolean
  }) => {
    try {
      await createUser(userData)
      showSuccess(t('users.userCreated') || 'User created successfully')
      await loadUsers()
    } catch (error) {
      showError(t('users.createError') || 'Failed to create user', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  if (loading) {
    return (
      <CRMLayout>
        <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
          <PageSkeleton />
        </div>
      </CRMLayout>
    )
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('users.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('users.manageUsers')}</p>
          </div>
          {canManageUsers && (
            <Button size="sm" onClick={() => setIsCreateUserModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('users.addUser')}
            </Button>
          )}
        </div>

        {users.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{t('users.noUsers')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card 
                key={user.id} 
                className="border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedUserId(user.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`${getApiBaseUrl()}/users/${user.id}/avatar`} />
                        <AvatarFallback className="bg-primary/20 text-sm text-primary">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {canManageUsers && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              setSelectedUserId(user.id)
                            }}>
                              <Settings className="mr-2 h-4 w-4" />
                              {t('users.configurePermissions')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Mail className="mr-2 h-4 w-4" />
                          {t('users.sendEmail')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <h3 className="text-sm font-medium text-foreground">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="text-[10px]">
                      {getRoleLabel(user.role)}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${
                        user.isActive 
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                      }`}
                    >
                      {user.isActive ? t('users.active') : t('users.inactive')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                    <span className="text-muted-foreground">
                      {user.lastLoginAt 
                        ? t('users.lastLogin', { date: format(new Date(user.lastLoginAt), 'dd.MM.yyyy') })
                        : t('users.never')}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreateUserModal
          isOpen={isCreateUserModalOpen}
          onClose={() => setIsCreateUserModalOpen(false)}
          onSave={handleCreateUser}
        />

        <UserDetailModal
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={loadUsers}
        />
      </div>
    </CRMLayout>
  )
}

