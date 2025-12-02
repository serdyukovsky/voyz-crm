'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Search, Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { getUsers, type User } from '@/lib/api/users'

interface LogsFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  actionFilter: string
  onActionFilterChange: (value: string) => void
  userFilter: string
  onUserFilterChange: (value: string) => void
  entityFilter: string
  onEntityFilterChange: (value: string) => void
  dateRange: string
  onDateRangeChange: (value: string) => void
}

export function LogsFilters({
  searchQuery,
  onSearchChange,
  actionFilter,
  onActionFilterChange,
  userFilter,
  onUserFilterChange,
  entityFilter,
  onEntityFilterChange,
  dateRange,
  onDateRangeChange,
}: LogsFiltersProps) {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await getUsers()
        setUsers(data)
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          type="search"
          placeholder={t('logs.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 bg-card border-border"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <Select value={actionFilter} onValueChange={onActionFilterChange}>
          <SelectTrigger className="w-[160px] h-9 bg-card border-border">
            <SelectValue placeholder={t('logs.actionType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logs.allActions')}</SelectItem>
            <SelectItem value="create">{t('logs.create')}</SelectItem>
            <SelectItem value="update">{t('logs.update')}</SelectItem>
            <SelectItem value="delete">{t('logs.delete')}</SelectItem>
            <SelectItem value="login">{t('logs.login')}</SelectItem>
            <SelectItem value="logout">{t('logs.logout')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={onUserFilterChange}>
          <SelectTrigger className="w-[160px] h-9 bg-card border-border">
            <SelectValue placeholder={t('logs.user')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logs.allUsers')}</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {`${user.firstName} ${user.lastName}`.trim() || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={onEntityFilterChange}>
          <SelectTrigger className="w-[160px] h-9 bg-card border-border">
            <SelectValue placeholder={t('logs.entityType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logs.allEntities')}</SelectItem>
            <SelectItem value="deal">{t('deals.title')}</SelectItem>
            <SelectItem value="task">{t('tasks.title')}</SelectItem>
            <SelectItem value="contact">{t('contacts.title')}</SelectItem>
            <SelectItem value="company">{t('companies.title')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-[160px] h-9 bg-card border-border">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t('logs.dateRange')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logs.allTime')}</SelectItem>
            <SelectItem value="today">{t('logs.today')}</SelectItem>
            <SelectItem value="yesterday">{t('logs.yesterday')}</SelectItem>
            <SelectItem value="week">{t('logs.last7Days')}</SelectItem>
            <SelectItem value="month">{t('logs.last30Days')}</SelectItem>
            <SelectItem value="quarter">{t('logs.last90Days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
