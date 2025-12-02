import { useState, useEffect } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { TasksListView } from "@/components/crm/tasks-list-view"
import { TasksKanbanView } from "@/components/crm/tasks-kanban-view"
import { CalendarView } from "@/components/crm/calendar-view"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
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

          <div className="flex items-center gap-3 flex-wrap">
            <Select 
              value={userFilter || "all"} 
              onValueChange={(value) => setUserFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs" size="sm">
                <SelectValue placeholder={t('tasks.filterByUser')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allUsers')}</SelectItem>
                {users.filter(user => user !== t('tasks.allUsers')).map((user) => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={dealFilter || "all"} 
              onValueChange={(value) => setDealFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs" size="sm">
                <SelectValue placeholder={t('tasks.filterByDeal')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allDeals')}</SelectItem>
                {deals.filter(deal => deal !== t('tasks.allDeals')).map((deal) => (
                  <SelectItem key={deal} value={deal}>{deal}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={contactFilter || "all"} 
              onValueChange={(value) => setContactFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs" size="sm">
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

            <Select 
              value={dateFilter || "all"} 
              onValueChange={(value) => setDateFilter(value === "all" ? "" : value.toLowerCase())}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs" size="sm">
                <SelectValue placeholder={t('tasks.filterByDate')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allDates')}</SelectItem>
                {dateOptions.filter(option => option !== t('tasks.allDates')).map((option) => (
                  <SelectItem key={option} value={option.toLowerCase()}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={statusFilter || "all"} 
              onValueChange={(value) => setStatusFilter(value === "all" ? "" : value.toLowerCase())}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs" size="sm">
                <SelectValue placeholder={t('tasks.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allStatus')}</SelectItem>
                {statusOptions.filter(option => option !== t('tasks.allStatus')).map((option) => (
                  <SelectItem key={option} value={option.toLowerCase()}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

