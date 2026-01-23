"use client"

import { memo } from "react"

interface Task {
  id: string
  status: string
  deadline: string | null
}

interface TaskIndicatorProps {
  tasks?: Array<Task>
}

function isTaskOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  const deadlineDate = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return deadlineDate < today
}

function getDaysOverdue(deadline: string | null): number {
  if (!deadline) return 0
  const deadlineDate = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (deadlineDate >= today) return 0

  const diffInMs = today.getTime() - deadlineDate.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  return diffInDays
}

function hasActiveTasks(tasks?: Array<Task>): boolean {
  if (!tasks || tasks.length === 0) return false
  return tasks.some(task => task.status !== 'completed' && task.status !== 'done')
}

function hasOverdueTasks(tasks?: Array<Task>): boolean {
  if (!tasks || tasks.length === 0) return false
  return tasks.some(task => {
    const isCompleted = task.status === 'completed' || task.status === 'done'
    return !isCompleted && isTaskOverdue(task.deadline)
  })
}

function getMaxDaysOverdue(tasks?: Array<Task>): number {
  if (!tasks || tasks.length === 0) return 0

  let maxDays = 0
  tasks.forEach(task => {
    const isCompleted = task.status === 'completed' || task.status === 'done'
    if (!isCompleted && task.deadline) {
      const daysOverdue = getDaysOverdue(task.deadline)
      if (daysOverdue > maxDays) {
        maxDays = daysOverdue
      }
    }
  })

  return maxDays
}

export const TaskIndicator = memo(function TaskIndicator({ tasks }: TaskIndicatorProps) {
  // Check if there are any active tasks
  if (!hasActiveTasks(tasks)) {
    return null
  }

  // Determine if any task is overdue
  const hasOverdue = hasOverdueTasks(tasks)
  const maxDaysOverdue = hasOverdue ? getMaxDaysOverdue(tasks) : 0

  return (
    <div className="flex items-center gap-1 -m-1 p-1">
      {/* Days overdue text (only if overdue) */}
      {hasOverdue && maxDaysOverdue > 0 && (
        <span className="text-[10px] font-medium text-red-600">
          {maxDaysOverdue}дн
        </span>
      )}

      {/* Indicator circle */}
      <div
        className={`h-2 w-2 rounded-full flex-shrink-0 ${
          hasOverdue
            ? 'bg-red-500'
            : 'bg-yellow-400'
        }`}
        title={hasOverdue ? `Задача просрочена на ${maxDaysOverdue} дн.` : 'Есть активная задача'}
        aria-label={hasOverdue ? `Задача просрочена на ${maxDaysOverdue} дней` : 'Есть активная задача'}
      />
    </div>
  )
}, (prevProps, nextProps) => {
  // Memo comparison: return true if props are equal
  const prevTasks = prevProps.tasks || []
  const nextTasks = nextProps.tasks || []

  if (prevTasks.length !== nextTasks.length) return false

  // Compare each task
  return prevTasks.every((task, i) =>
    task.id === nextTasks[i].id &&
    task.status === nextTasks[i].status &&
    task.deadline === nextTasks[i].deadline
  )
})
