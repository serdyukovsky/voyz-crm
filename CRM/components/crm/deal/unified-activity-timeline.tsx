"use client"

import { useState } from 'react'
import { CheckCircle2, MessageSquare, FileText, Clock, UserPlus, Edit, Tag, Filter } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Activity, ActivityType } from '@/hooks/use-deal-activity'
import type { Task } from '@/hooks/use-deal-tasks'
import { TaskCard } from '../task-card'
import { TaskDetailModal } from '../task-detail-modal'

interface Comment {
  id: string
  type: 'comment' | 'internal_note' | 'client_message'
  message: string
  user: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  files?: Array<{ id: string; name: string; url: string }>
}

interface UnifiedActivityTimelineProps {
  activities: Activity[]
  tasks: Task[]
  comments: Comment[]
  onTaskClick?: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>
}

type FilterType = 'all' | 'activities' | 'tasks' | 'comments' | 'files' | 'changes'

const activityIcons: Record<ActivityType, typeof CheckCircle2> = {
  deal_created: UserPlus,
  field_updated: Edit,
  task_created: CheckCircle2,
  task_updated: CheckCircle2,
  task_completed: CheckCircle2,
  file_uploaded: FileText,
  stage_changed: Tag,
  comment: MessageSquare,
  internal_note: MessageSquare,
  client_message: MessageSquare
}

export function UnifiedActivityTimeline({
  activities,
  tasks,
  comments,
  onTaskClick,
  onTaskUpdate
}: UnifiedActivityTimelineProps) {
  const [selectedFilters, setSelectedFilters] = useState<FilterType[]>(['all'])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const filterOptions: Array<{ value: FilterType; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'activities', label: 'Activities' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'comments', label: 'Comments' },
    { value: 'files', label: 'Files' },
    { value: 'changes', label: 'Changes' }
  ]

  const toggleFilter = (filter: FilterType) => {
    if (filter === 'all') {
      setSelectedFilters(['all'])
    } else {
      setSelectedFilters(prev => {
        const newFilters = prev.includes(filter)
          ? prev.filter(f => f !== filter)
          : [...prev.filter(f => f !== 'all'), filter]
        return newFilters.length === 0 ? ['all'] : newFilters
      })
    }
  }

  // Helper function to safely create a date
  const safeDate = (dateValue: any): Date => {
    if (!dateValue) return new Date()
    const date = new Date(dateValue)
    return isNaN(date.getTime()) ? new Date() : date
  }

  // Merge all events into unified timeline
  const allEvents = [
    ...activities.map(a => ({ type: 'activity' as const, data: a, date: safeDate(a.dateSort) })),
    ...tasks.map(t => ({ type: 'task' as const, data: t, date: safeDate(t.createdAt) })),
    ...comments.map(c => ({ type: 'comment' as const, data: c, date: safeDate(c.createdAt) }))
  ]
    .filter(event => {
      // Filter out invalid dates
      const timestamp = event.date.getTime()
      return !isNaN(timestamp) && isFinite(timestamp)
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  // Filter events
  const filteredEvents = allEvents.filter(event => {
    if (selectedFilters.includes('all')) return true
    if (selectedFilters.includes('tasks') && event.type === 'task') return true
    if (selectedFilters.includes('comments') && event.type === 'comment') return true
    if (selectedFilters.includes('activities') && event.type === 'activity') {
      const activity = event.data as Activity
      if (selectedFilters.includes('files') && activity.type === 'file_uploaded') return true
      if (selectedFilters.includes('changes') && ['field_updated', 'stage_changed'].includes(activity.type)) return true
      if (!['files', 'changes'].some(f => selectedFilters.includes(f as FilterType))) return true
    }
    return false
  })

  if (filteredEvents.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No activity yet
      </div>
    )
  }

  // Group by date
  const grouped = filteredEvents.reduce((acc, event) => {
    // Validate date before formatting
    if (!event.date || isNaN(event.date.getTime())) {
      return acc
    }
    const dateKey = format(event.date, 'yyyy-MM-dd')
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(event)
    return acc
  }, {} as Record<string, typeof filteredEvents>)

  const sortedDates = Object.keys(grouped).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Activity</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-2">
              {filterOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={selectedFilters.includes(option.value)}
                    onCheckedChange={() => toggleFilter(option.value)}
                  />
                  <Label
                    htmlFor={option.value}
                    className="text-xs cursor-pointer flex-1"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-6">
        {sortedDates.map((dateKey) => {
          const dateEvents = grouped[dateKey]
          const date = new Date(dateKey)
          if (isNaN(date.getTime())) {
            return null
          }
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey
          const isYesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === dateKey

          let dateLabel = format(date, 'MMMM d, yyyy')
          if (isToday) dateLabel = 'Today'
          if (isYesterday) dateLabel = 'Yesterday'

          return (
            <div key={dateKey} className="space-y-4">
              <div className="sticky top-0 z-10 bg-card py-2">
                <h4 className="text-xs font-semibold text-foreground">{dateLabel}</h4>
              </div>
              {dateEvents.map((event, index) => {
                if (event.type === 'task') {
                  const task = event.data as Task
                  return (
                    <div key={`task-${task.id}`} className="flex gap-3 relative">
                      {index !== dateEvents.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-0 w-px bg-border/50" />
                      )}
                      <div className="relative z-10 mt-0.5">
                        <div className="rounded-full bg-primary/10 p-1.5">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 pb-2" onClick={() => {
                        setSelectedTask(task)
                        setIsTaskModalOpen(true)
                        onTaskClick?.(task)
                      }}>
                        <TaskCard
                          task={{
                            ...task,
                            assignee: typeof task.assignee === 'string' ? task.assignee : task.assignee.name,
                            dealId: task.dealId || null,
                            dealName: task.dealName || null
                          } as any}
                          onTaskUpdate={onTaskUpdate ? async (updatedTask: any) => {
                            await onTaskUpdate(task.id, updatedTask)
                          } : undefined}
                        />
                      </div>
                    </div>
                  )
                }

                if (event.type === 'comment') {
                  const comment = event.data as Comment
                  const Icon = comment.type === 'comment' ? MessageSquare : 
                              comment.type === 'internal_note' ? MessageSquare : MessageSquare
                  return (
                    <div key={`comment-${comment.id}`} className="flex gap-3 relative">
                      {index !== dateEvents.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-0 w-px bg-border/50" />
                      )}
                      <div className="relative z-10 mt-0.5">
                        <div className="rounded-full bg-accent/50 p-1.5">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="font-medium">{comment.user.name}</span>
                          {' '}
                          <span className="text-muted-foreground">
                            {comment.type === 'comment' ? 'added a comment' :
                             comment.type === 'internal_note' ? 'added an internal note' :
                             'sent a message to client'}
                            : {comment.message}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {comment.createdAt && !isNaN(new Date(comment.createdAt).getTime())
                            ? format(new Date(comment.createdAt), 'h:mm a')
                            : ''}
                        </p>
                        {comment.files && comment.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {comment.files.map((file) => (
                              <a
                                key={file.id}
                                href={file.url}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <FileText className="h-3 w-3" />
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }

                if (event.type === 'activity') {
                  const activity = event.data as Activity
                  const Icon = activityIcons[activity.type] || Clock
                  return (
                    <div key={`activity-${activity.id}`} className="flex gap-3 relative">
                      {index !== dateEvents.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-0 w-px bg-border/50" />
                      )}
                      <div className="relative z-10 mt-0.5">
                        <div className="rounded-full bg-primary/10 p-1.5">
                          <Icon className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="font-medium">{activity.user.name}</span>
                          {' '}
                          {activity.type === 'field_updated' && activity.fieldName && (
                            <>
                              updated <span className="font-medium">{activity.fieldName}</span>
                              {activity.oldValue !== undefined && activity.newValue !== undefined && (
                                <>
                                  {' '}from <span className="text-muted-foreground">{String(activity.oldValue)}</span>
                                  {' '}to <span className="text-muted-foreground">{String(activity.newValue)}</span>
                                </>
                              )}
                            </>
                          )}
                          {activity.type === 'stage_changed' && activity.message && (
                            <span className="text-muted-foreground">{activity.message}</span>
                          )}
                          {activity.type === 'file_uploaded' && activity.fileName && (
                            <>
                              uploaded <span className="font-medium">{activity.fileName}</span>
                              {activity.fileSize && (
                                <span className="text-muted-foreground"> ({activity.fileSize})</span>
                              )}
                            </>
                          )}
                          {activity.type === 'task_created' && activity.taskTitle && (
                            <>
                              created task <span className="font-medium">{activity.taskTitle}</span>
                            </>
                          )}
                          {activity.type === 'task_completed' && activity.taskTitle && (
                            <>
                              completed task <span className="font-medium">{activity.taskTitle}</span>
                            </>
                          )}
                          {activity.type === 'deal_created' && (
                            <span className="text-muted-foreground">created this deal</span>
                          )}
                          {activity.message && !activity.fieldName && !activity.fileName && !activity.taskTitle && (
                            <span className="text-muted-foreground">{activity.message}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.dateSort && !isNaN(new Date(activity.dateSort).getTime())
                            ? format(new Date(activity.dateSort), 'h:mm a')
                            : ''}
                        </p>
                      </div>
                    </div>
                  )
                }

                return null
              })}
            </div>
          )
        })}
      </div>

      {isTaskModalOpen && selectedTask && (
        <TaskDetailModal
          task={{
            ...selectedTask,
            assignee: typeof selectedTask.assignee === 'string' ? selectedTask.assignee : selectedTask.assignee.name,
            dealId: selectedTask.dealId || null,
            dealName: selectedTask.dealName || null
          } as any}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false)
            setSelectedTask(null)
          }}
          onUpdate={onTaskUpdate ? async (updatedTask: any) => {
            await onTaskUpdate(selectedTask.id, updatedTask)
          } : undefined}
        />
      )}
    </>
  )
}

