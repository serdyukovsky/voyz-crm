"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from 'react-router-dom'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { getTasks } from '@/lib/api/tasks'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO } from 'date-fns'

interface Task {
  id: string
  title: string
  dueDate: string
  dealId: string | null
  dealName: string | null
  assignee: string
  completed: boolean
}


export function CalendarView() {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Load tasks from API
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true)
        const tasksResponse = await getTasks()
        
        // Handle both array and paginated response
        const tasksData = Array.isArray(tasksResponse) 
          ? tasksResponse 
          : (tasksResponse as any).data || []
        
        // Transform API tasks to component format
        const transformedTasks: Task[] = tasksData.map((task: any) => ({
          id: task.id,
          title: task.title,
          dueDate: task.deadline || '',
          dealId: task.deal?.id || null,
          dealName: task.deal?.title || null,
          assignee: task.assignedTo?.name || t('tasks.unassigned'),
          completed: task.status === 'DONE',
        }))
        
        setTasks(transformedTasks)
      } catch (error) {
        console.error('Failed to load tasks:', error)
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    
    loadTasks()
  }, [t])
  
  
  // Week starts with Monday (0 = Monday, 6 = Sunday)
  const weekDays = [
    t('calendar.monday'),
    t('calendar.tuesday'),
    t('calendar.wednesday'),
    t('calendar.thursday'),
    t('calendar.friday'),
    t('calendar.saturday'),
    t('calendar.sunday'),
  ]
  
  // Get month start and end dates
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  // Get all days in the month
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Get the day of week for the first day (0 = Monday, 6 = Sunday)
  // JavaScript getDay() returns 0 = Sunday, 1 = Monday, etc.
  // We need to convert: 0 (Sun) -> 6, 1 (Mon) -> 0, 2 (Tue) -> 1, etc.
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7 // Convert to Monday = 0
  
  // Create calendar grid: blanks + month days
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i)
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }
  
  // Get tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter(task => {
      if (!task.dueDate) return false
      try {
        const taskDate = parseISO(task.dueDate)
        return isSameDay(taskDate, date) && !task.completed
      } catch {
        return false
      }
    })
  }

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
    if (selectedTask?.id === id) {
      setSelectedTask({ ...selectedTask, completed: !selectedTask.completed })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {format(currentDate, 'MMMM yyyy', { locale: undefined })}
        </h2>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card p-4">
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers - starting with Monday */}
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day.substring(0, 3)}
            </div>
          ))}
          
          {/* Blank cells for days before month start */}
          {blanks.map((blank) => (
            <div key={`blank-${blank}`} className="aspect-square" />
          ))}
          
          {/* Month days */}
          {monthDays.map((date) => {
            const dayTasks = getTasksForDate(date)
            const dayIsToday = isToday(date)
            
            return (
              <div
                key={date.toISOString()}
                className={`aspect-square rounded-md border p-2 ${
                  dayIsToday ? "border-primary bg-primary/5" : "border-border bg-background"
                }`}
              >
                <div className="flex h-full flex-col">
                  <span className={`text-xs font-medium mb-1 ${dayIsToday ? "text-primary" : "text-foreground"}`}>
                    {format(date, 'd')}
                  </span>
                  <div className="space-y-1 overflow-hidden flex-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full rounded px-1 py-0.5 text-[10px] hover:opacity-80 transition-colors truncate text-left border border-border bg-background"
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayTasks.length - 3} {t('tasks.more')}
                      </div>
                    )}
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
                  aria-label={`${t('tasks.markAs')} "${selectedTask.title}" ${selectedTask.completed ? t('tasks.incomplete') : t('tasks.completed')}`}
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
              {selectedTask.dealId && selectedTask.dealName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('tasks.taskDeal')}</span>
                  <Link
                    to={`/deals/${selectedTask.dealId}`}
                    className="text-primary hover:underline"
                    onClick={() => setSelectedTask(null)}
                  >
                    {selectedTask.dealName}
                  </Link>
                </div>
              )}

              {selectedTask.dueDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('tasks.taskDeadline')}</span>
                  <span className="text-foreground">
                    {format(parseISO(selectedTask.dueDate), 'PPP', { locale: undefined })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('tasks.assignedTo')}</span>
                <span className="text-foreground">{selectedTask.assignee}</span>
              </div>

            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
