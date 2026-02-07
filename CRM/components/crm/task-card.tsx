"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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
  assigneeAvatar?: string | null
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
  selectedTaskId?: string | null
  onTaskSelect?: (taskId: string | null) => void
}

export function TaskCard({ task, onTaskUpdate, onTaskDelete, selectedTaskId, onTaskSelect }: TaskCardProps) {
  const { t } = useTranslation()
  // Initialize modal state from selectedTaskId
  const [isModalOpen, setIsModalOpen] = useState(() => selectedTaskId === task.id)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)

  // Sync modal state with selectedTaskId from URL
  useEffect(() => {
    const shouldBeOpen = selectedTaskId === task.id
    console.log('TaskCard: useEffect - syncing modal', { 
      taskId: task.id, 
      selectedTaskId: selectedTaskId || 'null', 
      shouldBeOpen
    })
    
    // Always sync with selectedTaskId - this is the source of truth
    // Use functional update to avoid stale closure issues
    setIsModalOpen(prev => {
      if (prev !== shouldBeOpen) {
        console.log('TaskCard: Updating modal state from', prev, 'to', shouldBeOpen, 'for task:', task.id)
        return shouldBeOpen
      }
      return prev
    })
  }, [selectedTaskId, task.id])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  const handleTaskClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    console.log('TaskCard: handleTaskClick called for task:', task.id)
    
    // Open modal immediately
    setIsModalOpen(true)
    
    // Update URL and state - this will trigger useEffect to keep modal open
    if (onTaskSelect) {
      console.log('TaskCard: Calling onTaskSelect with taskId:', task.id)
      onTaskSelect(task.id)
    } else {
      // Fallback: update URL directly
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        params.set('task', task.id)
        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.pushState({}, '', newUrl)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
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
            <Avatar className="h-6 w-6" title={task.assignee}>
              {task.assigneeAvatar && (
                <AvatarImage src={task.assigneeAvatar} alt={task.assignee} />
              )}
              <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                {getInitials(task.assignee)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </Card>

      <TaskDetailModal
        key={task.id + task.dueDate + (task.dealId || '')}
        task={task}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          // Clear URL
          if (onTaskSelect) {
            onTaskSelect(null)
          } else {
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search)
              params.delete('task')
              const queryString = params.toString()
              const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`
              window.history.pushState({}, '', newUrl)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }
        }}
        onUpdate={handleTaskUpdate}
        onDelete={onTaskDelete ? async (taskId: string) => {
          await onTaskDelete(taskId)
          setIsModalOpen(false)
          if (onTaskSelect) {
            onTaskSelect(null)
          } else {
            // Fallback: clear URL directly
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search)
              params.delete('task')
              const queryString = params.toString()
              const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`
              window.history.pushState({}, '', newUrl)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }
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
