"use client"

import { useState, useEffect } from 'react'
import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Mail, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { getUsers, updateUser, deleteUser, type User, type UserRole } from '@/lib/api/users'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useUserRole } from '@/hooks/use-user-role'
import { ChangeRoleModal } from '@/components/crm/change-role-modal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'

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

export default function UsersSettingsPage() {
  const { showSuccess, showError } = useToastNotification()
  const { canManageUsers, isAdmin } = useUserRole()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)

  useEffect(() => {
    if (!canManageUsers) {
      showError('Access Denied', 'You do not have permission to manage users')
      return
    }
    loadUsers()
  }, [canManageUsers])

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

  const handleChangeRole = (user: User) => {
    setSelectedUser(user)
    setIsRoleModalOpen(true)
  }

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      await updateUser(userId, { role: newRole })
      showSuccess('Role updated successfully')
      setIsRoleModalOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      showError('Failed to update role', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      await deleteUser(userId)
      showSuccess('User deleted successfully')
      loadUsers()
    } catch (error) {
      showError('Failed to delete user', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  if (!canManageUsers) {
    return (
      <CRMLayout>
        <div className="min-h-[calc(100vh-3rem)] px-6 py-6 flex items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">You do not have permission to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </CRMLayout>
    )
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground">Manage team members and permissions</p>
          </div>
          {isAdmin && (
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {user.firstName[0]}{user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {user.firstName} {user.lastName}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              user.isActive
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                            }`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Change Role
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {selectedUser && (
          <ChangeRoleModal
            user={selectedUser}
            isOpen={isRoleModalOpen}
            onClose={() => {
              setIsRoleModalOpen(false)
              setSelectedUser(null)
            }}
            onSave={handleRoleUpdate}
          />
        )}
      </div>
    </CRMLayout>
  )
}

