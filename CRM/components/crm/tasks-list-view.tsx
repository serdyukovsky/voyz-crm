"use client"

import { useState, useEffect, useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Contact as ContactIcon } from "lucide-react"
import { TaskDetailModal } from "./task-detail-modal"
import { DealDetailModal } from "./deal-detail-modal"
import { ContactBadge } from "./contact-badge"
import { deleteTask, updateTask } from '@/lib/api/tasks'
import { useTasks } from '@/hooks/use-tasks'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { useToastNotification } from '@/hooks/use-toast-notification'

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
  assigneeAvatar?: string | null
  completed: boolean
  status: string
  description?: string
  createdAt?: string
  result?: string
}


interface TasksListViewProps {
  searchQuery: string
  userFilter: string
  selectedTaskId?: string | null
  onTaskSelect?: (taskId: string | null) => void
}

function TasksListView({ searchQuery, userFilter, selectedTaskId, onTaskSelect }: TasksListViewProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<{ id: string; name: string } | null>(null)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)

  // React Query hook to fetch tasks with caching
  const { data: tasksResponse, isLoading: loading, error: tasksError } = useTasks({
    limit: 100,
  })

  // Transform API response to component format
  useEffect(() => {
    try {
      const tasksData = Array.isArray(tasksResponse)
        ? tasksResponse
        : (tasksResponse as any)?.data || []

      console.log('📋 TasksListView: Loaded tasks from React Query:', tasksData.length)

      const transformedTasks: Task[] = tasksData.map((task: any) => {
        try {
          return {
            id: task.id,
            title: task.title || 'Untitled',
            dealId: task.deal?.id || null,
            dealName: task.deal?.title || null,
            contactId: task.contact?.id || null,
            contactName: task.contact?.fullName || null,
            dueDate: task.deadline || '',
            assignee: task.assignedTo?.name || t('tasks.unassigned'),
            assigneeId: task.assignedTo?.id || undefined,
            assigneeAvatar: task.assignedTo?.avatar || null,
            completed: task.status === 'DONE',
            status: task.status?.toLowerCase() || 'todo',
            description: task.description,
            createdAt: task.createdAt,
            result: task.result,
          }
        } catch (error) {
          console.error('Error transforming task:', task, error)
          return null
        }
      }).filter((task): task is Task => task !== null)

      console.log('📋 TasksListView: Transformed tasks:', transformedTasks.length)
      setTasks(transformedTasks)
    } catch (error) {
      console.error('Failed to transform tasks:', error)
      if (!tasksError || !tasksError.message.includes('UNAUTHORIZED')) {
        setTasks([])
      }
    }
  }, [tasksResponse, t, tasksError])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (searchQuery && task.title && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false

      // User filter - compare by assigneeId
      if (userFilter && task.assigneeId !== userFilter) return false

      return true
    })
  }, [tasks, searchQuery, userFilter])

  console.log('📋 TasksListView: Filtered tasks:', filteredTasks.length, 'from', tasks.length, 'total tasks')

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
    onTaskSelect?.(task.id)
  }

  // Open modal if task is selected via URL
  useEffect(() => {
    if (selectedTaskId) {
      const task = tasks.find(t => t.id === selectedTaskId)
      if (task && !isModalOpen) {
        setSelectedTask(task)
        setIsModalOpen(true)
      } else if (!task) {
        setIsModalOpen(false)
        setSelectedTask(null)
      }
    } else {
      if (isModalOpen) {
        setIsModalOpen(false)
        setSelectedTask(null)
      }
    }
  }, [selectedTaskId, tasks, isModalOpen])

  const handleTaskUpdate = async (updatedTask: Task, silent: boolean = false) => {
    try {
      // Update via API
      const statusToSend = updatedTask.status === 'DONE' ? 'DONE' : updatedTask.status?.toUpperCase() || 'TODO'
      console.log('TasksListView: Updating task:', updatedTask.id, {
        title: updatedTask.title,
        status: statusToSend,
        dueDate: updatedTask.dueDate,
        assigneeId: updatedTask.assigneeId,
        dealId: updatedTask.dealId,
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
      
      console.log('TasksListView: Task updated in API, response:', response)
      
      // Transform API response to Task format
      const apiTask = response as any
      const finalUpdatedTask: Task = {
        id: apiTask?.id || updatedTask.id,
        title: apiTask?.title || updatedTask.title,
        description: apiTask?.description || updatedTask.description,
        dueDate: apiTask?.deadline || updatedTask.dueDate,
        assigneeId: apiTask?.assignedTo?.id || updatedTask.assigneeId,
        assignee: apiTask?.assignedTo?.name || updatedTask.assignee || t('tasks.unassigned'),
        assigneeAvatar: apiTask?.assignedTo?.avatar || updatedTask.assigneeAvatar || null,
        dealId: apiTask?.deal?.id || updatedTask.dealId || null,
        dealName: apiTask?.deal?.title || updatedTask.dealName || null,
        contactId: apiTask?.contact?.id || updatedTask.contactId,
        contactName: apiTask?.contact?.fullName || updatedTask.contactName,
        status: statusToSend.toLowerCase(),
        completed: statusToSend === 'DONE',
        result: apiTask?.result || updatedTask.result,
        createdAt: apiTask?.createdAt || updatedTask.createdAt,
      }
      
      console.log('TasksListView: Final updated task:', finalUpdatedTask)
      
      // Immediately update the task in local state to reflect changes in the UI
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(t => 
          t.id === finalUpdatedTask.id ? finalUpdatedTask : t
        )
        return updatedTasks
      })
      
      // Update selected task if it's the one being updated
      setSelectedTask(prev =>
        prev && prev.id === finalUpdatedTask.id ? finalUpdatedTask : prev
      )

      // React Query cache is automatically invalidated by the mutation in the parent component
      // No need for manual refetch
      
      // Only show success message if not silent (i.e., not auto-save)
      if (!silent) {
        showSuccess(t('tasks.taskUpdated') || 'Task updated successfully')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      if (!silent) {
        showError(t('tasks.taskUpdated') || 'Failed to update task')
      }
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      setTasks(tasks.filter(task => task.id !== taskId))
      setIsModalOpen(false)
      setSelectedTask(null)
      onTaskSelect?.(null)
      showSuccess(t('tasks.taskDeleted'))
    } catch (error) {
      console.error('Failed to delete task:', error)
      showError(t('tasks.deleteError'))
    }
  }

  const handleDealClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.dealId && task.dealName) {
      setSelectedDeal({ id: task.dealId, name: task.dealName })
      setIsDealModalOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">{t('common.loading') || 'Загрузка...'}</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="w-8 p-3 text-left">
              <span className="sr-only">{t('tasks.taskStatus')}</span>
            </th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">{t('tasks.taskTitle')}</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">{t('tasks.taskDeal')}</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">{t('tasks.taskContact')}</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">{t('tasks.taskDeadline')}</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">{t('tasks.assignedTo')}</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">{t('tasks.completed') || 'Завершена'}</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-border last:border-0 hover:bg-accent/5 transition-colors"
              >
                <td className="p-3">
                  <Checkbox 
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                    aria-label={`${t('tasks.markAs')} "${task.title}" ${task.completed ? t('tasks.incomplete') : t('tasks.completed')}`}
                  />
                </td>
                <td className="p-3">
                  <button 
                    onClick={() => handleTaskClick(task)}
                    className={`text-sm text-left hover:text-primary transition-colors ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                  >
                    {task.title}
                  </button>
                </td>
                <td className="p-3">
                  {task.dealId && task.dealName ? (
                    <button
                      onClick={(e) => handleDealClick(task, e)}
                      className="text-sm text-primary hover:underline text-left"
                    >
                      {task.dealName}
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3">
                  {task.contactName ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <ContactIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{task.contactName}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3">
                <span className="text-sm text-muted-foreground">
                  {task.dueDate ? (() => {
                    try {
                      const date = new Date(task.dueDate)
                      if (isNaN(date.getTime())) return '—'
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    } catch {
                      return '—'
                    }
                  })() : '—'}
                </span>
              </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      {task.assigneeAvatar && (
                        <AvatarImage src={task.assigneeAvatar} alt={task.assignee} />
                      )}
                      <AvatarFallback className="text-[10px] font-medium">
                        {task.assignee
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{task.assignee}</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`text-sm ${task.completed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {task.completed ? (t('tasks.completed') || 'Завершена') : (t('tasks.incomplete') || 'Не завершена')}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="p-12 text-center">
                <p className="text-sm text-muted-foreground">{t('tasks.noTasksFound')}</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {filteredTasks.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-sm text-muted-foreground">{t('tasks.noTasksFound')}</p>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTask(null)
            onTaskSelect?.(null)
          }}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}

      {selectedDeal && (
        <DealDetailModal
          deal={{
            id: selectedDeal.id,
            title: selectedDeal.name,
          }}
          isOpen={isDealModalOpen}
          onClose={() => {
            setIsDealModalOpen(false)
            setSelectedDeal(null)
          }}
        />
      )}
    </div>
  )
}

export { TasksListView }
