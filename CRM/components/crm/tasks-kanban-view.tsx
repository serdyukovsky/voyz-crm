"use client"

import { useState } from "react"
import { TaskCard } from "@/components/crm/task-card"
import { AddTaskStageModal } from "@/components/crm/add-task-stage-modal"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'

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

const initialTasks: Task[] = [
  { id: "1", title: "Follow up with decision maker", dealId: "1", dealName: "Acme Corp", dueDate: "2024-03-15", assignee: "Alex Chen", completed: false, priority: "high", status: "in_progress", description: "Call the decision maker to discuss pricing and timeline", createdAt: "2024-03-10T10:00:00" },
  { id: "2", title: "Send pricing proposal", dealId: "2", dealName: "TechStart", dueDate: "2024-03-15", assignee: "Sarah Lee", completed: false, priority: "high", status: "todo", description: "Prepare and send detailed pricing proposal for TechStart", createdAt: "2024-03-11T14:00:00" },
  { id: "3", title: "Schedule product demo", dealId: "3", dealName: "CloudFlow", dueDate: "2024-03-16", assignee: "Mike Johnson", completed: false, priority: "medium", status: "todo", description: "Coordinate with client to schedule a product demonstration", createdAt: "2024-03-12T09:00:00" },
  { id: "4", title: "Contract review meeting", dealId: "4", dealName: "DataCo", dueDate: "2024-03-14", assignee: "Alex Chen", completed: true, priority: "medium", status: "done", description: "Review contract terms and conditions with legal team", createdAt: "2024-03-09T11:00:00" },
  { id: "5", title: "Technical requirements call", dealId: "5", dealName: "DesignHub", dueDate: "2024-03-20", assignee: "Sarah Lee", completed: false, priority: "low", status: "backlog", description: "Discuss technical requirements and integration details", createdAt: "2024-03-13T16:00:00" },
  { id: "6", title: "Final proposal presentation", dealId: "6", dealName: "InnovateLabs", dueDate: "2024-03-18", assignee: "Mike Johnson", completed: false, priority: "high", status: "in_progress", description: "Prepare final presentation and present to the client", createdAt: "2024-03-14T08:00:00" },
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
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [stages, setStages] = useState<Stage[]>(defaultStages)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [insertAfterStageId, setInsertAfterStageId] = useState<string | null>(null)

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
