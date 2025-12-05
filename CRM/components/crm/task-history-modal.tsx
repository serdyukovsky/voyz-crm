"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { getActivities, type Activity } from '@/lib/api/activities'

interface TaskHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  task: {
    id: string
    title: string
    createdAt?: string
    dueDate: string
    assignee: string
    assigneeId?: string
    description?: string
    dealName?: string | null
    contactName?: string | null
  }
  refreshTrigger?: number // Add refresh trigger to reload history when task is updated
}

export function TaskHistoryModal({ isOpen, onClose, task, refreshTrigger }: TaskHistoryModalProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)

  const loadHistory = async () => {
    if (!task.id) return
    
    setLoading(true)
    console.log('TaskHistoryModal: Loading history for task:', task.id)
    try {
      const data = await getActivities({
        entityType: 'task',
        entityId: task.id,
      })
      console.log('TaskHistoryModal: History loaded:', data.length, 'activities')
      console.log('TaskHistoryModal: Sample activities:', data.slice(0, 3))
      // Sort by date descending (newest first)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      setActivities(sorted)
    } catch (error) {
      console.error('TaskHistoryModal: Failed to load task history:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && task.id) {
      loadHistory()
    } else {
      // Clear activities when modal closes
      setActivities([])
    }
  }, [isOpen, task.id, refreshTrigger])

  const safeParseDate = (dateString: string | undefined | null): Date => {
    if (!dateString) return new Date()
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? new Date() : date
  }

  const formatActivityAction = (activity: Activity): string => {
    const field = activity.payload?.field
    const oldValue = activity.payload?.oldValue
    const newValue = activity.payload?.newValue

    switch (activity.type) {
      case 'TASK_CREATED':
        return 'Создана'
      case 'TASK_COMPLETED':
        return 'Завершена'
      case 'TASK_DELETED':
        return 'Удалена'
      case 'TASK_UPDATED':
        if (field === 'title') {
          return 'Изменено название'
        } else if (field === 'description') {
          return 'Изменено описание'
        } else if (field === 'deadline') {
          return 'Изменен срок выполнения'
        } else if (field === 'assignee') {
          return 'Изменен ответственный'
        } else if (field === 'dealId') {
          return 'Изменена привязка к сделке'
        } else if (field === 'contactId') {
          return 'Изменена привязка к контакту'
        } else if (field === 'status') {
          return 'Изменен статус'
        } else if (field === 'result') {
          return 'Добавлен результат'
        }
        return 'Обновлена'
      default:
        return 'Изменена'
    }
  }

  const formatActivityDetails = (activity: Activity): string => {
    const field = activity.payload?.field
    const oldValue = activity.payload?.oldValue
    const newValue = activity.payload?.newValue

    if (activity.type === 'TASK_CREATED') {
      return `Задача "${task.title}"`
    }

    if (field === 'deadline') {
      const oldDate = oldValue ? format(safeParseDate(oldValue), 'dd.MM.yyyy') : 'не установлен'
      const newDate = newValue ? format(safeParseDate(newValue), 'dd.MM.yyyy') : 'не установлен'
      return `с ${oldDate} на ${newDate}`
    }

    if (field === 'assignee') {
      return newValue || 'не назначен'
    }

    if (field === 'dealId') {
      return newValue || 'отвязана'
    }

    if (field === 'contactId') {
      return newValue || 'отвязан'
    }

    if (field === 'title') {
      return `"${oldValue}" → "${newValue}"`
    }

    if (field === 'description') {
      return newValue ? 'Описание обновлено' : 'Описание удалено'
    }

    if (field === 'status') {
      return `${oldValue} → ${newValue}`
    }

    if (field === 'result') {
      return newValue || ''
    }

    if (oldValue !== undefined && newValue !== undefined) {
      return `${oldValue} → ${newValue}`
    }

    return newValue || ''
  }

  // Sort activities by date (newest first) and add creation activity if no activities exist
  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA // Descending order (newest first)
  })
  
  const allActivities = sortedActivities.length > 0 
    ? sortedActivities 
    : task.createdAt 
      ? [{
          id: 'created',
          type: 'TASK_CREATED' as const,
          userId: '',
          createdAt: task.createdAt,
          user: {
            id: '',
            name: 'Система',
            email: '',
          },
          payload: {
            taskTitle: task.title,
          },
        }]
      : []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">История изменений</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">Загрузка...</div>
          ) : allActivities.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">История изменений пуста</div>
          ) : (
            allActivities.map((activity) => {
              const entryDate = safeParseDate(activity.createdAt)
              const action = formatActivityAction(activity)
              const details = formatActivityDetails(activity)
              
              return (
                <div key={activity.id} className="border-l-2 border-primary/40 pl-4 py-2">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-foreground">{action}</p>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{format(entryDate, 'dd.MM.yyyy')}</div>
                        <div>{format(entryDate, 'HH:mm')}</div>
                      </div>
                    </div>
                    {details && (
                      <p className="text-sm text-muted-foreground">{details}</p>
                    )}
                    <p className="text-xs text-muted-foreground/70">
                      {activity.user?.name || 'Система'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

