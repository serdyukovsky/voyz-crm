"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, Link as LinkIcon, Check } from "lucide-react"
import { format } from "date-fns"
import { getUsers } from '@/lib/api/users'
import { getDeals } from '@/lib/api/deals'
import { useTranslation } from '@/lib/i18n/i18n-context'
import type { User } from '@/lib/api/users'
import type { Deal } from '@/lib/api/deals'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (taskData: {
    title: string
    description?: string
    deadline?: string
    dealId?: string
    assignedToId: string
  }) => Promise<void>
  defaultDealId?: string
  defaultContactId?: string
}

export function CreateTaskModal({ 
  isOpen, 
  onClose, 
  onSave,
  defaultDealId,
  defaultContactId
}: CreateTaskModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [assignedToId, setAssignedToId] = useState("")
  const [dealId, setDealId] = useState(defaultDealId || "")
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [isDealSelectOpen, setIsDealSelectOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  useEffect(() => {
    console.log('CreateTaskModal useEffect: isOpen changed to', isOpen)
    if (isOpen) {
      console.log('CreateTaskModal: Modal is opening, resetting form and loading data')
      
      // Get current user from localStorage
      let currentUserId = ""
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          currentUserId = user.id || ""
          console.log('CreateTaskModal: Current user ID:', currentUserId)
        }
      } catch (error) {
        console.error('CreateTaskModal: Failed to parse user from localStorage:', error)
      }
      
      // Reset form when opening
      setTitle("")
      setDescription("")
      setDeadline("")
      setAssignedToId(currentUserId) // Set current user as default assignee
      setDealId(defaultDealId || "")
      setLoading(false)
      
      // Load users, deals, and contacts
      const loadData = async () => {
        try {
          console.log('CreateTaskModal: Loading users, deals, and contacts...')
          const token = localStorage.getItem('access_token')
          if (!token) {
            console.warn('CreateTaskModal: No token found, cannot load data')
            setUsers([])
            setDeals([])
            return
          }
          
          const [usersData, dealsData] = await Promise.all([
            getUsers().catch(err => {
              console.error('CreateTaskModal: Failed to load users:', err)
              const errorMessage = err instanceof Error ? err.message : 'Unknown error'
              if (errorMessage === 'UNAUTHORIZED') {
                console.warn('CreateTaskModal: Unauthorized to load users, returning empty array')
              }
              return []
            }),
            getDeals().catch(err => {
              console.error('CreateTaskModal: Failed to load deals:', err)
              const errorMessage = err instanceof Error ? err.message : 'Unknown error'
              if (errorMessage === 'UNAUTHORIZED') {
                console.warn('CreateTaskModal: Unauthorized to load deals, returning empty array')
              }
              return []
            }),
          ])
          console.log('CreateTaskModal: Loaded data:', { users: usersData.length, deals: dealsData.length })
          setUsers(usersData)
          setDeals(dealsData)
          
          // Set current user as default assignee if available
          if (usersData.length > 0 && !assignedToId) {
            const currentUser = localStorage.getItem('user')
            if (currentUser) {
              try {
                const user = JSON.parse(currentUser)
                const foundUser = usersData.find(u => u.id === user.id)
                if (foundUser) {
                  setAssignedToId(foundUser.id)
                } else {
                  setAssignedToId(usersData[0].id)
                }
              } catch {
                setAssignedToId(usersData[0].id)
              }
            } else {
              setAssignedToId(usersData[0].id)
            }
          }
        } catch (error) {
          console.error('CreateTaskModal: Failed to load data:', error)
          // Set empty arrays to allow modal to render
          setUsers([])
          setDeals([])
        }
      }
      loadData()
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!title.trim() || !assignedToId) return

    setLoading(true)
    try {
      // If deadline is not set, use current date and time
      let finalDeadline = deadline
      if (!finalDeadline || finalDeadline.trim() === '') {
        const now = new Date()
        // Format as ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
        // toISOString() converts to UTC, which is what backend expects
        finalDeadline = now.toISOString()
      }
      // If deadline is in datetime-local format (YYYY-MM-DDTHH:mm), backend will parse it correctly

      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: finalDeadline,
        dealId: dealId || undefined,
        assignedToId,
      })
      
      onClose()
    } catch (error) {
      console.error('Failed to create task:', error instanceof Error ? error.message : String(error))
      // Error is already handled by parent component
    } finally {
      setLoading(false)
    }
  }

  console.log('CreateTaskModal: Rendering, isOpen:', isOpen, 'users:', users.length, 'deals:', deals.length)

  // Always render the Dialog, even if closed (for debugging)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('CreateTaskModal: Dialog onOpenChange called with', open, 'current isOpen:', isOpen)
      if (!open) {
        console.log('CreateTaskModal: Calling onClose')
        onClose()
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 rounded-br-3xl">
        <div className="space-y-4">
          {/* Title */}
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tasks.taskTitlePlaceholder') || 'Название задачи'}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && e.ctrlKey) {
                e.preventDefault()
                handleSave()
              }
            }}
            className="!text-lg !font-semibold h-auto py-1 border-0 shadow-none focus-visible:ring-0 pr-12"
            autoFocus
          />

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Popover open={isDealSelectOpen} onOpenChange={setIsDealSelectOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {dealId ? (
                      <span className="text-foreground">{deals.find(d => d.id === dealId)?.title || t('tasks.selectDeal')}</span>
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
                            setDealId("")
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
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {deadline ? (
                      <span className="text-sm font-semibold text-foreground">
                        {format(new Date(deadline), "PPP")}
                      </span>
                    ) : (
                      <span>{t('tasks.notSet')}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={deadline ? new Date(deadline) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setDeadline(format(date, "yyyy-MM-dd"))
                        setIsCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1 relative">
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('tasks.taskDescriptionPlaceholder') || 'Описание задачи'}
              className="text-sm min-h-[140px] resize-none pr-16 pb-14 rounded-br-3xl"
              rows={3}
            />
            <Button 
              size="icon" 
              className="absolute bottom-2 right-2 h-10 w-10 rounded-full" 
              onClick={handleSave}
              disabled={!title.trim() || !assignedToId || loading || users.length === 0}
              title={t('tasks.createTask') || 'Создать задачу'}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </Button>
          </div>

          <div className="flex items-center justify-start gap-2 text-xs -mt-0.5 -mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-xs text-muted-foreground hover:text-foreground">
                  {assignedToId ? (
                    (() => {
                      const user = users.find(u => u.id === assignedToId)
                      return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || t('tasks.unassigned') : t('tasks.unassigned')
                    })()
                  ) : (
                    t('tasks.unassigned')
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder={t('tasks.searchAssignee')} />
                  <CommandList>
                    <CommandEmpty>{t('tasks.noUsersFound')}</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.firstName} ${user.lastName}`}
                          onSelect={() => setAssignedToId(user.id)}
                        >
                          {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {users.length === 0 && (
          <p className="text-xs text-muted-foreground -mb-4">
            {t('tasks.pleaseWaitUsers')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

