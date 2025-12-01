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
import { useTranslation } from '@/lib/i18n/i18n-context'
import { CreateTaskModal } from '@/components/crm/create-task-modal'
import { createTask } from '@/lib/api/tasks'
import { useToastNotification } from '@/hooks/use-toast-notification'

export default function TasksPage() {
  const { t } = useTranslation()
  const [view, setView] = useState<"list" | "kanban" | "calendar">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState<string>("")
  const [dealFilter, setDealFilter] = useState<string>("")
  const [contactFilter, setContactFilter] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0)
  const { showSuccess, showError } = useToastNotification()

  const users = [t('tasks.allUsers'), "Alex Chen", "Sarah Lee", "Mike Johnson"]
  const deals = [t('tasks.allDeals'), "Acme Corp", "TechStart", "CloudFlow", "DataCo", "DesignHub", "InnovateLabs"]
  const dateOptions = [t('tasks.allDates'), t('tasks.today'), t('tasks.thisWeek'), t('tasks.overdue'), t('tasks.upcoming')]
  const statusOptions = [t('tasks.allStatus'), t('tasks.completed'), t('tasks.incomplete')]

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
          window.location.href = '/login'
        }
        return
      }
      showError('Failed to create task', errorMessage)
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
                window.location.href = '/login'
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

        <div className="space-y-4 mb-6">
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
                <option key={user} value={user === t('tasks.allUsers') ? "" : user}>{user}</option>
              ))}
            </select>

            <select
              value={dealFilter}
              onChange={(e) => setDealFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by deal"
            >
              {deals.map((deal) => (
                <option key={deal} value={deal === t('tasks.allDeals') ? "" : deal}>{deal}</option>
              ))}
            </select>

            <Select value={contactFilter || "all"} onValueChange={(value) => setContactFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder={t('deals.allContacts')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('deals.allContacts')}</SelectItem>
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
                <option key={option} value={option === t('tasks.allDates') ? "" : option.toLowerCase()}>{option}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by status"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option === t('tasks.allStatus') ? "" : option.toLowerCase()}>{option}</option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2 border border-border rounded-md px-3 h-8 bg-background">
              <Search className="h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('tasks.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground w-48"
              />
            </div>
          </div>
        </div>

        {view === "kanban" ? (
          <TasksKanbanView 
            key={tasksRefreshKey}
            searchQuery={searchQuery}
            userFilter={userFilter}
            dealFilter={dealFilter}
            contactFilter={contactFilter}
            dateFilter={dateFilter}
            statusFilter={statusFilter}
          />
        ) : view === "list" ? (
          <TasksListView 
            key={tasksRefreshKey}
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
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSave={handleCreateTask}
      />
    </CRMLayout>
  )
}

