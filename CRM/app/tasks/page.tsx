"use client"

import { useState } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { TasksListView } from "@/components/crm/tasks-list-view"
import { TasksKanbanView } from "@/components/crm/tasks-kanban-view"
import { CalendarView } from "@/components/crm/calendar-view"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TasksPage() {
  const [view, setView] = useState<"list" | "kanban" | "calendar">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState<string>("")
  const [dealFilter, setDealFilter] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")

  const users = ["All Users", "Alex Chen", "Sarah Lee", "Mike Johnson"]
  const deals = ["All Deals", "Acme Corp", "TechStart", "CloudFlow", "DataCo", "DesignHub", "InnovateLabs"]
  const dateOptions = ["All Dates", "Today", "This Week", "Overdue", "Upcoming"]
  const statusOptions = ["All Status", "Completed", "Incomplete"]

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground">Manage and track all tasks</p>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Topbar with Tabs, Filters, and Search */}
        <div className="space-y-4 mb-6">
          {/* Tabs */}
          <Tabs value={view} onValueChange={(v) => setView(v as "list" | "kanban" | "calendar")}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="kanban" className="text-xs">
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs">
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters and Search */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Filters:</span>
            </div>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by user"
            >
              {users.map((user) => (
                <option key={user} value={user === "All Users" ? "" : user}>{user}</option>
              ))}
            </select>

            <select
              value={dealFilter}
              onChange={(e) => setDealFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by deal"
            >
              {deals.map((deal) => (
                <option key={deal} value={deal === "All Deals" ? "" : deal}>{deal}</option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by date"
            >
              {dateOptions.map((option) => (
                <option key={option} value={option === "All Dates" ? "" : option.toLowerCase()}>{option}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by status"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option === "All Status" ? "" : option.toLowerCase()}>{option}</option>
              ))}
            </select>

            {/* Search Bar */}
            <div className="ml-auto flex items-center gap-2 border border-border rounded-md px-3 h-8 bg-background">
              <Search className="h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground w-48"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {view === "kanban" ? (
          <TasksKanbanView 
            searchQuery={searchQuery}
            userFilter={userFilter}
            dealFilter={dealFilter}
            dateFilter={dateFilter}
            statusFilter={statusFilter}
          />
        ) : view === "list" ? (
          <TasksListView 
            searchQuery={searchQuery}
            userFilter={userFilter}
            dealFilter={dealFilter}
            dateFilter={dateFilter}
            statusFilter={statusFilter}
          />
        ) : (
          <CalendarView />
        )}
      </div>
    </CRMLayout>
  )
}
