"use client"

import { useState, useEffect, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, Info } from "lucide-react"
import { getUsers } from "@/lib/api/users"
import { cn } from "@/lib/utils"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  fullName?: string
}

interface AssignedToValueMappingProps {
  csvColumnName: string // Название CSV колонки, которая сопоставлена с assignedToId
  csvRows: Record<string, string>[] // Все CSV строки для анализа уникальных значений
  mapping: Record<string, string> // Текущий маппинг: { "CSV value": "user-id" }
  onMappingChange: (mapping: Record<string, string>) => void
}

export function AssignedToValueMapping({
  csvColumnName,
  csvRows,
  mapping,
  onMappingChange,
}: AssignedToValueMappingProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Собираем уникальные значения из CSV колонки
  const uniqueValues = useMemo(() => {
    const values = new Set<string>()
    csvRows.forEach((row) => {
      const value = row[csvColumnName]?.trim()
      if (value) {
        values.add(value)
      }
    })
    return Array.from(values).sort()
  }, [csvRows, csvColumnName])

  // Подсчитываем количество использований каждого значения
  const valueCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    csvRows.forEach((row) => {
      const value = row[csvColumnName]?.trim()
      if (value) {
        counts[value] = (counts[value] || 0) + 1
      }
    })
    return counts
  }, [csvRows, csvColumnName])

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

  const handleValueMappingChange = (csvValue: string, userId: string | undefined) => {
    const newMapping = { ...mapping }
    if (userId) {
      newMapping[csvValue] = userId
    } else {
      delete newMapping[csvValue]
    }
    onMappingChange(newMapping)
  }

  const getUserDisplayName = (user: User): string => {
    const name = user.fullName || `${user.firstName} ${user.lastName}`.trim()
    return `${name} (${user.email})`
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
        <Label>Manual User Mapping</Label>
        <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading users...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
        <Label>Manual User Mapping</Label>
        <div className="flex items-center gap-2 p-3 border border-destructive/20 rounded-lg bg-destructive/5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
        <Label>Manual User Mapping</Label>
        <div className="flex items-center gap-2 p-3 border border-yellow-500/20 rounded-lg bg-yellow-500/5">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-600">No active users found.</span>
        </div>
      </div>
    )
  }

  if (uniqueValues.length === 0) {
    return (
      <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
        <Label>Manual User Mapping</Label>
        <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/50">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            No values found in column "{csvColumnName}"
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
      <div className="space-y-1">
        <Label className="text-base font-semibold">
          Manual User Mapping
        </Label>
        <p className="text-sm text-muted-foreground">
          Map CSV values from column "{csvColumnName}" to system users. 
          Unmapped values will be resolved automatically if possible.
        </p>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {uniqueValues.map((csvValue) => {
          const currentUserId = mapping[csvValue]
          const count = valueCounts[csvValue] || 0
          
          return (
            <div
              key={csvValue}
              className={cn(
                "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                currentUserId 
                  ? "border-green-500/30 bg-green-500/5" 
                  : "border-border bg-background"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {csvValue}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    ({count} {count === 1 ? 'row' : 'rows'})
                  </span>
                </div>
              </div>
              
              <Select
                value={currentUserId || "__UNMAPPED__"}
                onValueChange={(value) => 
                  handleValueMappingChange(csvValue, value === "__UNMAPPED__" ? undefined : value)
                }
              >
                <SelectTrigger className="w-[280px] bg-background">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__UNMAPPED__">
                    <span className="text-muted-foreground">— Not mapped —</span>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {getUserDisplayName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>

      {Object.keys(mapping).length > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded text-xs">
          <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-blue-600">
            {Object.keys(mapping).length} value(s) mapped. Unmapped values will be resolved automatically if possible.
          </p>
        </div>
      )}
    </div>
  )
}

