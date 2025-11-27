"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User, UserRole } from '@/lib/api/users'

interface ChangeRoleModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onSave: (userId: string, role: UserRole) => Promise<void>
}

function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Full access to all features and settings'
    case 'MANAGER':
      return 'Can create, edit, and manage deals, contacts, and tasks'
    case 'VIEWER':
      return 'Read-only access to view data'
    default:
      return ''
  }
}

export function ChangeRoleModal({ user, isOpen, onClose, onSave }: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (selectedRole === user.role) {
      onClose()
      return
    }

    try {
      setSaving(true)
      await onSave(user.id, selectedRole)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Select a new role for {user.firstName} {user.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <div className="space-y-4 py-4">
          <Label>Role</Label>
          <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
            <div className="flex items-start space-x-2 space-y-0 rounded-md border border-border p-4">
              <RadioGroupItem value="ADMIN" id="admin" className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="admin" className="cursor-pointer font-medium">
                  Admin
                </Label>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription('ADMIN')}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2 space-y-0 rounded-md border border-border p-4">
              <RadioGroupItem value="MANAGER" id="manager" className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="manager" className="cursor-pointer font-medium">
                  Manager
                </Label>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription('MANAGER')}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2 space-y-0 rounded-md border border-border p-4">
              <RadioGroupItem value="VIEWER" id="viewer" className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="viewer" className="cursor-pointer font-medium">
                  Viewer
                </Label>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription('VIEWER')}
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedRole === user.role}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}





