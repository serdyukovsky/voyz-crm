"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, ChevronDown, Check, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TaskDetailModal } from "./task-detail-modal"
import { DealHeader } from './deal/deal-header'
import { DealFieldsPanel } from './deal/deal-fields-panel'
import { DealTasksList } from './deal/deal-tasks-list'
import { TaskQuickCreate } from './deal/task-quick-create'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { useActivity } from '@/hooks/use-activity'
import { DealCommentsPanel } from './deal/deal-comments-panel'
import { ContactPerson } from './deal/contact-person'
import { useDeal } from '@/hooks/use-deal'
import { useDealTasks } from '@/hooks/use-deal-tasks'
import { useDealActivity } from '@/hooks/use-deal-activity'
import { useDealFiles } from '@/hooks/use-deal-files'
import { useRealtimeDeal } from '@/hooks/use-realtime-deal'
import { getContacts } from '@/lib/api/contacts'
import { Contact } from '@/types/contact'
import type { Task } from '@/hooks/use-deal-tasks'
import type { Activity } from '@/hooks/use-deal-activity'
import { CrossNavigation } from '@/components/shared/cross-navigation'
import { DetailSkeleton } from '@/components/shared/loading-skeleton'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { SendEmailModal } from '@/components/crm/send-email-modal'
import { Mail } from 'lucide-react'
// Comment type defined inline for now
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

interface DealDetailProps {
  dealId: string
}

export function DealDetail({ dealId }: DealDetailProps) {
  const router = useRouter()
  const { showSuccess, showError } = useToastNotification()
  const [selectedStage, setSelectedStage] = useState("new")
  const [assignedUser, setAssignedUser] = useState("Current User")
  const [showStageDropdown, setShowStageDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  // Use hooks
  const { deal, loading: dealLoading, updateDeal, updateField } = useDeal({ dealId })
  const { tasks, createTask, updateTask, deleteTask } = useDealTasks({ dealId })
  const { activities: legacyActivities, addActivity, groupByDate } = useDealActivity({ dealId })
  const { activities, loading: activitiesLoading } = useActivity({ entityType: 'deal', entityId: dealId })
  const { files, uploadFile, deleteFile, downloadFile, uploading } = useDealFiles({ dealId })

  // Load contacts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const contactsData = await getContacts()
        setContacts(contactsData)
      } catch (error) {
        console.error('Failed to load contacts:', error)
      }
    }
    loadContacts()
  }, [])

  // Realtime updates
  useRealtimeDeal({
    dealId,
    onFieldUpdate: (fieldId, value) => {
      updateField(fieldId, value)
      addActivity({
        type: 'field_updated',
        user: { id: "system", name: "System" },
        fieldName: fieldId,
        newValue: value,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleString()
      })
    },
    onTaskCreated: (task) => {
      // Task will be added via createTask
    },
    onTaskUpdated: (taskId, updates) => {
      updateTask(taskId, updates)
    },
    onFileUploaded: (file) => {
      // File will be added via uploadFile
    }
  })

  useEffect(() => {
    if (deal) {
      setSelectedStage(deal.stage)
      setAssignedUser(deal.assignedTo.name)
    }
  }, [deal])

  const handleStageChange = async (newStage: string) => {
    const oldStage = selectedStage
    setSelectedStage(newStage)
    setShowStageDropdown(false)

    await updateDeal({ stage: newStage })

    // Add activity
    addActivity({
      type: 'stage_changed',
      user: { id: deal?.assignedTo.id || "1", name: deal?.assignedTo.name || "User" },
      message: `moved deal from ${oldStage} to ${newStage}`,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    })
  }

  const handleTitleUpdate = async (title: string) => {
    await updateDeal({ title })
  }

  const handleTaskCreate = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask = await createTask(taskData)
    
    addActivity({
      type: 'task_created',
      user: { id: deal?.assignedTo.id || "1", name: deal?.assignedTo.name || "User" },
      taskTitle: newTask.title,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    })
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    await updateTask(taskId, updates)

    if (updates.status === 'completed' || updates.completed) {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        addActivity({
          type: 'task_completed',
          user: { id: deal?.assignedTo.id || "1", name: deal?.assignedTo.name || "User" },
          taskTitle: task.title,
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleString()
        })
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    const uploadedFile = await uploadFile(file)
    
    addActivity({
      type: 'file_uploaded',
      user: { id: deal?.assignedTo.id || "1", name: deal?.assignedTo.name || "User" },
      fileName: uploadedFile.name,
      fileSize: uploadedFile.size,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    })
  }

  const handleCommentAdd = async (
    message: string,
    type: 'comment' | 'internal_note' | 'client_message',
    files?: File[]
  ) => {
    // TODO: Save comment via API
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      type,
      message,
      user: { id: deal?.assignedTo.id || "1", name: deal?.assignedTo.name || "User" },
      createdAt: new Date().toISOString(),
      files: files?.map((f, i) => ({
        id: `file-${i}`,
        name: f.name,
        url: URL.createObjectURL(f)
      }))
    }

    addActivity({
      type: type === 'comment' ? 'comment' : type,
      user: comment.user,
      message,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    })
  }

  const handleBack = () => {
    const isNewDeal = typeof window !== 'undefined' && 
      sessionStorage.getItem(`deal-${dealId}-isNew`) === 'true'
    
    if (isNewDeal && (!deal?.title?.trim() && !deal?.amount)) {
      sessionStorage.removeItem(`deal-${dealId}`)
      sessionStorage.removeItem(`deal-${dealId}-isNew`)
    }
    router.push('/deals')
  }

  if (dealLoading) {
    return <DetailSkeleton />
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Deal not found</div>
      </div>
    )
  }

  const stages = [
    { value: "lead", label: "Lead", color: "bg-zinc-500" },
    { value: "qualified", label: "Qualified", color: "bg-blue-500" },
    { value: "proposal", label: "Proposal", color: "bg-purple-500" },
    { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
    { value: "closed", label: "Closed Won", color: "bg-green-500" },
  ]

  const users = [
    { id: "1", name: "Alex Chen", avatar: "/abstract-geometric-shapes.png" },
    { id: "2", name: "Sarah Lee", avatar: "/abstract-geometric-shapes.png" },
    { id: "3", name: "Mike Johnson", avatar: "/diverse-group-collaborating.png" },
  ]

  const currentStage = stages.find(s => s.value === selectedStage) || stages[0]
  const currentUser = users.find(u => u.name === assignedUser) || users[0]

  // Prepare comments for DealCommentsPanel
  const comments: Comment[] = activities
    .filter(a => ['comment', 'internal_note', 'client_message'].includes(a.type))
    .map(a => ({
      id: a.id,
      type: a.type as 'comment' | 'internal_note' | 'client_message',
      message: a.message || '',
      user: a.user,
      createdAt: a.timestamp,
      files: []
    }))

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-3rem)] overflow-hidden transition-all duration-200">
      {/* LEFT COLUMN: Deal Info */}
      <div className="w-full md:w-80 flex-shrink-0 overflow-y-auto border-r border-border/50 bg-accent/5 scroll-smooth">
        <DealHeader
          deal={deal}
          onTitleUpdate={handleTitleUpdate}
          onBack={handleBack}
          isNewDeal={typeof window !== 'undefined' && 
            sessionStorage.getItem(`deal-${dealId}-isNew`) === 'true'}
          onDuplicate={() => {
            // TODO: Implement duplicate
            console.log('Duplicate deal')
          }}
          onArchive={() => {
            // TODO: Implement archive
            console.log('Archive deal')
          }}
          onDelete={() => {
            // TODO: Implement delete
            console.log('Delete deal')
          }}
        />

        <div className="px-6 py-4 space-y-4">
          {/* Stage */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Stage</label>
            <div className="relative">
              <button
                onClick={() => setShowStageDropdown(!showStageDropdown)}
                className="w-full flex items-center justify-between px-3 h-9 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${currentStage.color}`} />
                  <span className="text-sm text-foreground">{currentStage.label}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {showStageDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
                  {stages.map((stage) => (
                    <button
                      key={stage.value}
                      onClick={() => handleStageChange(stage.value)}
                      className="w-full flex items-center gap-2 px-3 h-9 hover:bg-accent/50 first:rounded-t-md last:rounded-b-md transition-colors"
                    >
                      <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                      <span className="text-sm text-foreground">{stage.label}</span>
                      {selectedStage === stage.value && (
                        <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Responsible */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Responsible</label>
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="w-full flex items-center justify-between px-3 h-9 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {currentUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{assignedUser}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {showUserDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setAssignedUser(user.name)
                        setShowUserDropdown(false)
                        updateDeal({ assignedTo: { id: user.id, name: user.name, avatar: user.avatar } })
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 h-9 hover:bg-accent/50 first:rounded-t-md last:rounded-b-md transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-[10px]">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground">{user.name}</span>
                      </div>
                      {assignedUser === user.name && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cross Navigation */}
          <CrossNavigation
            contacts={
              deal?.contact
                ? [
                    {
                      id: deal.contact.id,
                      fullName: deal.contact.fullName || deal.contact.name,
                      email: deal.contact.email,
                      position: deal.contact.position,
                      companyName: deal.contact.companyName,
                      stats: deal.contact.stats,
                    },
                  ]
                : []
            }
            companies={
              deal?.company
                ? [
                    {
                      id: deal.company.id,
                      name: deal.company.name,
                      industry: deal.company.industry,
                      stats: deal.company.stats,
                    },
                  ]
                : deal?.contact?.company
                ? [
                    {
                      id: deal.contact.company.id,
                      name: deal.contact.company.name,
                      industry: deal.contact.company.industry,
                      stats: deal.contact.company.stats,
                    },
                  ]
                : []
            }
            tasks={tasks.map((task) => ({
              id: task.id,
              title: task.title || task.name,
              status: task.status,
              priority: task.priority,
              deadline: task.deadline,
            }))}
          />

          {/* Contact Person */}
          <ContactPerson
            contact={
              deal?.contact
                ? {
                    id: deal.contact.id,
                    fullName: deal.contact.fullName || deal.contact.name,
                    email: deal.contact.email,
                    phone: deal.contact.phone,
                    position: deal.contact.position,
                    companyName: deal.contact.companyName,
                    social: deal.contact.social,
                    tags: [],
                    createdAt: '',
                    updatedAt: '',
                    deals: [],
                    stats: {
                      activeDeals: 0,
                      closedDeals: 0,
                      totalDeals: 0,
                    },
                  }
                : null
            }
            contacts={contacts}
            onContactChange={async (contactId) => {
              try {
                if (contactId) {
                  await linkContactToDeal(dealId, contactId)
                } else {
                  await unlinkContactFromDeal(dealId)
                }
                // Reload deal to get updated contact data
                await refetchDeal()
                // Reload contacts list to get updated data
                const updatedContacts = await getContacts()
                setContacts(updatedContacts)
              } catch (error) {
                console.error('Failed to link/unlink contact:', error)
              }
            }}
            onContactsUpdate={async (updatedContacts) => {
              setContacts(updatedContacts)
            }}
            isRequired={!deal?.contact}
          />

          {/* Send Email Button */}
          {deal?.contact?.email && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailModalOpen(true)}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </div>
          )}

          {/* Budget */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Budget</label>
            <div className="flex items-center gap-2 px-3 h-9 rounded-md bg-background/50 border border-border/50">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={deal.amount === 0 ? "" : deal.amount.toString()}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  updateDeal({ amount: value ? parseFloat(value) : 0 })
                }}
                placeholder="0"
                className="border-0 px-0 h-auto bg-transparent focus-visible:ring-0 text-sm font-medium flex-1"
              />
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
              <TaskQuickCreate 
                onCreate={handleTaskCreate} 
                dealId={dealId}
                dealContactId={deal?.contactId}
              />
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No tasks yet</p>
            ) : (
              <DealTasksList
                tasks={tasks}
                onTaskCreate={handleTaskCreate}
                onTaskUpdate={handleTaskUpdate}
                onTaskClick={(task) => {
                  setSelectedTask(task)
                  setIsTaskModalOpen(true)
                }}
              />
            )}
          </div>

          {/* Custom Fields */}
          <DealFieldsPanel
            deal={deal}
            onFieldUpdate={updateField}
            customFields={deal.customFields || []}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Unified Activity Timeline + Comments */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background hidden md:flex">
        <div className="flex-1 overflow-y-auto pl-6 pr-6 py-6 scroll-smooth">
          {/* Activity Timeline */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Activity</h3>
            {activitiesLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading activities...</div>
            ) : (
              <ActivityTimeline activities={activities} />
            )}
          </div>
        </div>

        {/* Comments Panel (Fixed at bottom) */}
        <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-border/50 bg-card/95 backdrop-blur-sm px-6 py-4 transition-all duration-200">
          <DealCommentsPanel
            comments={comments}
            onAddComment={handleCommentAdd}
          />
        </div>
      </div>

      {/* Task Detail Modal */}
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
          onUpdate={(updatedTask: any) => {
            handleTaskUpdate(selectedTask.id, updatedTask)
          }}
        />
      )}

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        to={deal?.contact?.email}
        dealId={dealId}
        contactId={deal?.contact?.id}
        companyId={deal?.company?.id}
        defaultSubject={deal ? `Re: ${deal.title}` : ''}
      />
    </div>
  )
}

