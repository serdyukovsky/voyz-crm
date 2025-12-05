"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Contact as ContactIcon } from "lucide-react"
import { TaskDetailModal } from "./task-detail-modal"
import { DealDetailModal } from "./deal-detail-modal"
import { ContactBadge } from "./contact-badge"
import { getContacts } from '@/lib/api/contacts'
import type { Contact } from '@/lib/api/contacts'
import { getTasks, deleteTask, updateTask } from '@/lib/api/tasks'
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
  completed: boolean
  status: string
  description?: string
  createdAt?: string
  result?: string
}


interface TasksListViewProps {
  searchQuery: string
  userFilter: string
  dealFilter: string
  contactFilter: string
  dateFilter: string
  statusFilter: string
  selectedTaskId?: string | null
  onTaskSelect?: (taskId: string | null) => void
}

function TasksListView({ searchQuery, userFilter, dealFilter, contactFilter, dateFilter, statusFilter, selectedTaskId, onTaskSelect }: TasksListViewProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<{ id: string; name: string } | null>(null)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  

  // Load tasks from API
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true)
        const tasksData = await getTasks({
          status: statusFilter || undefined,
        })
        
        // Transform API tasks to component format
        const transformedTasks: Task[] = tasksData.map((task: any) => ({
          id: task.id,
          title: task.title,
          dealId: task.deal?.id || null,
          dealName: task.deal?.title || null,
          contactId: task.contact?.id || null,
          contactName: task.contact?.fullName || null,
          dueDate: task.deadline || '',
          assignee: task.assignedTo?.name || t('tasks.unassigned'),
          assigneeId: task.assignedTo?.id || undefined,
          completed: task.status === 'DONE',
          status: task.status?.toLowerCase() || 'todo',
          description: task.description,
          createdAt: task.createdAt,
          result: task.result,
        }))
        
        setTasks(transformedTasks)
      } catch (error) {
        console.error('Failed to load tasks:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        // If unauthorized, redirect will be handled by API function
        if (errorMessage !== 'UNAUTHORIZED') {
          setTasks([])
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadTasks()
  }, [statusFilter])

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

  const filteredTasks = tasks.filter(task => {
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
      
      // Also reload tasks from API after a short delay to ensure consistency
      setTimeout(async () => {
        try {
          const tasksData = await getTasks({
            status: statusFilter || undefined,
          })
          
          const transformedTasks: Task[] = tasksData.map((task: any) => ({
            id: task.id,
            title: task.title,
            dealId: task.deal?.id || null,
            dealName: task.deal?.title || null,
            contactId: task.contact?.id || null,
            contactName: task.contact?.fullName || null,
            dueDate: task.deadline || '',
            assignee: task.assignedTo?.name || t('tasks.unassigned'),
            assigneeId: task.assignedTo?.id || undefined,
            completed: task.status === 'DONE',
            status: task.status?.toLowerCase() || 'todo',
            description: task.description,
            createdAt: task.createdAt,
            result: task.result,
          }))
          
          setTasks(transformedTasks)
          const updated = transformedTasks.find(t => t.id === updatedTask.id)
          if (updated) {
            setSelectedTask(updated)
          }
        } catch (error) {
          console.error('Failed to reload tasks:', error)
        }
      }, 500)
      
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
          {filteredTasks.map((task) => (
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
                          <Contact className="h-4 w-4 text-muted-foreground" />
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
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </td>
              <td className="p-3">
                <span className="text-sm text-muted-foreground">{task.assignee}</span>
              </td>
              <td className="p-3">
                <span className={`text-sm ${task.completed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {task.completed ? (t('tasks.completed') || 'Завершена') : (t('tasks.incomplete') || 'Не завершена')}
                </span>
              </td>
            </tr>
          ))}
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
