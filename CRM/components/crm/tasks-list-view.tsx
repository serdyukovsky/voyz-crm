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


const priorityColors = {
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

interface TasksListViewProps {
  searchQuery: string
  userFilter: string
  dealFilter: string
  contactFilter: string
  dateFilter: string
  statusFilter: string
}

function TasksListView({ searchQuery, userFilter, dealFilter, contactFilter, dateFilter, statusFilter }: TasksListViewProps) {
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
          assignee: task.assignedTo?.name || 'Unassigned',
          completed: task.status === 'DONE',
          priority: (task.priority?.toLowerCase() || 'medium') as "low" | "medium" | "high",
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
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ))
    setSelectedTask(updatedTask)
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
              <span className="sr-only">Status</span>
            </th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">Title</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">Deal</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">Contact</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">Due Date</th>
            <th className="p-3 text-left text-xs font-medium text-muted-foreground">Assigned</th>
            <th className="w-20 p-3 text-left text-xs font-medium text-muted-foreground">Priority</th>
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
                  aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
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
                <Badge 
                  variant="outline" 
                  className={`text-[10px] ${priorityColors[task.priority]}`}
                >
                  {task.priority}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredTasks.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No tasks found</p>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleTaskUpdate}
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
