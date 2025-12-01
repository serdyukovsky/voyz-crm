"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Clock, User, Link as LinkIcon, Pencil, Contact } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { DealDetailModal } from "./deal-detail-modal"
import { getContacts } from '@/lib/api/contacts'
import { Contact as ContactType } from '@/types/contact'

interface Task {
  id: string
  title: string
  dealId: string | null
  dealName: string | null
  contactId?: string | null
  contactName?: string | null
  dueDate: string
  assignee: string
  completed: boolean
  priority: "low" | "medium" | "high"
  status: string
  description?: string
  createdAt?: string
  result?: string
}

interface TaskDetailModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdate: (task: Task) => void
}

const priorityColors = {
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdate }: TaskDetailModalProps) {
  const [result, setResult] = useState(task.result || "")
  const [dueDate, setDueDate] = useState(task.dueDate)
  const [description, setDescription] = useState(task.description || "")
  const [title, setTitle] = useState(task.title)
  const [contactId, setContactId] = useState<string | null>(task.contactId || null)
  const [contacts, setContacts] = useState<ContactType[]>([])
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [isRescheduleDropdownOpen, setIsRescheduleDropdownOpen] = useState(false)
  const calendarButtonRef = useRef<HTMLButtonElement>(null)

  // Load contacts
  useEffect(() => {
    if (isOpen) {
      const loadContacts = async () => {
        try {
          const contactsData = await getContacts()
          setContacts(contactsData)
        } catch (error) {
          console.error('Failed to load contacts:', error)
        }
      }
      loadContacts()
    }
  }, [isOpen])

  const handleSave = () => {
    const selectedContact = contacts.find((c) => c.id === contactId)
    const updatedTask = {
      ...task,
      title,
      result,
      dueDate,
      description,
      contactId: contactId || undefined,
      contactName: selectedContact?.name || undefined,
    }
    onUpdate(updatedTask)
    setIsEditingDescription(false)
    setIsEditingTitle(false)
  }

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

    // Validate date before formatting
    if (isNaN(newDate.getTime())) {
      console.error('Invalid date in handleReschedule:', newDate)
      return
    }

    const formattedDate = format(newDate, "yyyy-MM-dd")
    setDueDate(formattedDate)
    
    const updatedTask = {
      ...task,
      dueDate: formattedDate,
    }
    onUpdate(updatedTask)
  }

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const handleCustomDate = (date: Date | undefined) => {
    if (date) {
      handleReschedule(null, date)
      setIsCalendarOpen(false)
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

  return (
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
                  {description || "No description"}
                </p>
              )}
            </div>
          ) : null}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Deal Link */}
          {task.dealId && task.dealName && (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => setIsDealModalOpen(true)}
                className="text-sm text-primary hover:underline font-medium text-left"
              >
                {task.dealName}
              </button>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <Contact className="h-4 w-4" />
              Contact
            </label>
            <Select
              value={contactId || "none"}
              onValueChange={(value) => {
                setContactId(value === "none" ? null : value)
                const selectedContact = contacts.find((c) => c.id === value)
                const updatedTask = {
                  ...task,
                  contactId: value === "none" ? undefined : value,
                  contactName: selectedContact?.fullName || undefined,
                }
                onUpdate(updatedTask)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.fullName} {contact.email && `(${contact.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Created</span>
              </div>
              <div className="text-sm font-medium">
                {format(createdAt, "PPP 'at' p")}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Assigned to</span>
              </div>
              <div className="text-sm font-medium">{task.assignee}</div>
            </div>
          </div>

          {/* Priority Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Priority:</span>
            <Badge 
              variant="outline" 
              className={`text-xs ${priorityColors[task.priority]}`}
            >
              {task.priority}
            </Badge>
          </div>

          {/* Due Date with Reschedule */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Due Date:</span>
              <span className="text-sm font-medium">
                {dueDate && !isNaN(safeParseDate(dueDate).getTime()) 
                  ? format(safeParseDate(dueDate), "PPP")
                  : "Not set"}
              </span>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal>
                <DropdownMenu open={isRescheduleDropdownOpen} onOpenChange={setIsRescheduleDropdownOpen}>
                  <PopoverAnchor asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-auto text-xs" ref={calendarButtonRef}>
                        Reschedule
                      </Button>
                    </DropdownMenuTrigger>
                  </PopoverAnchor>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(e) => {
                    // Не теряем фокус при закрытии, если открываем календарь
                    if (isCalendarOpen) {
                      e.preventDefault()
                    }
                  }}>
                    <DropdownMenuItem onClick={() => handleReschedule(1)}>
                      Tomorrow ({format(tomorrow, "MMM d")})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReschedule(2)}>
                      Day after tomorrow ({format(dayAfterTomorrow, "MMM d")})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReschedule(7)}>
                      Next week ({format(nextWeek, "MMM d")})
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault()
                        setIsRescheduleDropdownOpen(false)
                        // Открываем календарь после закрытия dropdown
                        requestAnimationFrame(() => {
                          setIsCalendarOpen(true)
                        })
                      }}
                    >
                      Choose date...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Popover для календаря */}
                <PopoverContent 
                  className="w-auto p-0" 
                  align="end"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onInteractOutside={(e) => {
                    // Предотвращаем закрытие при взаимодействии с кнопкой или dropdown
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
              Result
            </label>
            <Textarea
              id="result"
              placeholder="Enter the result of this task..."
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>

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
    </Dialog>
  )
}

