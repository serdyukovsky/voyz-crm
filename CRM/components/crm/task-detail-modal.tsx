"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as CalendarIcon, Clock, User, Link as LinkIcon, Trash2, Search, History, Check, Undo2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { DealDetailModal } from "./deal-detail-modal"
import { TaskHistoryModal } from "./task-history-modal"
import { getUsers, type User as UserType } from '@/lib/api/users'
import { getDeals, type Deal as DealType } from '@/lib/api/deals'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { useToastNotification } from '@/hooks/use-toast-notification'

interface Task {
  id: string
  title: string
  dealId: string | null
  dealName: string | null
  contactId?: string | null
  contactName?: string | null
  dueDate: string
  assignee: string
  assigneeId?: string
  completed: boolean
  status: string
  description?: string
  createdAt?: string
  result?: string
}

interface TaskDetailModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdate: (task: Task, silent?: boolean) => void | Promise<void>
  onDelete?: (taskId: string) => Promise<void>
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [result, setResult] = useState(task.result || "")
  const [dueDate, setDueDate] = useState(task.dueDate)
  const [description, setDescription] = useState(task.description || "")
  const [title, setTitle] = useState(task.title)
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assigneeId || null)
  const [dealId, setDealId] = useState<string | null>(task.dealId || null)
  const [users, setUsers] = useState<UserType[]>([])
  const [deals, setDeals] = useState<DealType[]>([])
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [isRescheduleDropdownOpen, setIsRescheduleDropdownOpen] = useState(false)
  const [isDealSelectOpen, setIsDealSelectOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)
  const calendarButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      console.log('TaskDetailModal: Task prop changed, updating state:', {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        assigneeId: task.assigneeId,
        dealId: task.dealId,
        result: task.result,
      })
      setResult(task.result || "")
      setDueDate(task.dueDate)
      setDescription(task.description || "")
      setTitle(task.title)
      setAssigneeId(task.assigneeId || null)
      setDealId(task.dealId || null)
    }
  }, [task, isOpen])

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const [usersData, dealsData] = await Promise.all([
            getUsers(),
            getDeals(),
          ])
          setUsers(usersData)
          setDeals(dealsData)
        } catch (error) {
          console.error('Failed to load data:', error)
        }
      }
      loadData()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (!isEditingTitle && title !== task.title && title.trim()) {
      const timeoutId = setTimeout(() => {
        const updatedTask = {
          ...task,
          title,
        }
        onUpdate(updatedTask, true)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [title, isEditingTitle, isOpen, task.title, task, onUpdate])

  useEffect(() => {
    if (!isOpen) return
    if (!isEditingDescription && description !== (task.description || "")) {
      const timeoutId = setTimeout(async () => {
        console.log('TaskDetailModal: Auto-saving description:', description)
        const updatedTask = {
          ...task,
          description,
        }
        console.log('TaskDetailModal: Updated task with description:', updatedTask)
        await onUpdate(updatedTask, true)
        // Refresh history after update
        setHistoryRefreshTrigger(prev => prev + 1)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [description, isEditingDescription, isOpen, task.description, task, onUpdate])


  useEffect(() => {
    if (!isOpen) return
    const current = task.assigneeId ?? null
    const next = assigneeId ?? null
    if (next !== current && users.length > 0) {
      const selectedUser = users.find((u) => u.id === assigneeId)
      const updatedTask = {
        ...task,
        assigneeId: assigneeId || undefined,
        assignee: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : task.assignee,
      }
      onUpdate(updatedTask, true).then(() => {
        // Refresh history after update
        setHistoryRefreshTrigger(prev => prev + 1)
      })
    }
  }, [assigneeId, users, isOpen, task.assigneeId, task, onUpdate])

  useEffect(() => {
    if (!isOpen) return
    const current = task.dealId ?? null
    const next = dealId ?? null
    if (next !== current && deals.length > 0) {
      const selectedDeal = deals.find((d) => d.id === dealId)
      const updatedTask = {
        ...task,
        dealId: dealId || undefined,
        dealName: selectedDeal?.title || undefined,
      }
      onUpdate(updatedTask, true).then(() => {
        // Refresh history after update
        setHistoryRefreshTrigger(prev => prev + 1)
      })
    }
  }, [dealId, deals, isOpen, task.dealId, task, onUpdate])

  useEffect(() => {
    if (!isOpen) return
    if (result !== (task.result || "")) {
      const timeoutId = setTimeout(async () => {
        const updatedTask = {
          ...task,
          result,
        }
        await onUpdate(updatedTask, true)
        // Refresh history after update
        setHistoryRefreshTrigger(prev => prev + 1)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [result, isOpen, task.result, task, onUpdate])

  const handleTitleDoubleClick = () => {
    setIsEditingTitle(true)
  }

  const safeParseDate = (dateString: string | undefined | null): Date => {
    if (!dateString) return new Date()
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? new Date() : date
  }

  const handleReschedule = async (days: number | null, date?: Date) => {
    let newDate: Date
    if (date) {
      newDate = date
    } else if (days !== null) {
      const currentDate = safeParseDate(dueDate)
      newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + days)
    } else {
      return
    }

    if (isNaN(newDate.getTime())) {
      console.error('Invalid date in handleReschedule:', newDate)
      return
    }

    const formattedDate = format(newDate, "yyyy-MM-dd")
    console.log('TaskDetailModal: Changing dueDate from', dueDate, 'to', formattedDate)
    setDueDate(formattedDate)
    
    // Immediately save the change
    const updatedTask = {
      ...task,
      dueDate: formattedDate,
    }
    console.log('TaskDetailModal: Calling onUpdate with updatedTask:', updatedTask)
    await onUpdate(updatedTask, true)
    console.log('TaskDetailModal: onUpdate completed')
    // Refresh history after update
    setHistoryRefreshTrigger(prev => prev + 1)
  }

  const handleCustomDate = (date: Date | undefined) => {
    if (date) {
      handleReschedule(null, date)
      setIsCalendarOpen(false)
    }
  }

  const handleComplete = async () => {
    if (!result.trim()) {
      showError(t('tasks.resultRequired') || 'Please enter a result to complete the task')
      return
    }

    // If dueDate is not set, set it to current date
    let finalDueDate = dueDate || task.dueDate
    if (!finalDueDate || finalDueDate.trim() === '') {
      const now = new Date()
      finalDueDate = format(now, 'yyyy-MM-dd')
      setDueDate(finalDueDate)
    }

    const updatedTask = {
      ...task,
      result,
      dueDate: finalDueDate,
      status: 'DONE',
      completed: true,
      dealId: dealId || task.dealId || null,
      dealName: selectedDeal?.title || task.dealName || null,
    }
    
    try {
      await onUpdate(updatedTask, false)
      showSuccess(t('tasks.taskCompleted') || 'Task completed successfully')
      onClose()
    } catch (error) {
      console.error('Failed to complete task:', error)
      showError(t('tasks.taskUpdated') || 'Failed to complete task')
    }
  }

  const handleReopenTask = async () => {
    const updatedTask = {
      ...task,
      status: 'TODO',
      completed: false,
      dealId: dealId || task.dealId || null,
      dealName: selectedDeal?.title || task.dealName || null,
    }
    
    try {
      await onUpdate(updatedTask, false)
      showSuccess('Вернули задачу в работу')
      setHistoryRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Failed to reopen task:', error)
      showError(t('tasks.taskUpdated') || 'Failed to reopen task')
    }
  }

  const handleDelete = async () => {
    if (onDelete) {
      try {
        await onDelete(task.id)
        setIsDeleteDialogOpen(false)
        onClose()
      } catch (error) {
        console.error('Failed to delete task:', error)
      }
    }
  }

  const dueDateObj = safeParseDate(dueDate)
  const tomorrow = new Date(dueDateObj)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(dueDateObj)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
  const nextWeek = new Date(dueDateObj)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const createdAt = safeParseDate(task.createdAt)
  const selectedUser = users.find((u) => u.id === assigneeId)
  const selectedDeal = deals.find((d) => d.id === dealId)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 rounded-br-3xl">
          {task.completed && (
            <button
              className="ring-offset-background focus:ring-ring absolute top-4 right-10 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none text-muted-foreground hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4"
              onClick={handleReopenTask}
              title="Вернуть в работу"
            >
              <Undo2 />
              <span className="sr-only">Вернуть в работу</span>
            </button>
          )}
          <DialogHeader className="space-y-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1 ${
                    task.completed ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                  aria-label={task.completed ? t('tasks.completed') : t('tasks.incomplete')}
                />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false)
                    }
                    if (e.key === 'Escape') {
                      setTitle(task.title)
                      setIsEditingTitle(false)
                    }
                  }}
                  className="!text-lg !font-semibold h-auto py-1 border-0 shadow-none focus-visible:ring-0 pr-12"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                    task.completed ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                  aria-label={task.completed ? t('tasks.completed') : t('tasks.incomplete')}
                />
                <DialogTitle 
                  className={`text-lg font-semibold cursor-pointer hover:text-primary transition-colors ${task.completed ? 'line-through' : ''}`}
                  onDoubleClick={handleTitleDoubleClick}
                >
                  {title}
                </DialogTitle>
              </div>
            )}
          </DialogHeader>
            
          {description || isEditingDescription ? (
            <div className="space-y-1">
              {isEditingDescription ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setIsEditingDescription(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setDescription(task.description || "")
                      setIsEditingDescription(false)
                    }
                  }}
                  className="text-sm min-h-[80px] resize-none"
                  autoFocus
                />
              ) : (
                <p
                  className={`text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:text-foreground transition-colors ${task.completed ? 'line-through' : ''}`}
                  onDoubleClick={() => setIsEditingDescription(true)}
                >
                  {description || t('tasks.noDescription')}
                </p>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Popover open={isDealSelectOpen} onOpenChange={setIsDealSelectOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {selectedDeal ? (
                      <span className="text-foreground">{selectedDeal.title}</span>
                    ) : (
                      <span>{t('tasks.selectDeal')}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('deals.searchPlaceholder') || t('common.searchPlaceholder')} />
                    <CommandList>
                      <CommandEmpty>{t('deals.noDealsFound') || t('common.noData')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setDealId(null)
                            setIsDealSelectOpen(false)
                          }}
                        >
                          <span>{t('tasks.none')}</span>
                        </CommandItem>
                        {deals.map((deal) => (
                          <CommandItem
                            key={deal.id}
                            value={`${deal.title} ${deal.number || ''} ${deal.amount || ''}`}
                            onSelect={() => {
                              setDealId(deal.id)
                              setIsDealSelectOpen(false)
                            }}
                          >
                            <div className="flex flex-col w-full">
                              <span className="font-medium">{deal.title}</span>
                              {deal.number && (
                                <span className="text-xs text-muted-foreground">#{deal.number}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {dueDate && !isNaN(safeParseDate(dueDate).getTime())
                  ? format(safeParseDate(dueDate), "PPP")
                  : t('tasks.notSet')}
              </span>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal>
                <DropdownMenu open={isRescheduleDropdownOpen} onOpenChange={setIsRescheduleDropdownOpen}>
                  <PopoverAnchor asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        ref={calendarButtonRef}
                        title={t('tasks.reschedule')}
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </PopoverAnchor>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(e) => {
                    if (isCalendarOpen) {
                      e.preventDefault()
                    }
                  }}>
                    <DropdownMenuItem onClick={() => handleReschedule(1)}>
                      {t('tasks.tomorrow')} ({format(tomorrow, "MMM d")})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReschedule(2)}>
                      {t('tasks.dayAfterTomorrow')} ({format(dayAfterTomorrow, "MMM d")})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReschedule(7)}>
                      {t('tasks.nextWeek')} ({format(nextWeek, "MMM d")})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setIsRescheduleDropdownOpen(false)
                        requestAnimationFrame(() => {
                          setIsCalendarOpen(true)
                        })
                      }}
                    >
                      {t('tasks.chooseDate')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <PopoverContent
                  className="w-auto p-0"
                  align="end"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onInteractOutside={(e) => {
                    const target = e.target as Node
                    if (calendarButtonRef.current && calendarButtonRef.current.contains(target)) {
                      e.preventDefault()
                    }
                  }}
                >
                  <Calendar
                    mode="single"
                    selected={safeParseDate(dueDate)}
                    onSelect={handleCustomDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="-mb-1.5">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="result" className="text-sm font-medium">
                {t('tasks.result')}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="link" className="h-auto p-0 text-xs text-foreground hover:text-primary">
                    {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : t('tasks.unassigned')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder={t('tasks.searchAssignee')} />
                    <CommandList>
                      <CommandEmpty>{t('tasks.noUsersFound')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => setAssigneeId(null)}
                        >
                          {t('tasks.unassigned')}
                        </CommandItem>
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={`${user.firstName} ${user.lastName}`}
                            onSelect={() => setAssigneeId(user.id)}
                          >
                            {user.firstName} {user.lastName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="relative">
              <Textarea
                id="result"
                placeholder={t('tasks.resultPlaceholder')}
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="min-h-[140px] resize-none pr-16 pb-14 rounded-br-3xl"
              />
              <Button 
                size="icon" 
                className="absolute bottom-2 right-2 h-10 w-10 rounded-full" 
                onClick={handleComplete}
                title={t('tasks.complete') || t('tasks.execute') || 'Выполнить'}
              >
                <Check className="h-5 w-5" strokeWidth={3} />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-start gap-2 text-xs -mt-1.5 -mb-4">
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="link" className="h-auto p-0 text-xs font-normal text-muted-foreground hover:text-foreground" onClick={() => setIsHistoryOpen(true)}>
              {format(createdAt, 'PPP p')}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

        {selectedDeal && (
          <DealDetailModal
            deal={{
              id: selectedDeal.id,
              title: selectedDeal.title,
            }}
            isOpen={isDealModalOpen}
            onClose={() => setIsDealModalOpen(false)}
          />
        )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tasks.confirmDelete', { title: task.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        task={task}
        refreshTrigger={historyRefreshTrigger}
      />
    </>
  )
}
