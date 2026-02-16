import { useState, useEffect } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { TasksListView } from "@/components/crm/tasks-list-view"
import { TasksKanbanView } from "@/components/crm/tasks-kanban-view"
import { CalendarView } from "@/components/crm/calendar-view"
import { Button } from "@/components/ui/button"
import { Plus, User, ChevronDown } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { CreateTaskModal } from '@/components/crm/create-task-modal'
import { createTask } from '@/lib/api/tasks'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useSearch } from '@/components/crm/search-context'

export default function TasksPage() {
  const { t } = useTranslation()
  const { searchValue } = useSearch()
  const [view, setView] = useState<"list" | "kanban" | "calendar">("kanban")
  const [userFilter, setUserFilter] = useState<string>("")
  const [users, setUsers] = useState<Array<{id: string, firstName: string, lastName: string, email: string}>>([])
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0)
  const { showSuccess, showError } = useToastNotification()

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

          // Get current user and set as default filter
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
      // Trigger tasks refresh by updating refresh key
      setTasksRefreshKey(prev => prev + 1)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage === 'UNAUTHORIZED') {
        if (typeof window !== 'undefined') {
          window.location.href = '/app/login'
        }
        return
      }
      showError(t('tasks.failedToCreateTask'), errorMessage)
    }
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('tasks.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('tasks.manageTasks')}</p>
          </div>
          <Button 
            size="sm"
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
              console.log('Token found, setting isCreateTaskModalOpen to true')
              setIsCreateTaskModalOpen(true)
            }}
            type="button"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('tasks.addTask')}
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Tabs value={view} onValueChange={(v) => setView(v as "list" | "kanban" | "calendar")}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="kanban" className="text-xs">
                {t('tasks.kanban')}
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                {t('tasks.list')}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs">
                {t('tasks.calendar')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <User className="mr-2 h-4 w-4 shrink-0" />
                {userFilter
                  ? users.find(u => u.id === userFilter)
                    ? `${users.find(u => u.id === userFilter)?.firstName || ''} ${users.find(u => u.id === userFilter)?.lastName || ''}`.trim() || users.find(u => u.id === userFilter)?.email
                    : 'Все пользователи'
                  : 'Все пользователи'
                }
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => setUserFilter("")}
                className={!userFilter ? 'bg-accent' : ''}
              >
                Все пользователи
              </DropdownMenuItem>
              {users.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  onClick={() => setUserFilter(user.id)}
                  className={userFilter === user.id ? 'bg-accent' : ''}
                >
                  {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {view === "kanban" ? (
          <TasksKanbanView
            key={tasksRefreshKey}
            searchQuery={searchValue}
            userFilter={userFilter}
          />
        ) : view === "list" ? (
          <TasksListView
            key={tasksRefreshKey}
            searchQuery={searchValue}
            userFilter={userFilter}
          />
        ) : (
          <CalendarView />
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSave={handleCreateTask}
      />
    </CRMLayout>
  )
}

