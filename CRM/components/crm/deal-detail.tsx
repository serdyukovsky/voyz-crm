"use client"

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, ChevronDown, Check, Plus, XCircle, Link as LinkIcon, Users, Hash, MessageCircle, Globe } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskDetailModal } from "./task-detail-modal"
import { DealHeader } from './deal/deal-header'
import { DealTasksList } from './deal/deal-tasks-list'
import { ContactCard } from './deal/contact-card'
import { CreateTaskModal } from './create-task-modal'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { useActivity } from '@/hooks/use-activity'
import { DealCommentsPanel } from './deal/deal-comments-panel'
import { useDeal } from '@/hooks/use-deal'
import { useDealTasks } from '@/hooks/use-deal-tasks'
import { useDealActivity } from '@/hooks/use-deal-activity'
import { useDealFiles } from '@/hooks/use-deal-files'
import { useRealtimeDeal } from '@/hooks/use-realtime-deal'
import { getContacts, updateContact, createContact } from '@/lib/api/contacts'
import { Contact } from '@/types/contact'
import type { Task } from '@/hooks/use-deal-tasks'
import type { Activity } from '@/hooks/use-deal-activity'
import { CrossNavigation } from '@/components/shared/cross-navigation'
import { DetailSkeleton } from '@/components/shared/loading-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { SendEmailModal } from '@/components/crm/send-email-modal'
import { Mail } from 'lucide-react'
import { getPipeline, type Pipeline, type Stage } from '@/lib/api/pipelines'
import { updateDeal as updateDealApi } from '@/lib/api/deals'
import { getUsers, type User } from '@/lib/api/users'
import { createComment, getDealComments, type Comment, type CommentType } from '@/lib/api/comments'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface DealDetailProps {
  dealId: string
}

export function DealDetail({ dealId, onClose }: DealDetailProps & { onClose?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToastNotification()
  
  // Validate dealId - use a safe default if invalid
  const safeDealId = (dealId && typeof dealId === 'string' && dealId.trim() !== '') ? dealId : ''
  
  // Helper functions for translations
  const getDirectionLabel = (value: string) => {
    return t(`contacts.direction.${value}`) || value
  }
  
  const getContactMethodLabel = (value: string) => {
    return t(`contacts.contactMethod.${value.toLowerCase()}`) || value
  }
  
  const getRejectionReasonLabel = (value: string) => {
    return t(`deals.rejectionReason.${value}`) || value
  }

  // Helper function to ensure contact exists
  const ensureContact = async () => {
    if (deal?.contact?.id) {
      return deal.contact.id
    }
    
    // Create a minimal contact if it doesn't exist
    try {
      const newContact = await createContact({
        fullName: deal?.title || 'New Contact',
      })
      
      // Link contact to deal
      if (deal?.id) {
        await updateDealApi(deal.id, { contactId: newContact.id } as any)
        await refetchDeal()
      }
      
      return newContact.id
    } catch (error) {
      console.error('Failed to create contact:', error)
      showError('Failed to create contact', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }
  
  const [selectedStage, setSelectedStage] = useState("new")
  const [assignedUser, setAssignedUser] = useState("Current User")
  const [showStageDropdown, setShowStageDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  
  // Local state for contact fields to prevent losing input on refetch
  const [contactLink, setContactLink] = useState('')
  const [contactSubscriberCount, setContactSubscriberCount] = useState('')
  const [contactWebsite, setContactWebsite] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  
  // Refs for debounce timers
  const linkTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const subscriberCountTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const websiteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const contactInfoTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use hooks
  const { deal, loading: dealLoading, error: dealError, updateDeal, updateField, refetch: refetchDeal } = useDeal({ dealId })
  
  // Sync local state with deal.contact when deal changes
  useEffect(() => {
    if (deal?.contact) {
      setContactLink(deal.contact.link || '')
      setContactSubscriberCount(deal.contact.subscriberCount || '')
      setContactWebsite(deal.contact.websiteOrTgChannel || '')
      setContactInfo(deal.contact.contactInfo || '')
    } else {
      setContactLink('')
      setContactSubscriberCount('')
      setContactWebsite('')
      setContactInfo('')
    }
  }, [deal?.contact?.id, deal?.contact?.link, deal?.contact?.subscriberCount, deal?.contact?.websiteOrTgChannel, deal?.contact?.contactInfo])
  const { tasks, createTask, updateTask, deleteTask, refetch: refetchTasks } = useDealTasks({ dealId })
  const { activities: legacyActivities, addActivity, groupByDate } = useDealActivity({ dealId })
  const { activities, loading: activitiesLoading, refetch: refetchActivities } = useActivity({ entityType: 'deal', entityId: dealId })
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

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true)
        const usersData = await getUsers()
        // Filter only active users
        const activeUsers = usersData.filter(user => user.isActive)
        setUsers(activeUsers)
      } catch (error) {
        console.error('Failed to load users:', error)
        setUsers([])
      } finally {
        setUsersLoading(false)
      }
    }
    loadUsers()
  }, [])

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        setCommentsLoading(true)
        const commentsData = await getDealComments(dealId)
        setComments(commentsData)
      } catch (error) {
        console.error('Failed to load comments:', error)
        setComments([])
      } finally {
        setCommentsLoading(false)
      }
    }
    loadComments()
  }, [dealId])

  // Load pipeline with stages when deal is loaded
  useEffect(() => {
    const loadPipeline = async () => {
      if (!deal?.pipelineId) {
        console.log('DealDetail: No pipelineId in deal', deal)
        setPipeline(null)
        return
      }

      console.log('DealDetail: Loading pipeline for deal', {
        pipelineId: deal.pipelineId,
        hasPipeline: !!deal.pipeline,
        hasStages: !!(deal.pipeline?.stages && deal.pipeline.stages.length > 0),
        stagesCount: deal.pipeline?.stages?.length || 0,
      })

      // If pipeline data is already in deal, use it
      if (deal.pipeline?.stages && deal.pipeline.stages.length > 0) {
        console.log('DealDetail: Using pipeline from deal data', deal.pipeline)
        setPipeline({
          id: deal.pipeline.id,
          name: deal.pipeline.name,
          description: deal.pipeline.description,
          isDefault: deal.pipeline.isDefault || false,
          isActive: deal.pipeline.isActive !== undefined ? deal.pipeline.isActive : true,
          order: deal.pipeline.order || 0,
          stages: deal.pipeline.stages.map((s: any) => ({
            id: s.id,
            name: s.name,
            order: s.order || 0,
            color: s.color || '#6B7280',
            isDefault: s.isDefault || false,
            isClosed: s.isClosed || false,
            createdAt: s.createdAt || '',
            updatedAt: s.updatedAt || '',
          })),
          createdAt: deal.pipeline.createdAt || '',
          updatedAt: deal.pipeline.updatedAt || '',
        })
        return
      }

      // Otherwise, fetch pipeline from API
      try {
        console.log('DealDetail: Fetching pipeline from API', deal.pipelineId)
        setPipelineLoading(true)
        const pipelineData = await getPipeline(deal.pipelineId)
        console.log('DealDetail: Pipeline loaded from API', pipelineData)
        setPipeline(pipelineData)
      } catch (error) {
        console.error('DealDetail: Failed to load pipeline:', error)
        setPipeline(null)
      } finally {
        setPipelineLoading(false)
      }
    }

    loadPipeline()
  }, [deal?.pipelineId, deal?.pipeline])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.stage-dropdown-container')) {
        setShowStageDropdown(false)
      }
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
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
      setSelectedStage(deal.stageId || deal.stage)
      // Set assigned user from deal data
      if (deal.assignedTo && deal.assignedTo.name) {
        setAssignedUser(deal.assignedTo.name)
      } else {
        setAssignedUser(t('tasks.unassigned'))
      }
    }
  }, [deal])

  const handleStageChange = async (newStageId: string) => {
    if (!deal) return

    const oldStageId = deal.stageId || deal.stage
    const oldStageName = pipeline?.stages?.find(s => s.id === oldStageId)?.name || oldStageId
    const newStageName = pipeline?.stages?.find(s => s.id === newStageId)?.name || newStageId

    setSelectedStage(newStageId)
    setShowStageDropdown(false)

    try {
      // Update deal via API
      await updateDealApi(dealId, { stageId: newStageId })
      
      // Reload deal to get updated data
      await refetchDeal()

      // Reload activities to show the stage change activity (created by backend)
      await refetchActivities()

      showSuccess(t('deals.stageUpdatedSuccess'))
    } catch (error) {
      console.error('Failed to update stage:', error)
      showError(t('deals.stageUpdateError'), error instanceof Error ? error.message : t('messages.pleaseTryAgain'))
      // Revert local state on error
      setSelectedStage(oldStageId)
    }
  }

  const handleTitleUpdate = async (title: string) => {
    await updateDeal({ title })
    // Reload activities to show the update activity (created by backend)
    await refetchActivities()
  }

  const handleTaskCreate = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      console.log('handleTaskCreate called with:', taskData)
      const newTask = await createTask(taskData)
      console.log('Task created:', newTask)
      
      // Reload activities to show the task creation activity (created by backend)
      await refetchActivities()
      
      // Reload tasks to show the newly created task
      await refetchTasks()
      
      showSuccess(t('tasks.taskCreated') || 'Task created successfully')
    } catch (error) {
      console.error('Failed to create task:', error)
      showError(t('tasks.createError') || 'Failed to create task', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  const handleCreateTaskFromModal = async (taskData: {
    title: string
    description?: string
    deadline?: string
    dealId?: string
    assignedToId: string
  }) => {
    try {
      console.log('handleCreateTaskFromModal called with:', taskData)
      
      // Get current user ID if not provided
      let assignedToId = taskData.assignedToId
      if (!assignedToId) {
        try {
          const userStr = localStorage.getItem('user')
          if (userStr) {
            const user = JSON.parse(userStr)
            assignedToId = user.id || ''
          }
        } catch (e) {
          console.error('Failed to get current user:', e)
        }
      }

      // Ensure we have a valid assignedToId
      if (!assignedToId) {
        // Try to get from users list
        if (users.length > 0) {
          assignedToId = users[0].id
        } else {
          console.warn('No assignedToId available, using empty string')
          assignedToId = ''
        }
      }

      const taskPayload: Omit<Task, 'id' | 'createdAt'> = {
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.deadline,
        dealId: taskData.dealId || dealId,
        contactId: deal?.contact?.id,
        assignee: assignedToId, // Pass as string, hook will handle conversion
        status: 'open', // Will be converted to 'TODO' in the hook
        priority: 'medium',
        completed: false
      }
      
      console.log('Creating task with payload:', taskPayload)
      
      await handleTaskCreate(taskPayload)
      
      console.log('Task created successfully')
      setIsCreateTaskModalOpen(false)
    } catch (error) {
      console.error('Failed to create task from modal:', error)
      showError('Failed to create task', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    await updateTask(taskId, updates)

    // Reload activities to show the task update activity (created by backend)
    await refetchActivities()
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      
      // Reload activities to show the task deletion activity (created by backend)
      await refetchActivities()
      
      // Reload tasks to remove the deleted task
      await refetchTasks()
      
      showSuccess(t('tasks.taskDeleted'))
    } catch (error) {
      console.error('Failed to delete task:', error)
      showError(t('tasks.deleteError'))
    }
  }

  const handleFileUpload = async (file: File) => {
    const uploadedFile = await uploadFile(file)
    
    // Reload activities to show the file upload activity (created by backend)
    await refetchActivities()
  }

  const handleCommentAdd = async (
    message: string,
    type: 'comment' | 'internal_note' | 'client_message',
    files?: File[]
  ) => {
    if (!message.trim()) {
      showError(t('common.error'), t('deals.commentEmptyError'))
      return
    }

    try {
      // Map frontend comment types to backend types
      const backendType: CommentType = 
        type === 'comment' ? 'COMMENT' :
        type === 'internal_note' ? 'INTERNAL_NOTE' :
        'CLIENT_MESSAGE'

      // Create comment via API
      const newComment = await createComment({
        content: message,
        type: backendType,
        dealId: dealId,
      })

      // Add to local comments list
      setComments(prev => [newComment, ...prev])

      // Reload activities to show the new comment activity (created by backend)
      await refetchActivities()

      showSuccess('Comment added successfully')

      // TODO: Handle file uploads if files are provided
      if (files && files.length > 0) {
        console.warn('File uploads in comments are not yet implemented')
      }
    } catch (error) {
      console.error('Failed to create comment:', error)
      showError('Failed to add comment', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleBack = () => {
    const isNewDeal = typeof window !== 'undefined' && 
      sessionStorage.getItem(`deal-${dealId}-isNew`) === 'true'
    
    if (isNewDeal && (!deal?.title?.trim() && !deal?.amount)) {
      sessionStorage.removeItem(`deal-${dealId}`)
      sessionStorage.removeItem(`deal-${dealId}-isNew`)
    }
    
    // If onClose is provided, use it (modal mode), otherwise navigate
    if (onClose) {
      onClose()
    } else {
      navigate('/deals')
    }
  }

  // Show skeleton only while deal is loading (before we have any deal data)
  if (dealLoading && !deal) {
    return <DetailSkeleton />
  }

  if (dealError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-destructive mb-2">Error loading deal</div>
        <div className="text-sm text-muted-foreground mb-4">{dealError}</div>
        <Button 
          variant="outline"
          onClick={() => navigate('/deals')}
        >
          Back to Deals
        </Button>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-muted-foreground mb-4">Deal not found</div>
        <Button 
          variant="outline"
          onClick={() => navigate('/deals')}
        >
          Back to Deals
        </Button>
      </div>
    )
  }

  // Get stages from pipeline, or fallback to empty array
  const stages: Array<{ value: string; label: string; color: string }> = pipeline?.stages
    ? pipeline.stages
        .sort((a, b) => a.order - b.order)
        .map((stage) => ({
          value: stage.id,
          label: stage.name,
          color: stage.color || '#6B7280',
        }))
    : []

  // Transform users to format needed for dropdown
  const usersForDropdown = users.map(user => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim() || user.email,
    email: user.email,
    avatar: user.avatar || undefined,
  }))

  // Add "Unassigned" option if deal has no assigned user
  if (!deal?.assignedTo || !deal.assignedTo.id) {
    const unassignedOption = { id: 'unassigned', name: 'Unassigned', email: '', avatar: undefined }
    if (!usersForDropdown.find(u => u.id === 'unassigned')) {
      usersForDropdown.unshift(unassignedOption)
    }
  }

  const currentStage = stages.find(s => s.value === selectedStage) || (stages.length > 0 ? stages[0] : { value: selectedStage, label: t('deals.unknownStage'), color: '#6B7280' })
  const currentUser = usersForDropdown.find(u => u.name === assignedUser || u.id === deal?.assignedTo?.id) || usersForDropdown[0] || { id: 'unassigned', name: 'Unassigned', email: '', avatar: undefined }

  // Transform API comments to format expected by DealCommentsPanel
  const commentsForPanel = comments.map(comment => ({
    id: comment.id,
    type: (
      comment.type === 'COMMENT' ? 'comment' :
      comment.type === 'INTERNAL_NOTE' ? 'internal_note' :
      'client_message'
    ) as 'comment' | 'internal_note' | 'client_message',
    message: comment.content,
    user: {
      id: comment.user.id,
      name: comment.user.name || comment.user.fullName || comment.user.email || 'Unknown User',
      avatar: comment.user.avatar,
    },
    createdAt: comment.createdAt,
    files: [] // TODO: Add file support when backend supports it
  }))

  return (
    <div className={`flex flex-col md:flex-row ${onClose ? 'h-full w-full' : 'h-[calc(100vh-3rem)]'} overflow-hidden`}>
      {/* LEFT COLUMN: Deal Info - Show immediately when deal is loaded */}
      <div className="w-full md:w-80 flex-shrink-0 overflow-y-auto border-r border-border/50 bg-accent/5 scroll-smooth animate-in fade-in-0 duration-200">
        <DealHeader
          deal={deal}
          onTitleUpdate={handleTitleUpdate}
          onBack={onClose ? undefined : handleBack}
          onClose={onClose}
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
            <label className="text-xs font-semibold text-foreground mb-2 block">{t('deals.stage')}</label>
            {pipelineLoading ? (
              <div className="w-full px-3 h-9 rounded-md border border-border/30 flex items-center bg-transparent">
                <span className="text-sm text-muted-foreground">{t('deals.loadingStages')}</span>
              </div>
            ) : stages.length === 0 ? (
              <div className="w-full px-3 h-9 rounded-md border border-border/30 flex items-center bg-transparent">
                <span className="text-sm text-muted-foreground">{t('deals.noStagesAvailable')}</span>
              </div>
            ) : (
              <div className="relative stage-dropdown-container">
                <button
                  onClick={() => setShowStageDropdown(!showStageDropdown)}
                  className="w-full flex items-center justify-between px-3 h-9 rounded-md border border-border/30 hover:border-border/60 transition-colors bg-transparent"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: currentStage.color }}
                    />
                    <span className="text-sm text-foreground">{currentStage.label}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                {showStageDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {stages.map((stage) => (
                      <button
                        key={stage.value}
                        onClick={() => handleStageChange(stage.value)}
                        className="w-full flex items-center gap-2 px-3 h-9 hover:bg-accent/50 first:rounded-t-md last:rounded-b-md transition-colors"
                      >
                        <div 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-sm text-foreground">{stage.label}</span>
                        {selectedStage === stage.value && (
                          <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Responsible */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">Ответственный</label>
            {usersLoading ? (
              <div className="w-full px-3 h-9 rounded-md border border-border/30 flex items-center bg-transparent">
                <span className="text-sm text-muted-foreground">Loading users...</span>
              </div>
            ) : usersForDropdown.length === 0 ? (
              <div className="w-full px-3 h-9 rounded-md border border-border/30 flex items-center bg-transparent">
                <span className="text-sm text-muted-foreground">No users available</span>
              </div>
            ) : (
              <div className="relative user-dropdown-container">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="w-full flex items-center justify-between px-3 h-9 rounded-md border border-border/30 hover:border-border/60 transition-colors bg-transparent"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="text-[10px]">
                        {currentUser.name.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">{currentUser.name || 'Unassigned'}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                {showUserDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {usersForDropdown.map((user) => (
                      <button
                        key={user.id}
                        onClick={async () => {
                          if (user.id === 'unassigned') {
                            setAssignedUser('Unassigned')
                            setShowUserDropdown(false)
                            try {
                              await updateDealApi(dealId, { assignedToId: null })
                              await refetchDeal()
                              await refetchActivities()
                              showSuccess('Responsible user updated')
                            } catch (error) {
                              console.error('Failed to update assigned user:', error)
                              showError('Failed to update responsible user', error instanceof Error ? error.message : 'Unknown error')
                            }
                          } else {
                            setAssignedUser(user.name)
                            setShowUserDropdown(false)
                            try {
                              await updateDealApi(dealId, { assignedToId: user.id })
                              await refetchDeal()
                              await refetchActivities()
                              showSuccess('Responsible user updated')
                            } catch (error) {
                              console.error('Failed to update assigned user:', error)
                              showError('Failed to update responsible user', error instanceof Error ? error.message : 'Unknown error')
                            }
                          }
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 h-9 hover:bg-accent/50 first:rounded-t-md last:rounded-b-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {user.name.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">{user.name}</span>
                        </div>
                        {(assignedUser === user.name || deal?.assignedTo?.id === user.id) && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact Fields - Always show, even if contact doesn't exist */}
          <div className="space-y-3 pt-4 border-t border-border/50">
              {/* Link */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {t('contacts.link') || 'Ссылка'}
                </label>
                <Input
                  value={contactLink}
                  onChange={(e) => {
                    const value = e.target.value
                    setContactLink(value) // Update local state immediately
                    
                    // Clear previous timeout
                    if (linkTimeoutRef.current) {
                      clearTimeout(linkTimeoutRef.current)
                    }
                    
                    // Debounce API call
                    linkTimeoutRef.current = setTimeout(async () => {
                      try {
                        const contactId = deal?.contact?.id || await ensureContact()
                        await updateContact(contactId, { link: value || undefined })
                        await refetchDeal()
                        await refetchActivities()
                      } catch (error) {
                        console.error('Failed to update link:', error)
                        // Restore previous value on error
                        setContactLink(deal?.contact?.link || '')
                      }
                    }, 800)
                  }}
                  placeholder={t('contacts.linkPlaceholder') || 'Вставьте ссылку'}
                  className="h-8 text-sm border-border/30 hover:border-border/60 focus:border-border bg-transparent"
                />
              </div>

              {/* Subscriber Count */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {t('contacts.subscriberCount') || 'Кол-во подписчиков'}
                </label>
                <Input
                  value={contactSubscriberCount}
                  onChange={(e) => {
                    const value = e.target.value
                    setContactSubscriberCount(value) // Update local state immediately
                    
                    // Clear previous timeout
                    if (subscriberCountTimeoutRef.current) {
                      clearTimeout(subscriberCountTimeoutRef.current)
                    }
                    
                    // Debounce API call
                    subscriberCountTimeoutRef.current = setTimeout(async () => {
                      try {
                        const contactId = deal?.contact?.id || await ensureContact()
                        await updateContact(contactId, { subscriberCount: value || undefined })
                        await refetchDeal()
                        await refetchActivities()
                      } catch (error) {
                        console.error('Failed to update subscriber count:', error)
                        setContactSubscriberCount(deal?.contact?.subscriberCount || '')
                      }
                    }, 800)
                  }}
                  placeholder={t('contacts.subscriberCountPlaceholder') || 'Введите количество'}
                  className="h-8 text-sm border-border/30 hover:border-border/60 focus:border-border bg-transparent"
                />
              </div>

              {/* Directions - Multi-select */}
              <div onClick={(e) => e.stopPropagation()}>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {t('contacts.directions') || 'Направление'}
                </label>
                <Select
                  value=""
                  onValueChange={async (value) => {
                    try {
                      const contactId = await ensureContact()
                      const currentDirections = deal?.contact?.directions || []
                      if (!currentDirections.includes(value)) {
                        await updateContact(contactId, { directions: [...currentDirections, value] })
                        await refetchDeal()
                        await refetchActivities()
                      }
                    } catch (error) {
                      console.error('Failed to update directions:', error)
                    }
                  }}
                  modal={true}
                >
                  <SelectTrigger 
                    className="h-8 text-sm border-border/30 hover:border-border/60 focus:border-border bg-transparent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue placeholder={t('contacts.selectDirection') || 'Выберите направление'} />
                  </SelectTrigger>
                  <SelectContent 
                    onInteractOutside={(e) => {
                      e.preventDefault()
                    }}
                    onEscapeKeyDown={(e) => {
                      e.preventDefault()
                    }}
                  >
                    <SelectItem value="marketing">
                      {t('contacts.direction.marketing') || 'Маркетинг'}
                    </SelectItem>
                    <SelectItem value="sales">
                      {t('contacts.direction.sales') || 'Продажи'}
                    </SelectItem>
                    <SelectItem value="support">
                      {t('contacts.direction.support') || 'Поддержка'}
                    </SelectItem>
                    <SelectItem value="development">
                      {t('contacts.direction.development') || 'Разработка'}
                    </SelectItem>
                    <SelectItem value="other">
                      {t('contacts.direction.other') || 'Другое'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {deal?.contact?.directions && deal.contact.directions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {deal.contact.directions.map((direction, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md text-xs border border-border/20"
                      >
                        <span>{getDirectionLabel(direction)}</span>
                        <button
                          onClick={async () => {
                            try {
                              const contactId = await ensureContact()
                              const updatedDirections = deal?.contact?.directions?.filter((d) => d !== direction) || []
                              await updateContact(contactId, { directions: updatedDirections })
                              await refetchDeal()
                              await refetchActivities()
                            } catch (error) {
                              console.error('Failed to remove direction:', error)
                            }
                          }}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Methods - Multi-select */}
              <div onClick={(e) => e.stopPropagation()}>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {t('contacts.contactMethods') || 'Способ связи'}
                </label>
                <Select
                  value=""
                  onValueChange={async (value) => {
                    try {
                      const contactId = await ensureContact()
                      const currentMethods = deal?.contact?.contactMethods || []
                      if (!currentMethods.includes(value)) {
                        await updateContact(contactId, { contactMethods: [...currentMethods, value] })
                        await refetchDeal()
                        await refetchActivities()
                      }
                    } catch (error) {
                      console.error('Failed to update contact methods:', error)
                    }
                  }}
                  modal={true}
                >
                  <SelectTrigger 
                    className="h-8 text-sm border-border/30 hover:border-border/60 focus:border-border bg-transparent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue placeholder={t('contacts.selectContactMethod') || 'Выберите способ связи'} />
                  </SelectTrigger>
                  <SelectContent 
                    onInteractOutside={(e) => {
                      e.preventDefault()
                    }}
                    onEscapeKeyDown={(e) => {
                      e.preventDefault()
                    }}
                  >
                    <SelectItem value="Whatsapp">
                      {t('contacts.contactMethod.whatsapp') || 'Whatsapp'}
                    </SelectItem>
                    <SelectItem value="Telegram">
                      {t('contacts.contactMethod.telegram') || 'Telegram'}
                    </SelectItem>
                    <SelectItem value="Direct">
                      {t('contacts.contactMethod.direct') || 'Direct'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {deal?.contact?.contactMethods && deal.contact.contactMethods.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {deal.contact.contactMethods.map((method, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md text-xs border border-border/20"
                      >
                        <span>{getContactMethodLabel(method)}</span>
                        <button
                          onClick={async () => {
                            try {
                              const contactId = await ensureContact()
                              const updatedMethods = deal?.contact?.contactMethods?.filter((m) => m !== method) || []
                              await updateContact(contactId, { contactMethods: updatedMethods })
                              await refetchDeal()
                              await refetchActivities()
                            } catch (error) {
                              console.error('Failed to remove contact method:', error)
                            }
                          }}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Website or TG Channel */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {t('contacts.websiteOrTgChannel') || 'Сайт, тг канал'}
                </label>
                <Input
                  value={contactWebsite}
                  onChange={(e) => {
                    const value = e.target.value
                    setContactWebsite(value) // Update local state immediately
                    
                    // Clear previous timeout
                    if (websiteTimeoutRef.current) {
                      clearTimeout(websiteTimeoutRef.current)
                    }
                    
                    // Debounce API call
                    websiteTimeoutRef.current = setTimeout(async () => {
                      try {
                        const contactId = deal?.contact?.id || await ensureContact()
                        await updateContact(contactId, { websiteOrTgChannel: value || undefined })
                        await refetchDeal()
                        await refetchActivities()
                      } catch (error) {
                        console.error('Failed to update website/TG channel:', error)
                        setContactWebsite(deal?.contact?.websiteOrTgChannel || '')
                      }
                    }, 800)
                  }}
                  placeholder={t('contacts.websiteOrTgChannelPlaceholder') || 'Введите ссылку на сайт или тг канал'}
                  className="h-8 text-sm border-border/30 hover:border-border/60 focus:border-border bg-transparent"
                />
              </div>

              {/* Contact Info */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {t('contacts.contactInfo') || 'Контакт'}
                </label>
                <Input
                  value={contactInfo}
                  onChange={(e) => {
                    const value = e.target.value
                    setContactInfo(value) // Update local state immediately
                    
                    // Clear previous timeout
                    if (contactInfoTimeoutRef.current) {
                      clearTimeout(contactInfoTimeoutRef.current)
                    }
                    
                    // Debounce API call
                    contactInfoTimeoutRef.current = setTimeout(async () => {
                      try {
                        const contactId = deal?.contact?.id || await ensureContact()
                        await updateContact(contactId, { contactInfo: value || undefined })
                        await refetchDeal()
                        await refetchActivities()
                      } catch (error) {
                        console.error('Failed to update contact info:', error)
                        setContactInfo(deal?.contact?.contactInfo || '')
                      }
                    }, 800)
                  }}
                  placeholder={t('contacts.contactInfoPlaceholder') || 'Номер телефона или никнейм в телеграме'}
                  className="h-8 text-sm border-border/30 hover:border-border/60 focus:border-border bg-transparent"
                />
              </div>
            </div>

          {/* Rejection Reasons */}
          <div className="pt-4 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
            <label className="text-xs font-semibold text-foreground mb-2 block">
              {t('deals.rejectionReasons') || 'Причина отказа'}
            </label>
            <div className="space-y-2">
              <Select
                value=""
                onValueChange={async (value) => {
                  const currentReasons = deal.rejectionReasons || []
                  if (!currentReasons.includes(value)) {
                    await updateDeal({ rejectionReasons: [...currentReasons, value] })
                    await refetchActivities()
                  }
                }}
                modal={true}
              >
                <SelectTrigger 
                  className="h-8 text-sm border-border/30 hover:border-border/60 focus:border-border bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                >
                  <SelectValue placeholder={t('deals.selectRejectionReason') || 'Выберите причину отказа'} />
                </SelectTrigger>
                <SelectContent 
                  onInteractOutside={(e) => {
                    e.preventDefault()
                  }}
                  onEscapeKeyDown={(e) => {
                    e.preventDefault()
                  }}
                >
                  <SelectItem value="price">
                    {t('deals.rejectionReason.price') || 'Цена'}
                  </SelectItem>
                  <SelectItem value="competitor">
                    {t('deals.rejectionReason.competitor') || 'Конкурент'}
                  </SelectItem>
                  <SelectItem value="timing">
                    {t('deals.rejectionReason.timing') || 'Сроки'}
                  </SelectItem>
                  <SelectItem value="budget">
                    {t('deals.rejectionReason.budget') || 'Бюджет'}
                  </SelectItem>
                  <SelectItem value="requirements">
                    {t('deals.rejectionReason.requirements') || 'Требования'}
                  </SelectItem>
                  <SelectItem value="other">
                    {t('deals.rejectionReason.other') || 'Другое'}
                  </SelectItem>
                </SelectContent>
              </Select>
              {deal.rejectionReasons && deal.rejectionReasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {deal.rejectionReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md text-xs border border-border/20"
                    >
                      <span>{getRejectionReasonLabel(reason)}</span>
                      <button
                        onClick={async () => {
                          const updatedReasons = deal.rejectionReasons?.filter((r) => r !== reason) || []
                          await updateDeal({ rejectionReasons: updatedReasons })
                          await refetchActivities()
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tasks - Moved to end */}
          <div className="space-y-2 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t('deals.tasks')}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsCreateTaskModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Button>
            </div>
            {!tasks || tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">{t('deals.noTasksYet')}</p>
            ) : (
              <DealTasksList
                tasks={tasks || []}
                onTaskCreate={handleTaskCreate}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onTaskClick={(task) => {
                  setSelectedTask(task)
                  setIsTaskModalOpen(true)
                }}
              />
            )}
          </div>

          {/* Cross Navigation - Compact - Moved to end */}
          <div className="pt-1">
            <CrossNavigation
              companies={
                deal?.company
                  ? [
                      {
                        id: deal.company.id,
                        name: deal.company.name || '',
                        industry: deal.company.industry || undefined,
                        stats: deal.company.stats || undefined,
                      },
                    ]
                  : deal?.contact?.company
                  ? [
                      {
                        id: deal.contact.company.id,
                        name: deal.contact.company.name || '',
                        industry: deal.contact.company.industry || undefined,
                        stats: deal.contact.company.stats || undefined,
                      },
                    ]
                  : []
              }
              className="space-y-2"
            />
          </div>

          {/* Contact Card - Simple card like TaskCard - At the end */}
          {deal?.contact && (
            <div className="pt-1">
              <ContactCard contact={deal.contact} />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Unified Activity Timeline + Comments */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background hidden md:flex animate-in fade-in-50 duration-200" style={{ minWidth: '640px' }}>
        <div className="flex-1 overflow-y-auto pl-6 pr-6 py-6 scroll-smooth">
          {/* Activity Timeline */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t('deals.activity')}</h3>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <Skeleton className="h-4 w-3/4 rounded-sm" />
                      <Skeleton className="h-3 w-1/2 rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityTimeline 
                activities={activities} 
                pipelineStages={pipeline?.stages?.map(s => ({ id: s.id, name: s.name }))}
              />
            )}
          </div>
        </div>

        {/* Comments Panel (Fixed at bottom) */}
        <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-border/50 bg-card/95 backdrop-blur-sm px-6 py-4 transition-all duration-200">
          <DealCommentsPanel
            comments={commentsForPanel}
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
          onDelete={async (taskId: string) => {
            await handleTaskDelete(taskId)
            setIsTaskModalOpen(false)
            setSelectedTask(null)
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

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSave={handleCreateTaskFromModal}
        defaultDealId={dealId}
        defaultContactId={deal?.contact?.id}
      />
    </div>
  )
}

