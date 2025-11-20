"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User } from 'lucide-react'

interface Task {
  id: string
  title: string
  dealId: string
  dealName: string
  dueDate: string
  assignee: string
  completed: boolean
  priority: "low" | "medium" | "high"
  status: string
}

interface TaskCardProps {
  task: Task
}

const priorityColors = {
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

export function TaskCard({ task }: TaskCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <Card className="p-3 border-border bg-card hover:border-primary/50 transition-colors cursor-pointer">
      <div className="space-y-2">
        {/* Title */}
        <h4 className="text-sm font-medium text-foreground leading-tight">
          {task.title}
        </h4>

        {/* Due Date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {/* Assignee Avatar */}
          <div 
            className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20"
            title={task.assignee}
          >
            <span className="text-[10px] font-medium text-primary">
              {getInitials(task.assignee)}
            </span>
          </div>

          {/* Priority Badge */}
          <Badge 
            variant="outline" 
            className={`text-[10px] ${priorityColors[task.priority]}`}
          >
            {task.priority}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
