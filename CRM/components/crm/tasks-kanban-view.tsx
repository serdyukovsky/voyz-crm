"use client"

import { useState, useEffect } from "react"
import { TaskCard } from "@/components/crm/task-card"
import { AddTaskStageModal } from "@/components/crm/add-task-stage-modal"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { getTasks } from '@/lib/api/tasks'

interface Task {
  id: string
  title: string
  dealId: string | null
  dealName: string | null
  contactId?: string | null
  contactName?: string | null
  dueDate: string
  assignee: string
  completed: boolean
  priority: "low" | "medium" | "high"
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

const defaultStages: Stage[] = [
  { id: "backlog", name: "Backlog", color: "#64748b", isDefault: true },
  { id: "todo", name: "To Do", color: "#3b82f6", isDefault: true },
  { id: "in_progress", name: "In Progress", color: "#8b5cf6", isDefault: true },
  { id: "done", name: "Done", color: "#10b981", isDefault: true },
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
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [stages, setStages] = useState<Stage[]>(defaultStages)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [insertAfterStageId, setInsertAfterStageId] = useState<string | null>(null)

  // Load tasks from API
  useEffect(() => {
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
          
          return {
            id: task.id,
            title: task.title,
            dealId: task.deal?.id || null,
            dealName: task.deal?.title || null,
            contactId: task.contact?.id || null,
            contactName: task.contact?.fullName || null,
            dueDate: task.deadline || '',
            assignee: task.assignedTo?.name || 'Unassigned',
            completed: task.status === 'DONE',
            priority: (task.priority?.toLowerCase() || 'medium') as "low" | "medium" | "high",
            status,
            description: task.description,
            createdAt: task.createdAt,
            result: task.result,
          }
        })
        
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

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ))
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageTasks = filteredTasks.filter(t => t.status === stage.id)
          
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
                    title="Add stage after this one"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Tasks */}
                <div className="p-3 space-y-2 min-h-[200px]">
                  {stageTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onTaskUpdate={handleTaskUpdate} />
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
