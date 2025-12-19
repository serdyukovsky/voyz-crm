"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Loader2, Info } from "lucide-react"
import { getUsers } from "@/lib/api/users"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  fullName?: string
}

interface AssignedToSelectorProps {
  selectedUserId?: string
  applyToAll: boolean
  onUserChange: (userId: string | undefined) => void
  onApplyToAllChange: (apply: boolean) => void
  hasAssignedToMapping: boolean
  dryRunErrors?: Array<{ field?: string; error: string; value?: string }>
}

export function AssignedToSelector({ 
  selectedUserId, 
  applyToAll,
  onUserChange, 
  onApplyToAllChange,
  hasAssignedToMapping,
  dryRunErrors = [],
}: AssignedToSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if there are assignedToId errors in dry-run
  const assignedToErrors = dryRunErrors.filter(err => err.field === 'assignedToId')
  const hasUnresolvedUsers = assignedToErrors.length > 0

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getUsers()
        setUsers(data)
      } catch (err) {
        console.error('Failed to load users:', err)
        setError(err instanceof Error ? err.message : 'Failed to load users')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Default Assigned To (Optional)</Label>
        <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading users...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Default Assigned To (Optional)</Label>
        <div className="flex items-center gap-2 p-3 border border-destructive/20 rounded-lg bg-destructive/5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Default Assigned To (Optional)</Label>
        <div className="flex items-center gap-2 p-3 border border-yellow-500/20 rounded-lg bg-yellow-500/5">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-600">No active users found.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
      {hasUnresolvedUsers && (
        <div className="flex items-start gap-2 p-3 border border-yellow-500/20 rounded-lg bg-yellow-500/5 mb-3">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-600">
              {assignedToErrors.length} row(s) have unresolved assigned users
            </p>
            <p className="text-xs text-yellow-600/80 mt-1">
              Users like "{assignedToErrors[0]?.value}" were not found. You can assign a default user to all rows below.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="assigned-to-select">
            Default Assigned To
          </Label>
          {!hasAssignedToMapping && (
            <span className="text-xs text-muted-foreground">(Optional)</span>
          )}
        </div>
        <Select 
          value={selectedUserId ?? undefined} 
          onValueChange={(value) => onUserChange(value === '__NONE__' ? undefined : value)}
        >
          <SelectTrigger id="assigned-to-select" className="bg-background">
            <SelectValue placeholder="Select default user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__NONE__">— No default assignment —</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.fullName || `${user.firstName} ${user.lastName}`} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUserId && (
        <div className="flex items-start gap-2 pt-2 border-t border-border">
          <Checkbox 
            id="apply-to-all"
            checked={applyToAll}
            onCheckedChange={(checked) => onApplyToAllChange(checked === true)}
          />
          <div className="flex-1">
            <Label 
              htmlFor="apply-to-all" 
              className="text-sm font-normal cursor-pointer"
            >
              Apply to all rows
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {applyToAll 
                ? "All deals will be assigned to the selected user, overriding CSV values"
                : hasAssignedToMapping 
                  ? "Only rows without valid assigned user in CSV will use this default"
                  : "Applies to all rows since no 'Assigned To' column is mapped"
              }
            </p>
          </div>
        </div>
      )}

      {!hasAssignedToMapping && !selectedUserId && (
        <div className="flex items-start gap-2 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded text-xs">
          <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-blue-600">
            You haven't mapped an 'Assigned To' column. Select a default user above to assign all deals to someone.
          </p>
        </div>
      )}
    </div>
  )
}

