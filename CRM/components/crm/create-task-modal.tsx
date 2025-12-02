"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getUsers } from '@/lib/api/users'
import { getDeals } from '@/lib/api/deals'
import { getContacts } from '@/lib/api/contacts'
import { useTranslation } from '@/lib/i18n/i18n-context'
import type { User } from '@/lib/api/users'
import type { Deal } from '@/lib/api/deals'
import type { Contact } from '@/lib/api/contacts'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (taskData: {
    title: string
    description?: string
    status?: string
    priority?: string
    deadline?: string
    dealId?: string
    contactId?: string
    assignedToId: string
  }) => Promise<void>
}

export function CreateTaskModal({ 
  isOpen, 
  onClose, 
  onSave
}: CreateTaskModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("TODO")
  const [priority, setPriority] = useState("MEDIUM")
  const [deadline, setDeadline] = useState("")
  const [assignedToId, setAssignedToId] = useState("")
  const [dealId, setDealId] = useState("")
  const [contactId, setContactId] = useState("")
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    console.log('CreateTaskModal useEffect: isOpen changed to', isOpen)
    if (isOpen) {
      console.log('CreateTaskModal: Modal is opening, resetting form and loading data')
      // Reset form when opening
      setTitle("")
      setDescription("")
      setStatus("TODO")
      setPriority("MEDIUM")
      setDeadline("")
      setAssignedToId("")
      setDealId("")
      setContactId("")
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
            setContacts([])
            return
          }
          
          const [usersData, dealsData, contactsData] = await Promise.all([
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
            getContacts().catch(err => {
              console.error('CreateTaskModal: Failed to load contacts:', err)
              const errorMessage = err instanceof Error ? err.message : 'Unknown error'
              if (errorMessage === 'UNAUTHORIZED') {
                console.warn('CreateTaskModal: Unauthorized to load contacts, returning empty array')
              }
              return []
            }),
          ])
          console.log('CreateTaskModal: Loaded data:', { users: usersData.length, deals: dealsData.length, contacts: contactsData.length })
          setUsers(usersData)
          setDeals(dealsData)
          setContacts(contactsData)
          
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
          setContacts([])
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
        status: status || undefined,
        priority: priority || undefined,
        deadline: finalDeadline,
        dealId: dealId || undefined,
        contactId: contactId || undefined,
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

  console.log('CreateTaskModal: Rendering, isOpen:', isOpen, 'users:', users.length, 'deals:', deals.length, 'contacts:', contacts.length)

  // Always render the Dialog, even if closed (for debugging)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('CreateTaskModal: Dialog onOpenChange called with', open, 'current isOpen:', isOpen)
      if (!open) {
        console.log('CreateTaskModal: Calling onClose')
        onClose()
      }
    }}>
      {console.log('CreateTaskModal: Dialog content rendering, isOpen:', isOpen)}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('tasks.createNewTask')}</DialogTitle>
          <DialogDescription>
            {t('tasks.addNewTask')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('tasks.taskTitle')} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('tasks.taskTitlePlaceholder')}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && e.ctrlKey) {
                  e.preventDefault()
                  handleSave()
                }
              }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('tasks.taskDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('tasks.taskDescriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('tasks.taskStatus')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">{t('tasks.statusTodo')}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t('tasks.statusInProgress')}</SelectItem>
                <SelectItem value="DONE">{t('tasks.statusDone')}</SelectItem>
                <SelectItem value="BACKLOG">{t('tasks.statusBacklog')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">{t('tasks.taskPriority')}</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">{t('tasks.priorityLow')}</SelectItem>
                <SelectItem value="MEDIUM">{t('tasks.priorityMedium')}</SelectItem>
                <SelectItem value="HIGH">{t('tasks.priorityHigh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">{t('tasks.taskAssignedTo')} *</Label>
            {users.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 border rounded">
                {t('tasks.loadingUsers')}
              </div>
            ) : (
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder={t('tasks.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || `${user.firstName} ${user.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Deal */}
          <div className="space-y-2">
            <Label htmlFor="deal">{t('tasks.taskDeal')} ({t('common.optional')})</Label>
            <Select value={dealId || "none"} onValueChange={(value) => setDealId(value === "none" ? "" : value)}>
              <SelectTrigger id="deal">
                <SelectValue placeholder={t('tasks.selectDeal')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('tasks.none')}</SelectItem>
                {deals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label htmlFor="contact">{t('tasks.taskContact')} ({t('common.optional')})</Label>
            <Select value={contactId || "none"} onValueChange={(value) => setContactId(value === "none" ? "" : value)}>
              <SelectTrigger id="contact">
                <SelectValue placeholder={t('tasks.selectContact')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('tasks.none')}</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.fullName || contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">{t('tasks.taskDeadline')}</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !assignedToId || loading || users.length === 0}>
            {loading ? t('tasks.creating') : t('tasks.createTask')}
          </Button>
        </DialogFooter>
        {users.length === 0 && (
          <p className="text-xs text-muted-foreground px-6 pb-4">
            {t('tasks.pleaseWaitUsers')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

