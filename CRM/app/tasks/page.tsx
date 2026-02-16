"use client"

import { useState, useEffect, useCallback } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { TasksListView } from "@/components/crm/tasks-list-view"
import { TasksKanbanView } from "@/components/crm/tasks-kanban-view"
import { CalendarView } from "@/components/crm/calendar-view"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateTaskModal } from '@/components/crm/create-task-modal'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { useTasks, useCreateTask } from '@/hooks/use-tasks'
import { useDebouncedValue } from '@/lib/utils/debounce'

// Custom hooks to replace next/navigation
let globalSetParams: ((params: URLSearchParams) => void) | null = null

const useSearchParams = () => {
  const [params, setParams] = useState(() => {
    if (typeof window !== 'undefined') {
      const initialParams = new URLSearchParams(window.location.search)
      console.log('useSearchParams: Initial params from URL:', window.location.search, 'task param:', initialParams.get('task'))
      return initialParams
    }
    return new URLSearchParams()
  })

  useEffect(() => {
    globalSetParams = setParams
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      const newParams = new URLSearchParams(window.location.search)
      console.log('useSearchParams: PopState event, new params:', window.location.search, 'task param:', newParams.get('task'))
      setParams(newParams)
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (globalSetParams === setParams) {
        globalSetParams = null
      }
    }
  }, [])

  return params
}

const useRouter = () => {
  return {
    push: (url: string) => {
      if (typeof window !== 'undefined') {
        // Update search params state immediately before navigation
        if (globalSetParams) {
          const newParams = new URLSearchParams(url.split('?')[1] || '')
          globalSetParams(newParams)
        }
        // Use pushState which should update the URL without reload
        window.history.pushState({}, '', url)
        // Force update by dispatching popstate event
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
  }
}

export default function TasksPage() {
  useAuthGuard()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [view, setView] = useState<"list" | "kanban" | "calendar">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState<string>("")
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([])
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    // Initialize from URL on mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const taskId = params.get('task')
      console.log('TasksPage: Initializing selectedTaskId from URL:', taskId || 'null')
      return taskId
    }
    return null
  })
  const { showSuccess, showError } = useToastNotification()

  // Debounce search query to reduce API calls (300ms delay)
  const debouncedSearch = useDebouncedValue(searchQuery, 300)

  // React Query hooks for data fetching
  const { data: tasksResponse, isLoading, error: tasksError } = useTasks({
    search: debouncedSearch,
    assignedToId: userFilter || undefined,
    limit: 100,
    enabled: true,
  })

  // Create task mutation with automatic cache invalidation
  const { mutate: createTaskMutation, isPending: isCreating } = useCreateTask()

  // Read task ID from URL on mount and when URL changes
  useEffect(() => {
    const taskId = searchParams.get('task')
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'N/A'
    console.log('TasksPage: Reading task from URL:', {
      taskId: taskId || 'null',
      currentSelectedTaskId: selectedTaskId || 'null',
      searchParamsString: searchParams.toString(),
      fullUrl: currentUrl
    })

    // Always update if URL has task parameter to ensure modal opens on page load
    if (taskId) {
      console.log('TasksPage: Found task in URL, setting selectedTaskId to:', taskId)
      setSelectedTaskId(taskId)
    } else if (selectedTaskId !== null) {
      console.log('TasksPage: No task in URL, clearing selectedTaskId')
      setSelectedTaskId(null)
    }
  }, [searchParams])

  // Handle task selection - update URL
  const handleTaskSelect = useCallback((taskId: string | null) => {
    console.log('TasksPage: handleTaskSelect called with taskId:', taskId)
    console.log('TasksPage: Current URL before update:', window.location.href)

    // Update state first
    setSelectedTaskId(taskId)

    if (typeof window === 'undefined') {
      console.warn('TasksPage: window is undefined, cannot update URL')
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (taskId) {
      params.set('task', taskId)
    } else {
      params.delete('task')
    }
    const queryString = params.toString()
    const newUrl = `/tasks${queryString ? `?${queryString}` : ''}`
    console.log('TasksPage: New URL to push:', newUrl)
    console.log('TasksPage: Full URL will be:', window.location.origin + newUrl)

    // Update URL using pushState - ensure it updates the address bar
    try {
      window.history.pushState({ path: newUrl }, '', newUrl)
      console.log('TasksPage: URL immediately after pushState:', window.location.href)
      console.log('TasksPage: window.location.search:', window.location.search)
      console.log('TasksPage: window.location.pathname:', window.location.pathname)

      // Update search params state
      if (globalSetParams) {
        console.log('TasksPage: Updating globalSetParams')
        globalSetParams(params)
      } else {
        console.warn('TasksPage: globalSetParams is not available')
      }

      // Force update by dispatching popstate
      window.dispatchEvent(new PopStateEvent('popstate'))

      // Double check after a delay
      setTimeout(() => {
        console.log('TasksPage: URL after pushState (delayed):', window.location.href)
        console.log('TasksPage: window.location.search (delayed):', window.location.search)
        if (window.location.search !== (queryString ? `?${queryString}` : '')) {
          console.error('TasksPage: URL was not updated correctly!')
        }
      }, 100)
    } catch (error) {
      console.error('TasksPage: Error updating URL:', error)
    }
  }, [])

  // Debug: log modal state changes
  useEffect(() => {
    console.log('TasksPage: isCreateTaskModalOpen changed to:', isCreateTaskModalOpen)
  }, [isCreateTaskModalOpen])

  // Load users and set current user as default filter
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const usersData = await response.json()
          setUsers(usersData)

          // Get current user from token and set as default filter
          const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (userResponse.ok) {
            const currentUser = await userResponse.json()
            setUserFilter(currentUser.id)
          }
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  // Replaced manual handleCreateTask with React Query mutation
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
    createTaskMutation(taskData, {
      onSuccess: () => {
        console.log('Task created successfully')
        showSuccess('Task created successfully')
        setIsCreateTaskModalOpen(false)
        // React Query automatically invalidates cache through mutation onSuccess
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error creating task:', errorMessage)
        if (errorMessage === 'UNAUTHORIZED') {
          if (typeof window !== 'undefined') {
            window.location.href = '/app/login'
          }
          return
        }
        showError('Failed to create task', errorMessage)
      },
    })
  }


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
              console.log('Add Task button clicked, opening modal')
              const token = localStorage.getItem('access_token')
              if (!token) {
                console.warn('No token found, redirecting to login')
                window.location.href = '/app/login'
                return
              }
              setIsCreateTaskModalOpen(true)
            }}
            type="button"
            disabled={isCreating}
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
              <span>Assigned to:</span>
            </div>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by user"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
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
            searchQuery={debouncedSearch}
            userFilter={userFilter}
            selectedTaskId={selectedTaskId}
            onTaskSelect={handleTaskSelect}
          />
        ) : view === "list" ? (
          <TasksListView
            searchQuery={debouncedSearch}
            userFilter={userFilter}
            selectedTaskId={selectedTaskId}
            onTaskSelect={handleTaskSelect}
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
    </CRMLayout>
  )
}
