"use client"

import { useState, useEffect } from 'react'

export interface Task {
  id: string
  title: string
  description?: string
  dealId: string
  dealName?: string
  dueDate?: string
  assignee: {
    id: string
    name: string
    avatar?: string
  }
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
      // TODO: Fetch from API
      // const response = await fetch(`/api/deals/${dealId}/tasks`)
      // const data = await response.json()
      
      // Mock data for now - empty for new deals
      setTasks([])
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [dealId])

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    // TODO: Create via API
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    setTasks(prev => [...prev, newTask])
    return newTask
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    // TODO: Update via API
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ))
  }

  const deleteTask = async (taskId: string) => {
    // TODO: Delete via API
    setTasks(prev => prev.filter(task => task.id !== taskId))
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

