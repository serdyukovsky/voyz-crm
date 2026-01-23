"use client"

import { useState, useEffect, useMemo } from "react"
import { TaskCard } from "@/components/crm/task-card"
import { deleteTask, updateTask } from '@/lib/api/tasks'
import { useInfiniteTasks } from '@/hooks/use-tasks'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { startOfDay, startOfWeek, endOfWeek, addWeeks, endOfMonth, isSameDay, isWithinInterval, isBefore, isAfter } from 'date-fns'

interface Task {
  id: string
  title: string
  dealId: string | null
  dealName: string | null
  contactId?: string | null
  contactName?: string | null
  dueDate: string
  assignee: string
  assigneeId?: string
  completed: boolean
  status: string
  description?: string
  createdAt?: string
  result?: string
}

interface DateCategory {
  id: string
  name: string
  color: string
  order: number
}

// Helper function to parse date safely
const safeParseDate = (dateString: string | undefined | null): Date | null => {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

// Function to determine task category by date
const getTaskDateCategory = (task: Task): string => {
  // Completed tasks always go to "done" category
  if (task.completed) {
    return 'done'
  }

  const dueDate = safeParseDate(task.dueDate)
  if (!dueDate) {
    return 'future' // Tasks without date go to future
  }

  const now = new Date()
  const today = startOfDay(now)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 }) // Monday as start of week
  const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
  const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
  
  const thisMonthEnd = endOfMonth(today)

  const taskDate = startOfDay(dueDate)

  // Overdue (before today)
  if (isBefore(taskDate, today)) {
    return 'overdue'
  }

  // Today
  if (isSameDay(taskDate, today)) {
    return 'today'
  }

  // Tomorrow
  if (isSameDay(taskDate, tomorrow)) {
    return 'tomorrow'
  }

  // This week (after tomorrow, before next week)
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)
  if (isWithinInterval(taskDate, { start: startOfDay(dayAfterTomorrow), end: thisWeekEnd })) {
    return 'thisWeek'
  }

  // Next week
  if (isWithinInterval(taskDate, { start: nextWeekStart, end: nextWeekEnd })) {
    return 'nextWeek'
  }

  // This month (after next week, but within current month)
  const afterNextWeek = new Date(nextWeekEnd)
  afterNextWeek.setDate(afterNextWeek.getDate() + 1)
  if (isWithinInterval(taskDate, { start: startOfDay(afterNextWeek), end: thisMonthEnd })) {
    return 'thisMonth'
  }

  // Future (beyond this month)
  if (isAfter(taskDate, thisMonthEnd)) {
    return 'future'
  }

  return 'future'
}

// Get date categories with translations
const getDateCategories = (t: (key: string) => string): DateCategory[] => [
  { id: "overdue", name: t('tasks.overdue') || 'Просроченные', color: "#ef4444", order: 0 },
  { id: "today", name: t('tasks.today') || 'На сегодня', color: "#f59e0b", order: 1 },
  { id: "tomorrow", name: t('tasks.tomorrow') || 'На завтра', color: "#3b82f6", order: 2 },
  { id: "thisWeek", name: t('tasks.thisWeek') || 'На этой неделе', color: "#8b5cf6", order: 3 },
  { id: "nextWeek", name: t('tasks.nextWeek') || 'На следующей неделе', color: "#06b6d4", order: 4 },
  { id: "thisMonth", name: t('tasks.thisMonth') || 'В этом месяце', color: "#10b981", order: 5 },
  { id: "future", name: t('tasks.future') || 'На будущее', color: "#64748b", order: 6 },
  { id: "done", name: t('tasks.statusDone') || 'Выполнено', color: "#10b981", order: 7 },
]

interface TasksKanbanViewProps {
  searchQuery: string
  userFilter: string
  dealFilter: string
  contactFilter: string
  dateFilter: string
  statusFilter: string
  selectedTaskId?: string | null
  onTaskSelect?: (taskId: string | null) => void
}

export function TasksKanbanView({ searchQuery, userFilter, dealFilter, contactFilter, dateFilter, statusFilter, selectedTaskId, onTaskSelect }: TasksKanbanViewProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [tasks, setTasks] = useState<Task[]>([])

  // Use infinite scroll for tasks (100 per page instead of loading all 10000 at once)
  const { data, isLoading: loading, error: tasksError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteTasks({
    status: statusFilter || undefined,
    pageSize: 100,
    enabled: true,
  })

  // Transform and flatten all pages of tasks
  useEffect(() => {
    try {
      const allTasksData: any[] = []

      if (data?.pages) {
        data.pages.forEach(page => {
          const pageData = Array.isArray(page) ? page : (page as any)?.data || []
          allTasksData.push(...pageData)
        })
      }

      // Transform API tasks to component format
      const transformedTasks: Task[] = allTasksData.map((task: any) => {
        // Map API status to component status
        let status = 'todo'
        if (task.status === 'BACKLOG') status = 'backlog'
        else if (task.status === 'TODO') status = 'todo'
        else if (task.status === 'IN_PROGRESS') status = 'in_progress'
        else if (task.status === 'DONE') status = 'done'
        else if (task.status) status = task.status.toLowerCase()

        const completed = task.status === 'DONE'
        if (completed) {
          console.log('Found completed task:', task.id, task.title, 'Status:', task.status)
        }

        return {
          id: task.id,
          title: task.title,
          dealId: task.deal?.id || null,
          dealName: task.deal?.title || null,
          contactId: task.contact?.id || null,
          contactName: task.contact?.fullName || null,
          dueDate: task.deadline || '',
          assignee: task.assignedTo?.name || t('tasks.unassigned'),
          assigneeId: task.assignedTo?.id || undefined,
          completed,
          status,
          description: task.description,
          createdAt: task.createdAt,
          result: task.result,
        }
      })

      console.log('Tasks loaded:', transformedTasks.length, 'Completed:', transformedTasks.filter(t => t.completed).length, 'Has more:', hasNextPage)
      setTasks(transformedTasks)
    } catch (error) {
      console.error('Failed to transform tasks:', error)
      if (!tasksError || !tasksError.message?.includes('UNAUTHORIZED')) {
        setTasks([])
      }
    }
  }, [data, t, tasksError, hasNextPage])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
    // Search filter
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    
    // User filter
    if (userFilter && task.assignee !== userFilter) return false
    
    // Deal filter
    if (dealFilter && task.dealName !== dealFilter) return false
    
    // Contact filter
    if (contactFilter && task.contactId !== contactFilter) return false
    
    // Status filter
    if (statusFilter === "completed" && !task.completed) return false
    if (statusFilter === "incomplete" && task.completed) return false
    
    // Date filter
    if (dateFilter) {
      const taskDate = new Date(task.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dateFilter === "today" && taskDate.toDateString() !== today.toDateString()) return false
      if (dateFilter === "overdue" && taskDate >= today) return false
      if (dateFilter === "upcoming" && taskDate <= today) return false
      if (dateFilter === "this week") {
        const weekFromNow = new Date(today)
        weekFromNow.setDate(weekFromNow.getDate() + 7)
        if (taskDate < today || taskDate > weekFromNow) return false
      }
    }
    
    return true
    })
  }, [tasks, searchQuery, userFilter, dealFilter, contactFilter, dateFilter, t])

  // Get all date categories
  const allCategories = useMemo(() => getDateCategories(t), [t])

  // Group tasks by date category
  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    allCategories.forEach(cat => {
      grouped[cat.id] = []
    })
    
    filteredTasks.forEach(task => {
      const category = getTaskDateCategory(task)
      if (grouped[category]) {
        grouped[category].push(task)
      }
    })
    
    return grouped
  }, [filteredTasks, allCategories])

  // Get visible categories (only those with tasks, plus "done" always)
  const visibleCategories = useMemo(() => {
    const categories = allCategories.filter(cat => {
      if (cat.id === 'done') return true // Always show "done"
      return tasksByCategory[cat.id] && tasksByCategory[cat.id].length > 0
    })
    return categories.sort((a, b) => a.order - b.order)
  }, [allCategories, tasksByCategory])


  const handleTaskUpdate = async (updatedTask: Task, silent: boolean = false) => {
    try {
      // Update via API
      const statusToSend = updatedTask.status === 'DONE' ? 'DONE' : updatedTask.status?.toUpperCase() || 'TODO'
      console.log('TasksKanbanView: Updating task:', updatedTask.id, {
        title: updatedTask.title,
        description: updatedTask.description,
        status: statusToSend,
        completed: updatedTask.completed,
        dueDate: updatedTask.dueDate,
        assigneeId: updatedTask.assigneeId,
        dealId: updatedTask.dealId,
        result: updatedTask.result,
      })
      
      const response = await updateTask(updatedTask.id, {
        title: updatedTask.title,
        description: updatedTask.description,
        deadline: updatedTask.dueDate,
        contactId: updatedTask.contactId || undefined,
        assignedToId: updatedTask.assigneeId || undefined,
        dealId: updatedTask.dealId || undefined,
        status: statusToSend,
        result: updatedTask.result,
      })
      
      console.log('TasksKanbanView: Task updated in API, response:', response)
      
      // Transform API response to Task format
      const apiTask = response as any
      const finalUpdatedTask: Task = {
        id: apiTask?.id || updatedTask.id,
        title: apiTask?.title || updatedTask.title,
        description: apiTask?.description || updatedTask.description,
        dueDate: apiTask?.deadline || updatedTask.dueDate,
        assigneeId: apiTask?.assignedTo?.id || updatedTask.assigneeId,
        assignee: apiTask?.assignedTo?.name || updatedTask.assignee || t('tasks.unassigned'),
        dealId: apiTask?.deal?.id || updatedTask.dealId || null,
        dealName: apiTask?.deal?.title || updatedTask.dealName || null,
        contactId: apiTask?.contact?.id || updatedTask.contactId,
        contactName: apiTask?.contact?.fullName || updatedTask.contactName,
        status: statusToSend.toLowerCase(),
        completed: statusToSend === 'DONE',
        result: apiTask?.result || updatedTask.result,
        createdAt: apiTask?.createdAt || updatedTask.createdAt,
      }
      
      console.log('TasksKanbanView: Final updated task:', finalUpdatedTask)
      
      // Immediately update the task in local state to reflect changes in the UI
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(t => 
          t.id === finalUpdatedTask.id ? finalUpdatedTask : t
        )
        console.log('TasksKanbanView: Local state updated, updated task:', updatedTasks.find(t => t.id === finalUpdatedTask.id))
        return updatedTasks
      })

      // React Query cache is automatically invalidated by the mutation in the parent component
      // No need for manual refetch
      
      // Only show success message if not silent (i.e., not auto-save)
      if (!silent) {
        showSuccess(t('tasks.taskUpdated') || 'Task updated successfully')
      }
    } catch (error) {
      console.error('TasksKanbanView: Failed to update task:', error)
      if (!silent) {
        showError(t('tasks.taskUpdated') || 'Failed to update task')
      }
      throw error // Re-throw to let the modal handle it
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      setTasks(tasks.filter(task => task.id !== taskId))
      showSuccess(t('tasks.taskDeleted'))
    } catch (error) {
      console.error('Failed to delete task:', error)
      showError(t('tasks.deleteError'))
    }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleCategories.map((category) => {
          const categoryTasks = tasksByCategory[category.id] || []

          return (
            <div key={category.id} className="flex-shrink-0 w-[280px]">
              <div className="rounded-md border border-border bg-card">
                {/* Column Header */}
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="text-xs font-medium text-foreground">{category.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {categoryTasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-3 space-y-2 min-h-[200px]">
                  {categoryTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskDelete={handleTaskDelete}
                      selectedTaskId={selectedTaskId}
                      onTaskSelect={onTaskSelect}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load More Button for Infinite Pagination */}
      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage || loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More Tasks'}
          </button>
        </div>
      )}
    </>
  )
}
