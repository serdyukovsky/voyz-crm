"use client"

import { useState, useEffect } from "react"
import { TaskCard } from "@/components/crm/task-card"
import { AddTaskStageModal } from "@/components/crm/add-task-stage-modal"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
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

interface Stage {
  id: string
  name: string
  color: string
  isDefault: boolean
}

// Default stages will be translated in component
const getDefaultStages = (t: (key: string) => string): Stage[] => [
  { id: "backlog", name: t('tasks.statusBacklog'), color: "#64748b", isDefault: true },
  { id: "todo", name: t('tasks.statusTodo'), color: "#3b82f6", isDefault: true },
  { id: "in_progress", name: t('tasks.statusInProgress'), color: "#8b5cf6", isDefault: true },
  { id: "done", name: t('tasks.statusDone'), color: "#10b981", isDefault: true },
]

interface TasksKanbanViewProps {
  searchQuery: string
  userFilter: string
  dealFilter: string
  contactFilter: string
  dateFilter: string
  statusFilter: string
}

export function TasksKanbanView({ searchQuery, userFilter, dealFilter, contactFilter, dateFilter, statusFilter }: TasksKanbanViewProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [stages, setStages] = useState<Stage[]>(getDefaultStages(t))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [insertAfterStageId, setInsertAfterStageId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Update stages when translation changes
  useEffect(() => {
    setStages(getDefaultStages(t))
  }, [t])

  // Load tasks from API
  const loadTasks = async () => {
    try {
      setLoading(true)
      const tasksData = await getTasks({
        status: statusFilter || undefined,
      })
      
      // Transform API tasks to component format
      const transformedTasks: Task[] = tasksData.map((task: any) => {
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
      
      console.log('Tasks loaded:', transformedTasks.length, 'Completed:', transformedTasks.filter(t => t.completed).length)
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

  useEffect(() => {
    loadTasks()
  }, [statusFilter, refreshKey, t])

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

  const handleAddStage = (name: string, color: string) => {
    const newStage: Stage = {
      id: `custom-${Date.now()}`,
      name,
      color,
      isDefault: false,
    }

    if (insertAfterStageId) {
      const insertIndex = stages.findIndex(s => s.id === insertAfterStageId)
      const newStages = [...stages]
      newStages.splice(insertIndex + 1, 0, newStage)
      setStages(newStages)
    } else {
      setStages([...stages, newStage])
    }

    setInsertAfterStageId(null)
  }

  const openAddStageModal = (afterStageId: string) => {
    setInsertAfterStageId(afterStageId)
    setIsModalOpen(true)
  }

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
      
      // Also reload tasks from API after a short delay to ensure consistency
      // This is especially important when status changes to DONE
      setTimeout(() => {
        console.log('TasksKanbanView: Refreshing tasks from API after update...')
        setRefreshKey(prev => prev + 1)
      }, 500)
      
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
        {stages.map((stage) => {
          // For "done" stage, show completed tasks (status DONE or completed=true)
          // For other stages, filter by status
          const stageTasks = stage.id === 'done' 
            ? filteredTasks.filter(t => t.completed || t.status === 'done')
            : filteredTasks.filter(t => t.status === stage.id && !t.completed)
          
          return (
            <div key={stage.id} className="flex-shrink-0 w-[280px]">
              <div className="rounded-md border border-border bg-card">
                {/* Column Header */}
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="text-xs font-medium text-foreground">{stage.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {stageTasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => openAddStageModal(stage.id)}
                    title={t('pipeline.addStageAfter')}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Tasks */}
                <div className="p-3 space-y-2 min-h-[200px]">
                  {stageTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onTaskUpdate={handleTaskUpdate}
                      onTaskDelete={handleTaskDelete}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <AddTaskStageModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setInsertAfterStageId(null)
        }}
        onAdd={handleAddStage}
      />
    </>
  )
}
