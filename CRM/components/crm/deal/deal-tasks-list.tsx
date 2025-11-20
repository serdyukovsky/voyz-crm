"use client"

import { useState } from 'react'
import { Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { TaskCard } from '../task-card'
import { TaskDetailModal } from '../task-detail-modal'
import type { Task } from '@/hooks/use-deal-tasks'

interface DealTasksListProps {
  tasks: Task[]
  onTaskCreate: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskClick?: (task: Task) => void
}

export function DealTasksList({
  tasks,
  onTaskCreate,
  onTaskUpdate,
  onTaskClick
}: DealTasksListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const statusIcons = {
    open: Clock,
    in_progress: Clock,
    completed: CheckCircle2,
    overdue: AlertCircle
  }

  const openTasks = tasks.filter(t => !t.completed && t.status !== 'completed')
  const completedTasks = tasks.filter(t => t.completed || t.status === 'completed')

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
    onTaskClick?.(task)
  }

  const handleTaskUpdateWrapper = async (updatedTask: Task) => {
    await onTaskUpdate(updatedTask.id, updatedTask)
  }

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {openTasks.map((task) => (
        <div key={task.id} onClick={() => handleTaskClick(task)}>
          <TaskCard 
            task={{
              ...task,
              assignee: typeof task.assignee === 'string' ? task.assignee : task.assignee.name,
              dealId: task.dealId || null,
              dealName: task.dealName || null
            } as any} 
            onTaskUpdate={handleTaskUpdateWrapper as any} 
          />
        </div>
      ))}
      {completedTasks.length > 0 && (
        <>
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Completed</p>
            {completedTasks.map((task) => (
              <div key={task.id} onClick={() => handleTaskClick(task)}>
                <TaskCard 
                  task={{
                    ...task,
                    assignee: typeof task.assignee === 'string' ? task.assignee : task.assignee.name,
                    dealId: task.dealId || null,
                    dealName: task.dealName || null
                  } as any} 
                  onTaskUpdate={handleTaskUpdateWrapper as any} 
                />
              </div>
            ))}
          </div>
        </>
      )}

      {isModalOpen && selectedTask && (
        <TaskDetailModal
          task={{
            ...selectedTask,
            assignee: typeof selectedTask.assignee === 'string' ? selectedTask.assignee : selectedTask.assignee.name,
            dealId: selectedTask.dealId || null,
            dealName: selectedTask.dealName || null
          } as any}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTask(null)
          }}
          onUpdate={handleTaskUpdateWrapper as any}
        />
      )}
    </div>
  )
}
