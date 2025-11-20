"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

interface Task {
  id: string
  title: string
  date: number
  month: number
  year: number
  dealId: string
  dealName: string
  assignee: string
  completed: boolean
  priority: "low" | "medium" | "high"
}

const initialTasks: Task[] = [
  { id: "1", title: "Follow up with decision maker", date: 15, month: 3, year: 2024, dealId: "1", dealName: "Acme Corp", assignee: "Alex Chen", completed: false, priority: "high" },
  { id: "2", title: "Send pricing proposal", date: 15, month: 3, year: 2024, dealId: "2", dealName: "TechStart", assignee: "Sarah Lee", completed: false, priority: "high" },
  { id: "3", title: "Schedule demo", date: 16, month: 3, year: 2024, dealId: "3", dealName: "CloudFlow", assignee: "Mike Johnson", completed: false, priority: "medium" },
  { id: "4", title: "Final presentation", date: 18, month: 3, year: 2024, dealId: "6", dealName: "InnovateLabs", assignee: "Mike Johnson", completed: false, priority: "high" },
  { id: "5", title: "Technical call", date: 20, month: 3, year: 2024, dealId: "5", dealName: "DesignHub", assignee: "Sarah Lee", completed: false, priority: "low" },
  { id: "6", title: "Contract review", date: 22, month: 3, year: 2024, dealId: "4", dealName: "DataCo", assignee: "Alex Chen", completed: false, priority: "medium" },
]

const priorityColors = {
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

export function CalendarView() {
  const [currentMonth] = useState("March 2024")
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  const daysInMonth = 31
  const startDay = 4 // March 2024 starts on Friday (4)

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: startDay }, (_, i) => i)

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
    if (selectedTask?.id === id) {
      setSelectedTask({ ...selectedTask, completed: !selectedTask.completed })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{currentMonth}</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card p-4">
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {/* Blank cells */}
          {blanks.map((blank) => (
            <div key={`blank-${blank}`} className="aspect-square" />
          ))}
          
          {/* Days */}
          {days.map((day) => {
            const dayTasks = tasks.filter(t => t.date === day && !t.completed)
            const isToday = day === 15
            
            return (
              <div
                key={day}
                className={`aspect-square rounded-md border p-2 ${
                  isToday ? "border-primary bg-primary/5" : "border-border bg-background"
                }`}
              >
                <div className="flex h-full flex-col">
                  <span className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                    {day}
                  </span>
                  <div className="space-y-1 overflow-hidden">
                    {dayTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full rounded px-1 py-0.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors truncate text-left"
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {selectedTask && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTask(null)}
        >
          <Card 
            className="w-full max-w-md border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Checkbox 
                  checked={selectedTask.completed}
                  onCheckedChange={() => toggleTask(selectedTask.id)}
                  className="mt-1"
                  aria-label={`Mark "${selectedTask.title}" as ${selectedTask.completed ? 'incomplete' : 'complete'}`}
                />
                <div className="flex-1">
                  <h3 className={`text-base font-semibold ${selectedTask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {selectedTask.title}
                  </h3>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTask(null)}
                className="h-8 w-8 -mr-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Deal</span>
                <Link
                  href={`/deals/${selectedTask.dealId}`}
                  className="text-primary hover:underline"
                  onClick={() => setSelectedTask(null)}
                >
                  {selectedTask.dealName}
                </Link>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Due Date</span>
                <span className="text-foreground">
                  {new Date(selectedTask.year, selectedTask.month - 1, selectedTask.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Assigned To</span>
                <span className="text-foreground">{selectedTask.assignee}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Priority</span>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] ${priorityColors[selectedTask.priority]}`}
                >
                  {selectedTask.priority}
                </Badge>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                Edit
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-red-400 hover:text-red-400">
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
