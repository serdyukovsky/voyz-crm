'use client'

import { Input } from "@/components/ui/input"
import { Search, Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          type="search"
          placeholder="Search logs by user, action, entity ID, or details..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 bg-card border-border"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <Select value={actionFilter} onValueChange={onActionFilterChange}>
          <SelectTrigger className="w-[160px] h-9 bg-card border-border">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="Created">Created</SelectItem>
            <SelectItem value="Updated">Updated</SelectItem>
            <SelectItem value="Deleted">Deleted</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Logged">Logged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={onUserFilterChange}>
          <SelectTrigger className="w-[160px] h-9 bg-card border-border">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="Alex Chen">Alex Chen</SelectItem>
            <SelectItem value="Sarah Lee">Sarah Lee</SelectItem>
            <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={onEntityFilterChange}>
          <SelectTrigger className="w-[160px] h-9 bg-card border-border">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="deal">Deals</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="contact">Contacts</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-[160px] h-9 bg-card border-border">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="quarter">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
