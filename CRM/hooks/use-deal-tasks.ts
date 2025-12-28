"use client"

import { useState, useEffect } from 'react'
import { getTasks, createTask as createTaskApi, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from '@/lib/api/tasks'

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const loadTasks = async () => {
    try {
      setLoading(true)
      console.log('Loading tasks for deal:', dealId)
      
      if (!dealId) {
        console.warn('No dealId provided, skipping task load')
        setTasks([])
        setLoading(false)
        return
      }
      
      const tasksResponse = await getTasks({ dealId })
      
      // Handle both array and paginated response
      const apiTasks = Array.isArray(tasksResponse) 
        ? tasksResponse 
        : (tasksResponse as any).data || []
      
      console.log('Loaded tasks from API:', apiTasks.length)
      
      // Transform API tasks to component format
      const transformedTasks: Task[] = (apiTasks || []).map((task: any) => {
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
            assignee: task.assignedTo ? {
              id: task.assignedTo.id || '',
              name: task.assignedTo.name || 'Unassigned',
              avatar: task.assignedTo.avatar
            } : { id: '', name: 'Unassigned' },
            status: (task.status?.toLowerCase() || 'open') as 'open' | 'in_progress' | 'completed' | 'overdue',
            priority: (task.priority?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high',
            completed: task.status === 'DONE',
            result: task.result,
            createdAt: task.createdAt || new Date().toISOString()
          }
        } catch (taskErr) {
          console.error('Error transforming task:', taskErr, task)
          return null
        }
      }).filter((task): task is Task => task !== null)
      
      console.log('Transformed tasks:', transformedTasks.length)
      setTasks(transformedTasks)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      // Don't throw error, just set empty array to prevent black screen
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dealId) {
      loadTasks()
    } else {
      setTasks([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId])

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      console.log('Creating task with data:', taskData)
      // Map status from component format to API format
      const statusMap: Record<string, string> = {
        'open': 'TODO',
        'in_progress': 'IN_PROGRESS',
        'completed': 'DONE',
        'overdue': 'OVERDUE'
      }
      const apiStatus = statusMap[taskData.status?.toLowerCase() || 'open'] || 'TODO'

      const newTaskApi = await createTaskApi({
        title: taskData.title,
        description: taskData.description,
        status: apiStatus,
        priority: taskData.priority?.toUpperCase() || 'MEDIUM',
        deadline: taskData.dueDate,
        dealId: taskData.dealId || dealId,
        contactId: taskData.contactId,
        assignedToId: typeof taskData.assignee === 'string' 
          ? taskData.assignee 
          : taskData.assignee.id
      })
      
      console.log('Task created via API:', newTaskApi)
      
      // Transform and add to local state
      const newTask: Task = {
        id: newTaskApi.id,
        title: newTaskApi.title,
        description: newTaskApi.description,
        dealId: newTaskApi.deal?.id || dealId,
        dealName: newTaskApi.deal?.title || null,
        contactId: newTaskApi.contact?.id || null,
        contactName: newTaskApi.contact?.fullName || null,
        dueDate: newTaskApi.deadline || undefined,
        assignee: newTaskApi.assignedTo ? {
          id: newTaskApi.assignedTo.id,
          name: newTaskApi.assignedTo.name,
          avatar: newTaskApi.assignedTo.avatar
        } : { id: '', name: 'Unassigned' },
        status: newTaskApi.status?.toLowerCase() as 'open' | 'in_progress' | 'completed' | 'overdue' || 'open',
        priority: newTaskApi.priority?.toLowerCase() as 'low' | 'medium' | 'high' || 'medium',
        completed: newTaskApi.status === 'DONE',
        result: newTaskApi.result,
        createdAt: newTaskApi.createdAt || new Date().toISOString()
      }
      
      setTasks(prev => [...prev, newTask])
      return newTask
    } catch (err) {
      console.error('Failed to create task:', err)
      throw err
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updateData: any = {}
      if (updates.title) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.status) updateData.status = updates.status.toUpperCase()
      if (updates.priority) updateData.priority = updates.priority.toUpperCase()
      if (updates.dueDate !== undefined) updateData.deadline = updates.dueDate
      if (updates.result !== undefined) updateData.result = updates.result
      
      const updatedTaskApi = await updateTaskApi(taskId, updateData)
      
      // Update local state
      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            ...updates,
            title: updatedTaskApi.title,
            description: updatedTaskApi.description,
            status: updatedTaskApi.status?.toLowerCase() as any || task.status,
            priority: updatedTaskApi.priority?.toLowerCase() as any || task.priority,
            dueDate: updatedTaskApi.deadline || task.dueDate,
            completed: updatedTaskApi.status === 'DONE'
          }
        }
        return task
      }))
    } catch (err) {
      console.error('Failed to update task:', err)
      throw err
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await deleteTaskApi(taskId)
      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (err) {
      console.error('Failed to delete task:', err)
      throw err
    }
  }

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    refetch: loadTasks
  }
}

