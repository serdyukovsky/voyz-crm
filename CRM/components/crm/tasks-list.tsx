"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Filter, X } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Task {
  id: string
  title: string
  dealId: string
  dealName: string
  dueDate: string
  assignee: string
  completed: boolean
  priority: "low" | "medium" | "high"
}

const initialTasks: Task[] = [
  { id: "1", title: "Follow up with decision maker", dealId: "1", dealName: "Acme Corp - Enterprise", dueDate: "2024-03-15", assignee: "Alex Chen", completed: false, priority: "high" },
  { id: "2", title: "Send pricing proposal", dealId: "2", dealName: "TechStart Solutions", dueDate: "2024-03-15", assignee: "Sarah Lee", completed: false, priority: "high" },
  { id: "3", title: "Schedule product demo", dealId: "3", dealName: "CloudFlow Inc", dueDate: "2024-03-16", assignee: "Mike Johnson", completed: false, priority: "medium" },
  { id: "4", title: "Contract review meeting", dealId: "4", dealName: "DataCo Analytics", dueDate: "2024-03-14", assignee: "Alex Chen", completed: true, priority: "medium" },
  { id: "5", title: "Technical requirements call", dealId: "5", dealName: "DesignHub", dueDate: "2024-03-20", assignee: "Sarah Lee", completed: false, priority: "low" },
  { id: "6", title: "Final proposal presentation", dealId: "6", dealName: "InnovateLabs", dueDate: "2024-03-18", assignee: "Mike Johnson", completed: false, priority: "high" },
]

const priorityColors = {
  low: "bg-slate-500/10 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 dark:border-slate-500/20",
  medium: "bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/20",
  high: "bg-orange-500/10 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 dark:border-orange-500/20",
}

export function TasksList() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [userFilter, setUserFilter] = useState<string | null>(null)
  const [dealFilter, setDealFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  const uniqueUsers = Array.from(new Set(tasks.map(t => t.assignee)))
  const uniqueDeals = Array.from(new Set(tasks.map(t => t.dealName)))

  const filteredTasks = tasks.filter(task => {
    if (userFilter && task.assignee !== userFilter) return false
    if (dealFilter && task.dealName !== dealFilter) return false
    if (dateFilter) {
      const taskDate = new Date(task.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dateFilter === 'today' && taskDate.toDateString() !== today.toDateString()) return false
      if (dateFilter === 'overdue' && taskDate >= today) return false
      if (dateFilter === 'upcoming' && taskDate <= today) return false
    }
    return true
  })

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const clearFilters = () => {
    setUserFilter(null)
    setDealFilter(null)
    setDateFilter(null)
  }

  const hasActiveFilters = userFilter || dealFilter || dateFilter

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />
          <span>Filters:</span>
        </div>
        
        <select
          value={userFilter || ""}
          onChange={(e) => setUserFilter(e.target.value || null)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Filter by user"
        >
          <option value="">All Users</option>
          {uniqueUsers.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>

        <select
          value={dealFilter || ""}
          onChange={(e) => setDealFilter(e.target.value || null)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Filter by deal"
        >
          <option value="">All Deals</option>
          {uniqueDeals.map((deal) => (
            <option key={deal} value={deal}>{deal}</option>
          ))}
        </select>

        <select
          value={dateFilter || ""}
          onChange={(e) => setDateFilter(e.target.value || null)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Filter by date"
        >
          <option value="">All Dates</option>
          <option value="today">Due Today</option>
          <option value="overdue">Overdue</option>
          <option value="upcoming">Upcoming</option>
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          {filteredTasks.length} tasks
        </div>
      </div>

      <div className="rounded-md border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 p-3 text-left">
                <span className="sr-only">Status</span>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Title</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Deal</th>
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
                  <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </span>
                </td>
                <td className="p-3">
                  <Link
                    href={`/deals/${task.dealId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {task.dealName}
                  </Link>
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
      </div>
    </div>
  )
}
