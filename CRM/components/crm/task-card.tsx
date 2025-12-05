"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Link as LinkIcon } from 'lucide-react'
import { TaskDetailModal } from "./task-detail-modal"
import { DealDetailModal } from "./deal-detail-modal"
import { useTranslation } from '@/lib/i18n/i18n-context'

interface Task {
  id: string
  title: string
  dealId: string | null
  dealName: string | null
  dueDate: string
  assignee: string
  completed: boolean
  status: string
  description?: string
  createdAt?: string
  result?: string
}

interface TaskCardProps {
  task: Task
  onTaskUpdate?: (task: Task, silent?: boolean) => void
  onTaskDelete?: (taskId: string) => void
}

export function TaskCard({ task, onTaskUpdate, onTaskDelete }: TaskCardProps) {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  const handleTaskClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsModalOpen(true)
  }

  const handleDealClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDealModalOpen(true)
  }

  const handleTaskUpdate = async (updatedTask: Task, silent?: boolean) => {
    console.log('TaskCard: handleTaskUpdate called with:', updatedTask)
    await onTaskUpdate?.(updatedTask, silent)
    console.log('TaskCard: handleTaskUpdate completed')
  }

  return (
    <>
      <Card className="p-3 border-border bg-card hover:border-primary/50 transition-colors cursor-pointer">
        <div className="space-y-2">
          {/* Title - clickable */}
          <h4 
            className="text-sm font-medium text-foreground leading-tight hover:text-primary transition-colors"
            onClick={handleTaskClick}
          >
            {task.title}
          </h4>

          {/* Deal Name - if task is linked to a deal */}
          {task.dealId && task.dealName && (
            <button
              onClick={handleDealClick}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline text-left"
            >
              <LinkIcon className="h-3 w-3" />
              <span>{task.dealName}</span>
            </button>
          )}

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
          </div>
        </div>
      </Card>

      <TaskDetailModal
        key={task.id + task.dueDate + task.assigneeId + task.dealId}
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleTaskUpdate}
        onDelete={onTaskDelete ? async (taskId: string) => {
          await onTaskDelete(taskId)
          setIsModalOpen(false)
        } : undefined}
      />

      {/* Deal Detail Modal */}
      {task.dealId && task.dealName && (
        <DealDetailModal
          deal={{
            id: task.dealId,
            title: task.dealName,
          }}
          isOpen={isDealModalOpen}
          onClose={() => setIsDealModalOpen(false)}
        />
      )}
    </>
  )
}
