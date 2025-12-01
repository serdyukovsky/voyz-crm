"use client"

import { useState, useEffect } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { TasksListView } from "@/components/crm/tasks-list-view"
import { TasksKanbanView } from "@/components/crm/tasks-kanban-view"
import { CalendarView } from "@/components/crm/calendar-view"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getContacts } from '@/lib/api/contacts'
import { Contact } from '@/types/contact'
import { CreateTaskModal } from '@/components/crm/create-task-modal'
import { createTask } from '@/lib/api/tasks'
import { useToastNotification } from '@/hooks/use-toast-notification'

export default function TasksPage() {
  const [view, setView] = useState<"list" | "kanban" | "calendar">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState<string>("")
  const [dealFilter, setDealFilter] = useState<string>("")
  const [contactFilter, setContactFilter] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const { showSuccess, showError } = useToastNotification()

  // Debug: log modal state changes
  useEffect(() => {
    console.log('TasksPage: isCreateTaskModalOpen changed to:', isCreateTaskModalOpen)
  }, [isCreateTaskModalOpen])

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      console.warn('No access token found on tasks page, redirecting to login')
      window.location.href = '/login'
    }
  }, [])

  const users = ["All Users", "Alex Chen", "Sarah Lee", "Mike Johnson"]
  const deals = ["All Deals", "Acme Corp", "TechStart", "CloudFlow", "DataCo", "DesignHub", "InnovateLabs"]
  const dateOptions = ["All Dates", "Today", "This Week", "Overdue", "Upcoming"]
  const statusOptions = ["All Status", "Completed", "Incomplete"]

  const handleCreateTask = async (taskData: {
    title: string
    description?: string
    status?: string
    priority?: string
    deadline?: string
    dealId?: string
    contactId?: string
    assignedToId: string
  }) => {
    try {
      await createTask(taskData)
      showSuccess('Task created successfully')
      setIsCreateTaskModalOpen(false)
      // Reload page to refresh tasks list
      window.location.reload()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage === 'UNAUTHORIZED') {
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return
      }
      showError('Failed to create task', errorMessage)
    }
  }

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const contactsData = await getContacts()
        setContacts(contactsData)
      } catch (error) {
        console.error('Failed to load contacts:', error)
      }
    }
    loadContacts()
  }, [])

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground">Manage and track all tasks</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              alert('Button clicked!') // Simple test
              console.log('Add Task button clicked, opening modal')
              console.log('Current isCreateTaskModalOpen state:', isCreateTaskModalOpen)
              const token = localStorage.getItem('access_token')
              console.log('Token exists:', !!token)
              if (!token) {
                console.warn('No token found, redirecting to login')
                window.location.href = '/login'
                return
              }
              console.log('Token found, setting isCreateTaskModalOpen to true')
              setIsCreateTaskModalOpen(true)
              console.log('After setState, isCreateTaskModalOpen should be true')
            }}
            type="button"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            style={{ zIndex: 1000, position: 'relative' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </button>
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

            <Select value={contactFilter || "all"} onValueChange={(value) => setContactFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="All Contacts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
            contactFilter={contactFilter}
            dateFilter={dateFilter}
            statusFilter={statusFilter}
          />
        ) : view === "list" ? (
          <TasksListView 
            searchQuery={searchQuery}
            userFilter={userFilter}
            dealFilter={dealFilter}
            contactFilter={contactFilter}
            dateFilter={dateFilter}
            statusFilter={statusFilter}
          />
        ) : (
          <CalendarView />
        )}
      </div>

      {/* Create Task Modal */}
      {console.log('TasksPage render: isCreateTaskModalOpen =', isCreateTaskModalOpen)}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => {
          console.log('TasksPage: Closing modal')
          setIsCreateTaskModalOpen(false)
        }}
        onSave={handleCreateTask}
      />
      
      {/* Debug info - only in development */}
      {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          fontSize: '12px',
          zIndex: 9999,
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <div>Modal Open: {isCreateTaskModalOpen ? 'YES' : 'NO'}</div>
        </div>
      )}
    </CRMLayout>
  )
}
