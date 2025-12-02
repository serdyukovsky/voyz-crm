"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Calendar as CalendarIcon, Clock, User, Link as LinkIcon, Contact, Trash2, Plus, Search } from "lucide-react"
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
import { CreateContactModal } from "./create-contact-modal"
import { getContacts, createContact, type CreateContactDto } from '@/lib/api/contacts'
import { getCompanies } from '@/lib/api/companies'
import { getUsers, type User as UserType } from '@/lib/api/users'
import { getDeals, type Deal as DealType } from '@/lib/api/deals'
import { Contact as ContactType } from '@/types/contact'
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
  const [contactId, setContactId] = useState<string | null>(task.contactId || null)
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assigneeId || null)
  const [dealId, setDealId] = useState<string | null>(task.dealId || null)
  const [contacts, setContacts] = useState<ContactType[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [deals, setDeals] = useState<DealType[]>([])
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [isRescheduleDropdownOpen, setIsRescheduleDropdownOpen] = useState(false)
  const [isContactSelectOpen, setIsContactSelectOpen] = useState(false)
  const [isDealSelectOpen, setIsDealSelectOpen] = useState(false)
  const [isCreateContactModalOpen, setIsCreateContactModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const calendarButtonRef = useRef<HTMLButtonElement>(null)

  // Update local state when task prop changes
  useEffect(() => {
    if (isOpen) {
      setResult(task.result || "")
      setDueDate(task.dueDate)
      setDescription(task.description || "")
      setTitle(task.title)
      setContactId(task.contactId || null)
      setAssigneeId(task.assigneeId || null)
      setDealId(task.dealId || null)
    }
  }, [task, isOpen])

  // Load contacts and users
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const [contactsData, usersData, companiesData, dealsData] = await Promise.all([
            getContacts(),
            getUsers(),
            getCompanies(),
            getDeals(),
          ])
          setContacts(contactsData)
          setUsers(usersData)
          setCompanies(companiesData)
          setDeals(dealsData)
        } catch (error) {
          console.error('Failed to load data:', error)
        }
      }
      loadData()
    }
  }, [isOpen])

  // Auto-save title (with debounce to avoid too many updates)
  useEffect(() => {
    if (!isEditingTitle && title !== task.title && title.trim()) {
      const timeoutId = setTimeout(() => {
        const updatedTask = {
          ...task,
          title,
        }
        onUpdate(updatedTask, true) // silent = true for auto-save
      }, 500) // 500ms debounce
      return () => clearTimeout(timeoutId)
    }
  }, [title, isEditingTitle])

  // Auto-save description (with debounce)
  useEffect(() => {
    if (!isEditingDescription && description !== (task.description || "")) {
      const timeoutId = setTimeout(() => {
        const updatedTask = {
          ...task,
          description,
        }
        onUpdate(updatedTask, true) // silent = true for auto-save
      }, 500) // 500ms debounce
      return () => clearTimeout(timeoutId)
    }
  }, [description, isEditingDescription])

  // Auto-save due date
  useEffect(() => {
    if (dueDate && dueDate !== task.dueDate) {
      const timeoutId = setTimeout(() => {
        const updatedTask = {
          ...task,
          dueDate,
        }
        onUpdate(updatedTask, true) // silent = true for auto-save
      }, 300) // 300ms debounce
      return () => clearTimeout(timeoutId)
    }
  }, [dueDate])

  // Auto-save contact
  useEffect(() => {
    if (contactId !== task.contactId && contacts.length > 0) {
      const selectedContact = contacts.find((c) => c.id === contactId)
      const updatedTask = {
        ...task,
        contactId: contactId || undefined,
        contactName: selectedContact?.fullName || undefined,
      }
      onUpdate(updatedTask, true) // silent = true for auto-save
    }
  }, [contactId, contacts])

  // Auto-save assignee
  useEffect(() => {
    if (assigneeId !== task.assigneeId && users.length > 0) {
      const selectedUser = users.find((u) => u.id === assigneeId)
      const updatedTask = {
        ...task,
        assigneeId: assigneeId || undefined,
        assignee: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : task.assignee,
      }
      onUpdate(updatedTask, true) // silent = true for auto-save
    }
  }, [assigneeId, users])

  // Auto-save deal
  useEffect(() => {
    if (dealId !== task.dealId && deals.length > 0) {
      const selectedDeal = deals.find((d) => d.id === dealId)
      const updatedTask = {
        ...task,
        dealId: dealId || undefined,
        dealName: selectedDeal?.title || undefined,
      }
      onUpdate(updatedTask, true) // silent = true for auto-save
    }
  }, [dealId, deals])

  const handleTitleDoubleClick = () => {
    setIsEditingTitle(true)
  }

  // Helper function to safely parse date
  const safeParseDate = (dateString: string | undefined | null): Date => {
    if (!dateString) return new Date()
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? new Date() : date
  }

  const handleReschedule = (days: number | null, date?: Date) => {
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
    setDueDate(formattedDate)
  }

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

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

    const updatedTask = {
      ...task,
      result,
      status: 'DONE',
      completed: true,
      dealId: dealId || task.dealId || null,
      dealName: selectedDeal?.title || task.dealName || null,
    }
    
    try {
      await onUpdate(updatedTask, false) // Not silent - show success message
      showSuccess(t('tasks.taskCompleted') || 'Task completed successfully')
      onClose() // Close modal after successful completion
    } catch (error) {
      console.error('Failed to complete task:', error)
      showError(t('tasks.taskUpdated') || 'Failed to complete task')
    }
  }

  const handleCreateContact = async (contactData?: CreateContactDto) => {
    if (!contactData) return

    try {
      const newContact = await createContact(contactData)
      const updatedContacts = await getContacts()
      setContacts(updatedContacts)
      setContactId(newContact.id)
      setIsCreateContactModalOpen(false)
      setIsContactSelectOpen(false)
      showSuccess(t('contacts.createdSuccess'))
    } catch (error) {
      console.error('Failed to create contact:', error)
      showError(t('contacts.createError'))
    }
  }

  const handleOpenCreateContactModal = () => {
    setIsContactSelectOpen(false)
    setIsCreateContactModalOpen(true)
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
  const selectedContact = contacts.find((c) => c.id === contactId)
  const selectedUser = users.find((u) => u.id === assigneeId)
  const selectedDeal = deals.find((d) => d.id === dealId)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-10">
            {isEditingTitle ? (
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
                className="text-xl font-semibold h-auto py-1 pr-2"
                autoFocus
              />
            ) : (
              <DialogTitle 
                className="text-xl font-semibold cursor-pointer hover:text-primary transition-colors pr-2"
                onDoubleClick={handleTitleDoubleClick}
              >
                {title}
              </DialogTitle>
            )}
            
            {/* Description under task title */}
            {description || isEditingDescription ? (
              <div className="pt-1">
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
                    className="text-sm min-h-[60px] resize-none"
                    autoFocus
                  />
                ) : (
                  <p 
                    className="text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:text-foreground transition-colors"
                    onDoubleClick={() => setIsEditingDescription(true)}
                  >
                    {description || t('tasks.noDescription')}
                  </p>
                )}
              </div>
            ) : null}
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Deal */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                {t('tasks.taskDeal')}
              </label>
              <div className="flex gap-2">
                <Popover open={isDealSelectOpen} onOpenChange={setIsDealSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isDealSelectOpen}
                    className="w-full justify-between h-9 text-sm font-normal"
                  >
                    <span className={selectedDeal ? "text-foreground" : "text-muted-foreground"}>
                      {selectedDeal ? selectedDeal.title : t('tasks.selectDeal')}
                    </span>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
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
              {selectedDeal && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  onClick={() => setIsDealModalOpen(true)}
                  title={t('deals.viewDeal') || 'Просмотр сделки'}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Contact className="h-4 w-4" />
                {t('tasks.taskContact')}
              </label>
              <Popover open={isContactSelectOpen} onOpenChange={setIsContactSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isContactSelectOpen}
                    className="w-full justify-between h-9 text-sm font-normal"
                  >
                    <span className="text-muted-foreground">
                      {selectedContact ? selectedContact.fullName : t('tasks.selectContact')}
                    </span>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('contacts.searchPlaceholder')} />
                    <CommandList>
                      <CommandEmpty>{t('contacts.noContactsFound')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__create_new__"
                          onSelect={handleOpenCreateContactModal}
                          className="text-primary"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          <span>{t('contacts.createNewContact')}</span>
                        </CommandItem>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setContactId(null)
                            setIsContactSelectOpen(false)
                          }}
                        >
                          <span>{t('tasks.none')}</span>
                        </CommandItem>
                        {contacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={`${contact.fullName} ${contact.email || ''} ${contact.phone || ''}`}
                            onSelect={() => {
                              setContactId(contact.id)
                              setIsContactSelectOpen(false)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{contact.fullName}</span>
                              {contact.email && (
                                <span className="text-xs text-muted-foreground">{contact.email}</span>
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

            {/* Task Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{t('tasks.created')}</span>
                </div>
                <div className="text-sm font-medium">
                  {format(createdAt, "PPP 'at' p")}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{t('tasks.responsible') || t('tasks.assignedTo')}</span>
                </div>
                <Select
                  value={assigneeId || "none"}
                  onValueChange={(value) => {
                    setAssigneeId(value === "none" ? null : value)
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t('tasks.selectUser')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('tasks.none')}</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date with Reschedule */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('tasks.taskDeadline')}:</span>
                <span className="text-sm font-medium">
                  {dueDate && !isNaN(safeParseDate(dueDate).getTime()) 
                    ? format(safeParseDate(dueDate), "PPP")
                    : t('tasks.notSet')}
                </span>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal>
                  <DropdownMenu open={isRescheduleDropdownOpen} onOpenChange={setIsRescheduleDropdownOpen}>
                    <PopoverAnchor asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto text-xs" ref={calendarButtonRef}>
                          {t('tasks.reschedule')}
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

            {/* Result Field */}
            <div className="space-y-2">
              <label htmlFor="result" className="text-sm font-medium">
                {t('tasks.result')}
              </label>
              <Textarea
                id="result"
                placeholder={t('tasks.resultPlaceholder')}
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mt-6">
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button onClick={handleComplete}>
                {t('tasks.complete') || t('tasks.execute') || 'Выполнить'}
              </Button>
            </div>
          </div>
        </DialogContent>

        {/* Deal Detail Modal */}
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
      </Dialog>

      {/* Create Contact Modal */}
      <CreateContactModal
        isOpen={isCreateContactModalOpen}
        onClose={() => setIsCreateContactModalOpen(false)}
        onSave={handleCreateContact}
        companies={companies}
      />

      {/* Delete Confirmation Dialog */}
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
    </>
  )
}
