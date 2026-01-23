"use client"

import { useMemo } from 'react'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks'

export interface Task {
  id: string
  title: string
  description?: string
  dealId: string
  dealName?: string
  contactId?: string
  contactName?: string
  dueDate?: string
  assignee: {
    id: string
    name: string
    avatar?: string
  } | string
  status: 'open' | 'in_progress' | 'completed' | 'overdue'
  priority?: 'low' | 'medium' | 'high'
  completed: boolean
  result?: string
  createdAt: string
}

interface UseDealTasksOptions {
  dealId: string
}

export function useDealTasks({ dealId }: UseDealTasksOptions) {
  // React Query hook to fetch tasks for this deal
  const { data: tasksResponse, isLoading: loading, error: tasksError } = useTasks({
    dealId: dealId || undefined,
    limit: 100,
    enabled: !!dealId,
  })

  // Create task mutation
  const { mutate: createTaskMutation } = useCreateTask()

  // Update task mutation
  const { mutate: updateTaskMutation } = useUpdateTask()

  // Delete task mutation
  const { mutate: deleteTaskMutation } = useDeleteTask()

  // Transform API response to component format
  const tasks: Task[] = useMemo(() => {
    try {
      const apiTasks = Array.isArray(tasksResponse)
        ? tasksResponse
        : (tasksResponse as any)?.data || []

      return (apiTasks || []).map((task: any) => {
        try {
          return {
            id: task.id,
            title: task.title || 'Untitled Task',
            description: task.description,
            dealId: task.deal?.id || dealId,
            dealName: task.deal?.title || null,
            contactId: task.contact?.id || null,
            contactName: task.contact?.fullName || null,
            dueDate: task.deadline || undefined,
            assignee: task.assignedTo
              ? {
                  id: task.assignedTo.id || '',
                  name: task.assignedTo.name || 'Unassigned',
                  avatar: task.assignedTo.avatar,
                }
              : { id: '', name: 'Unassigned' },
            status: (task.status?.toLowerCase() || 'open') as 'open' | 'in_progress' | 'completed' | 'overdue',
            priority: (task.priority?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high',
            completed: task.status === 'DONE',
            result: task.result,
            createdAt: task.createdAt || new Date().toISOString(),
          }
        } catch (taskErr) {
          console.error('Error transforming task:', taskErr, task)
          return null
        }
      }).filter((task): task is Task => task !== null)
    } catch (err) {
      console.error('Failed to transform tasks:', err)
      return []
    }
  }, [tasksResponse, dealId])

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    return new Promise<Task>((resolve, reject) => {
      const statusMap: Record<string, string> = {
        open: 'TODO',
        in_progress: 'IN_PROGRESS',
        completed: 'DONE',
        overdue: 'OVERDUE',
      }
      const apiStatus = statusMap[taskData.status?.toLowerCase() || 'open'] || 'TODO'

      createTaskMutation(
        {
          title: taskData.title,
          description: taskData.description,
          status: apiStatus,
          priority: taskData.priority?.toUpperCase() || 'MEDIUM',
          deadline: taskData.dueDate,
          dealId: taskData.dealId || dealId,
          contactId: taskData.contactId,
          assignedToId: typeof taskData.assignee === 'string' ? taskData.assignee : taskData.assignee.id,
        },
        {
          onSuccess: (newTaskApi: any) => {
            console.log('Task created via API:', newTaskApi)
            const newTask: Task = {
              id: newTaskApi.id,
              title: newTaskApi.title,
              description: newTaskApi.description,
              dealId: newTaskApi.deal?.id || dealId,
              dealName: newTaskApi.deal?.title || null,
              contactId: newTaskApi.contact?.id || null,
              contactName: newTaskApi.contact?.fullName || null,
              dueDate: newTaskApi.deadline || undefined,
              assignee: newTaskApi.assignedTo
                ? {
                    id: newTaskApi.assignedTo.id,
                    name: newTaskApi.assignedTo.name,
                    avatar: newTaskApi.assignedTo.avatar,
                  }
                : { id: '', name: 'Unassigned' },
              status: (newTaskApi.status?.toLowerCase() as 'open' | 'in_progress' | 'completed' | 'overdue') || 'open',
              priority: (newTaskApi.priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
              completed: newTaskApi.status === 'DONE',
              result: newTaskApi.result,
              createdAt: newTaskApi.createdAt || new Date().toISOString(),
            }
            resolve(newTask)
          },
          onError: (error: any) => {
            console.error('Failed to create task:', error)
            reject(error)
          },
        }
      )
    })
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    return new Promise<void>((resolve, reject) => {
      const updateData: any = {}
      if (updates.title) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.status) updateData.status = updates.status.toUpperCase()
      if (updates.priority) updateData.priority = updates.priority.toUpperCase()
      if (updates.dueDate !== undefined) updateData.deadline = updates.dueDate
      if (updates.result !== undefined) updateData.result = updates.result

      updateTaskMutation(
        { id: taskId, data: updateData },
        {
          onSuccess: () => {
            console.log('Task updated successfully')
            resolve()
          },
          onError: (error: any) => {
            console.error('Failed to update task:', error)
            reject(error)
          },
        }
      )
    })
  }

  const deleteTask = async (taskId: string) => {
    return new Promise<void>((resolve, reject) => {
      deleteTaskMutation(taskId, {
        onSuccess: () => {
          console.log('Task deleted successfully')
          resolve()
        },
        onError: (error: any) => {
          console.error('Failed to delete task:', error)
          reject(error)
        },
      })
    })
  }

  return {
    tasks,
    loading,
    error: tasksError,
    createTask,
    updateTask,
    deleteTask,
  }
}
