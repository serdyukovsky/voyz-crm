"use client"

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DollarSign, ChevronDown, Check, Plus, XCircle, Link as LinkIcon, Users, Hash, MessageCircle, Globe } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TaskDetailModal } from "./task-detail-modal"
import { DealHeader } from './deal/deal-header'
import { DealTasksList } from './deal/deal-tasks-list'
import { ContactCard } from './deal/contact-card'
import { CreateTaskModal } from './create-task-modal'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { useActivity } from '@/hooks/use-activity'
import { DealCommentsPanel } from './deal/deal-comments-panel'
import { useDealDetail, dealKeys } from '@/hooks/use-deals'
import { contactKeys } from '@/hooks/use-contacts'
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
import { getUsers, type User } from '@/lib/api/users'
import { createComment, getDealComments, updateCommentType, type Comment, type CommentType } from '@/lib/api/comments'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { getSystemFieldOptions } from '@/lib/api/system-field-options'

interface DealDetailProps {
  dealId: string
}

export function DealDetail({ dealId, onClose }: DealDetailProps & { onClose?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToastNotification()
  const queryClient = useQueryClient()
  
  // Validate dealId - use a safe default if invalid
  const safeDealId = (dealId && typeof dealId === 'string' && dealId.trim() !== '') ? dealId : ''
  
  // Helper functions for translations
  const getDirectionLabel = (value: string) => {
    if (!value) return value
    
    // Try to get translation
    const translation = t(`contacts.direction.${value}`)
    
    // If translation was found (not the key itself), return it
    if (translation && !translation.startsWith('contacts.direction.')) {
      return translation
    }
    
    // For custom directions from CSV (like "Китай", "Алтай", "Байкал"), return as-is
    return value
  }
  
  const getContactMethodLabel = (value: string) => {
    return t(`contacts.contactMethod.${value.toLowerCase()}`) || value
  }
  
  const getRejectionReasonLabel = (value: string) => {
    if (!value) return value
    
    // Standard rejection reason keys (English)
    const standardReasons = ['price', 'competitor', 'timing', 'budget', 'requirements', 'other']
    
    // If it's a standard reason, try to get translation
    if (standardReasons.includes(value.toLowerCase())) {
      const translation = t(`deals.rejectionReason.${value.toLowerCase()}`)
      // Check if translation was found (not the key itself)
      if (translation && !translation.startsWith('deals.rejectionReason.')) {
        return translation
      }
    }
    
    // For custom reasons from CSV (like "Игнор", "Туроператор"), return as-is
    return value
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
      if (dealId) {
        await updateDeal({ contactId: newContact.id })
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
  const [rejectionReasonsOptions, setRejectionReasonsOptions] = useState<string[]>([])
  const [directionsOptions, setDirectionsOptions] = useState<string[]>([])
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
  const [openDirections, setOpenDirections] = useState(false)
  const [openMethods, setOpenMethods] = useState(false)
  const [openReasons, setOpenReasons] = useState(false)

  // Search state for multi-select dropdowns
  const [searchDirections, setSearchDirections] = useState('')
  const [searchMethods, setSearchMethods] = useState('')
  const [searchReasons, setSearchReasons] = useState('')

  // Local state for contact fields to prevent losing input on refetch
  const [contactLink, setContactLink] = useState('')
  const [contactSubscriberCount, setContactSubscriberCount] = useState('')
  const [contactWebsite, setContactWebsite] = useState('')
  const [contactInfo, setContactInfo] = useState('')

  // Local state for multi-select fields - for instant UI updates (optimistic)
  const [localDirections, setLocalDirections] = useState<string[]>([])
  const [localContactMethods, setLocalContactMethods] = useState<string[]>([])
  const [localRejectionReasons, setLocalRejectionReasons] = useState<string[]>([])

  // Refs for debounce timers
  const linkTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const subscriberCountTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const websiteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const contactInfoTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use hooks
  const { deal, loading: dealLoading, error: dealError, updateDeal, updateField, refetch: refetchDeal } = useDealDetail({ dealId })
  
  // Sync local state with deal.contact when deal changes
  useEffect(() => {
    if (deal?.contact) {
      setContactLink(deal.contact.link || '')
      setContactSubscriberCount(deal.contact.subscriberCount || '')
      setContactWebsite(deal.contact.websiteOrTgChannel || '')
      setContactInfo(deal.contact.contactInfo || '')
      // Initialize multi-select fields
      setLocalDirections(deal.contact.directions || [])
      setLocalContactMethods(deal.contact.contactMethods || [])
    } else {
      setContactLink('')
      setContactSubscriberCount('')
      setContactWebsite('')
      setContactInfo('')
      setLocalDirections([])
      setLocalContactMethods([])
    }
  }, [deal?.contact?.id, deal?.contact?.link, deal?.contact?.subscriberCount, deal?.contact?.websiteOrTgChannel, deal?.contact?.contactInfo, deal?.contact?.directions, deal?.contact?.contactMethods])

  // Sync rejection reasons local state
  useEffect(() => {
    if (deal?.rejectionReasons) {
      setLocalRejectionReasons(deal.rejectionReasons)
    } else {
      setLocalRejectionReasons([])
    }
  }, [deal?.rejectionReasons])
  const { tasks, createTask, updateTask, deleteTask } = useDealTasks({ dealId })
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

  // Load rejection reasons options from API
  useEffect(() => {
    const loadRejectionReasonsOptions = async () => {
      try {
        console.log('[DEAL DETAIL] Loading rejection reasons options...')
        const options = await getSystemFieldOptions('deal', 'rejectionReasons')
        console.log('[DEAL DETAIL] Loaded rejection reasons options:', options)
        setRejectionReasonsOptions(options)
      } catch (error) {
        console.error('[DEAL DETAIL] Failed to load rejection reasons options:', error)
        // Fallback to default options if API fails
        console.log('[DEAL DETAIL] Using fallback rejection reasons options')
        setRejectionReasonsOptions(['price', 'competitor', 'timing', 'budget', 'requirements', 'other'])
      }
    }
    loadRejectionReasonsOptions()
  }, [])

  // Load directions options from API
  useEffect(() => {
    const loadDirectionsOptions = async () => {
      try {
        console.log('[DEAL DETAIL] Loading directions options...')
        const options = await getSystemFieldOptions('contact', 'directions')
        console.log('[DEAL DETAIL] Loaded directions options:', options)
        setDirectionsOptions(options)
      } catch (error) {
        console.error('[DEAL DETAIL] Failed to load directions options:', error)
        // Fallback to empty array if API fails - will show no options
        setDirectionsOptions([])
      }
    }
    loadDirectionsOptions()
  }, [])

  // Load pipeline with stages when deal is loaded
  useEffect(() => {
    const loadPipeline = async () => {
      if (!deal?.pipelineId) {
        setPipeline(null)
        return
      }

      // If pipeline data is already in deal, use it
      if (deal.pipeline?.stages && deal.pipeline.stages.length > 0) {
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
        setPipelineLoading(true)
        const pipelineData = await getPipeline(deal.pipelineId)
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
      if (!target.closest('.directions-dropdown-container')) {
        setOpenDirections(false)
        setSearchDirections('')
      }
      if (!target.closest('.methods-dropdown-container')) {
        setOpenMethods(false)
      }
      if (!target.closest('.reasons-dropdown-container')) {
        setOpenReasons(false)
        setSearchReasons('')
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
      // Update deal via React Query hook (automatically invalidates cache)
      await updateDeal({ stageId: newStageId })

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
      const newTask = await createTask(taskData)
      
      // Reload activities to show the task creation activity (created by backend)
      await refetchActivities()

      // Tasks are automatically refreshed by React Query mutation cache invalidation
      
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
      
      await handleTaskCreate(taskPayload)
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

      // Tasks are automatically refreshed by React Query mutation cache invalidation
      
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

  const handleUnpinNote = async (commentId: string) => {
    try {
      // Change INTERNAL_NOTE to COMMENT (unpin)
      await updateCommentType(commentId, 'COMMENT')

      // Reload activities to reflect the change
      await refetchActivities()

      showSuccess('Примечание откреплено')
    } catch (error) {
      console.error('Failed to unpin note:', error)
      showError(t('deals.unpinError') || 'Не удалось открепить примечание', error instanceof Error ? error.message : 'Unknown error')
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
      <div className="w-full md:w-[420px] flex-shrink-0 overflow-y-auto border-r border-border/50 bg-accent/5 scroll-smooth animate-in fade-in-0 duration-200">
        <DealHeader
          deal={deal}
          onTitleUpdate={handleTitleUpdate}
          onBack={onClose ? undefined : handleBack}
          onClose={onClose}
          isNewDeal={typeof window !== 'undefined' && 
            sessionStorage.getItem(`deal-${dealId}-isNew`) === 'true'}
          onDuplicate={() => {
            // TODO: Implement duplicate
          }}
          onArchive={() => {
            // TODO: Implement archive
          }}
          onDelete={() => {
            // TODO: Implement delete
          }}
        />

        <div className="px-6 py-4 space-y-4">
          {/* Stage */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-foreground flex-shrink-0 w-32">{t('deals.stage')}</label>
            <div className="flex-1">
            {pipelineLoading ? (
              <div className="w-full px-3 h-9 rounded-md flex items-center bg-transparent">
                <span className="text-sm text-muted-foreground">{t('deals.loadingStages')}</span>
              </div>
            ) : stages.length === 0 ? (
              <div className="w-full px-3 h-9 rounded-md flex items-center bg-transparent">
                <span className="text-sm text-muted-foreground">{t('deals.noStagesAvailable')}</span>
              </div>
            ) : (
              <div className="relative stage-dropdown-container">
                <button
                  onClick={() => setShowStageDropdown(!showStageDropdown)}
                  className="w-full flex items-center justify-between px-3 h-9 rounded-md bg-transparent"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: currentStage.color }}
                    />
                    <span className="text-sm text-foreground">{currentStage.label}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                {showStageDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card rounded-md shadow-lg max-h-60 overflow-y-auto">
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
          </div>

          {/* Responsible */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-foreground flex-shrink-0 w-32">Ответственный</label>
            <div className="flex-1">
            {usersLoading ? (
              <div className="w-full px-3 h-9 rounded-md flex items-center bg-transparent">
                <span className="text-sm text-muted-foreground">Loading users...</span>
              </div>
            ) : usersForDropdown.length === 0 ? (
              <div className="w-full px-3 h-9 rounded-md flex items-center bg-transparent">
                <span className="text-sm text-muted-foreground">No users available</span>
              </div>
            ) : (
              <div className="relative user-dropdown-container">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="w-full flex items-center justify-between px-3 h-9 rounded-md bg-transparent"
                >
                  <div className="flex items-center gap-3">
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
                  <div className="absolute z-50 w-full mt-1 bg-card rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {usersForDropdown.map((user) => (
                      <button
                        key={user.id}
                        onClick={async () => {
                          if (user.id === 'unassigned') {
                            setAssignedUser('Unassigned')
                            setShowUserDropdown(false)
                            try {
                              await updateDeal({ assignedToId: null })
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
                              await updateDeal({ assignedToId: user.id })
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
                        <div className="flex items-center gap-3">
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
          </div>

          {/* Contact Fields - Always show, even if contact doesn't exist */}
          <div className="space-y-3 pt-4 border-t border-border/50">
              {/* Link */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-foreground flex-shrink-0 w-32">
                  {t('contacts.link') || 'Ссылка'}
                </label>
                <div className="flex-1">
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
                        await updateContact(contactId, { link: value || undefined }, dealId)
                        // Invalidate contact cache instead of refetching entire deal
                        queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) })
                        // Only refetch activities if value changed significantly
                        if (deal?.contact?.link !== value) {
                          await refetchActivities()
                        }
                      } catch (error) {
                        console.error('Failed to update link:', error)
                        // Restore previous value on error
                        setContactLink(deal?.contact?.link || '')
                      }
                    }, 800)
                  }}
                  placeholder={t('contacts.linkPlaceholder') || 'Вставьте ссылку'}
                  className="h-9 text-sm bg-transparent !border-none !shadow-none"
                />
                </div>
              </div>

              {/* Subscriber Count */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-foreground flex-shrink-0 w-32">
                  {t('contacts.subscriberCount') || 'Кол-во подписчиков'}
                </label>
                <div className="flex-1">
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
                        await updateContact(contactId, { subscriberCount: value || undefined }, dealId)
                        // Invalidate contact cache instead of refetching entire deal
                        queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) })
                        // Only refetch activities if value changed significantly (not on every keystroke)
                        if (deal?.contact?.subscriberCount !== value) {
                          await refetchActivities()
                        }
                      } catch (error) {
                        console.error('Failed to update subscriber count:', error)
                        setContactSubscriberCount(deal?.contact?.subscriberCount || '')
                      }
                    }, 800)
                  }}
                  placeholder={t('contacts.subscriberCountPlaceholder') || 'Введите количество'}
                  className="h-9 text-sm bg-transparent !border-none !shadow-none"
                />
                </div>
              </div>

              {/* Directions - Multi-select with Checkboxes */}
              <div onClick={(e) => e.stopPropagation()} className="flex items-start gap-3 directions-dropdown-container mb-3">
                <label className="text-sm text-foreground flex-shrink-0 w-32 pt-2">
                  {t('contacts.directions') || 'Направление'}
                </label>
                <div className="flex-1 relative">
                  <button
                    onClick={() => {
                      console.log('[DEAL DETAIL] Directions dropdown clicked, current options:', directionsOptions)
                      setOpenDirections(!openDirections)
                      if (openDirections) {
                        setSearchDirections('')
                      }
                    }}
                    className="w-full flex items-start justify-between gap-2 px-3 min-h-9 py-2 rounded-md bg-transparent text-sm text-left"
                  >
                    <div className="text-foreground text-left flex-1">
                      {localDirections && localDirections.length > 0
                        ? localDirections.map((d, idx) => (
                            <div key={idx} className="text-sm">
                              {getDirectionLabel(d)}
                            </div>
                          ))
                        : 'Выберите направление'}
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0 ${openDirections ? 'rotate-180' : ''}`} />
                  </button>

                  {openDirections && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-md p-2 bg-card shadow-md z-50">
                      {directionsOptions.length > 10 && (
                        <Input
                          type="text"
                          placeholder="Поиск..."
                          value={searchDirections}
                          onChange={(e) => setSearchDirections(e.target.value)}
                          className="mb-2 h-7 text-xs bg-transparent !border-none !shadow-none"
                        />
                      )}
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {directionsOptions.length > 0 ? (
                          directionsOptions
                            .filter((direction) =>
                              getDirectionLabel(direction)
                                .toLowerCase()
                                .includes(searchDirections.toLowerCase())
                            )
                            .map((direction) => (
                          <div key={direction} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`direction-${direction}`}
                              checked={localDirections.includes(direction)}
                              onChange={async (e) => {
                                try {
                                  console.time('[Directions] Total time')
                                  const isChecked = e.target.checked

                                  console.log('[Directions] === START (INSTANT LOCAL UPDATE) ===')

                                  // Calculate new directions
                                  let newDirections
                                  if (isChecked) {
                                    newDirections = [...new Set([...localDirections, direction])]
                                  } else {
                                    newDirections = localDirections.filter((d) => d !== direction)
                                  }

                                  console.log('[Directions] New directions:', newDirections)

                                  // UPDATE LOCAL STATE IMMEDIATELY FOR INSTANT UI UPDATE
                                  setLocalDirections(newDirections)
                                  console.timeEnd('[Directions] Total time') // This should be < 5ms

                                  // Then send to server in background (backend logs activity)
                                  console.time('[Directions] Server update')
                                  const contactId = deal?.contact?.id || await ensureContact()
                                  await updateContact(contactId, { directions: newDirections }, dealId)
                                  console.timeEnd('[Directions] Server update')

                                  // Invalidate caches after successful update
                                  await queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) })
                                  await queryClient.refetchQueries({ queryKey: dealKeys.detail(dealId) })
                                  await refetchActivities()

                                  console.log('[Directions] Server sync complete')
                                } catch (error) {
                                  console.error('Failed to update directions:', error)
                                  // Revert to server state
                                  setLocalDirections(deal?.contact?.directions || [])
                                  await queryClient.refetchQueries({ queryKey: dealKeys.detail(dealId) })
                                }
                              }}
                              className="h-4 w-4 rounded border border-border/60 cursor-pointer"
                            />
                            <label htmlFor={`direction-${direction}`} className="text-sm cursor-pointer">
                              {getDirectionLabel(direction)}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-1">No options available</p>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Methods - Multi-select with Checkboxes */}
              <div onClick={(e) => e.stopPropagation()} className="flex items-start gap-3 methods-dropdown-container mb-3">
                <label className="text-sm text-foreground flex-shrink-0 w-32 pt-2">
                  {t('contacts.contactMethods') || 'Способ связи'}
                </label>
                <div className="flex-1 relative">
                  <button
                    onClick={() => setOpenMethods(!openMethods)}
                    className="w-full flex items-start justify-between gap-2 px-3 min-h-9 py-2 rounded-md bg-transparent text-sm text-left"
                  >
                    <div className="text-foreground text-left flex-1">
                      {localContactMethods && localContactMethods.length > 0
                        ? localContactMethods.map((m, idx) => (
                            <div key={idx} className="text-sm">
                              {getContactMethodLabel(m)}
                            </div>
                          ))
                        : 'Выберите способ'}
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0 ${openMethods ? 'rotate-180' : ''}`} />
                  </button>

                  {openMethods && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-md p-2 bg-card shadow-md z-50 space-y-1.5">
                      {['Whatsapp', 'Telegram', 'Direct'].map((method) => (
                        <div key={method} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`method-${method}`}
                            checked={localContactMethods.includes(method)}
                            onChange={async (e) => {
                              try {
                                console.time('[ContactMethods] Total time')
                                const isChecked = e.target.checked

                                console.log('[ContactMethods] === START (INSTANT LOCAL UPDATE) ===')

                                // Calculate new methods
                                const newMethods = isChecked
                                  ? [...localContactMethods, method]
                                  : localContactMethods.filter((m) => m !== method)

                                console.log('[ContactMethods] New methods:', newMethods)

                                // UPDATE LOCAL STATE IMMEDIATELY FOR INSTANT UI UPDATE
                                setLocalContactMethods(newMethods)
                                console.timeEnd('[ContactMethods] Total time') // This should be < 5ms

                                // Then send to server in background (backend logs activity)
                                console.time('[ContactMethods] Server update')
                                const contactId = deal?.contact?.id || await ensureContact()
                                await updateContact(contactId, { contactMethods: newMethods }, dealId)
                                console.timeEnd('[ContactMethods] Server update')

                                // Invalidate caches after successful update
                                await queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) })
                                await queryClient.refetchQueries({ queryKey: dealKeys.detail(dealId) })
                                await refetchActivities()

                                console.log('[ContactMethods] Server sync complete')
                              } catch (error) {
                                console.error('Failed to update contact methods:', error)
                                // Revert to server state
                                setLocalContactMethods(deal?.contact?.contactMethods || [])
                                await queryClient.refetchQueries({ queryKey: dealKeys.detail(dealId) })
                              }
                            }}
                            className="h-4 w-4 rounded border border-border/60 cursor-pointer"
                          />
                          <label htmlFor={`method-${method}`} className="text-sm cursor-pointer">
                            {getContactMethodLabel(method)}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Website or TG Channel */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-foreground flex-shrink-0 w-32">
                  {t('contacts.websiteOrTgChannel') || 'Сайт, тг канал'}
                </label>
                <div className="flex-1">
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
                        await updateContact(contactId, { websiteOrTgChannel: value || undefined }, dealId)
                        // Invalidate contact cache instead of refetching entire deal
                        queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) })
                        // Only refetch activities if value changed significantly
                        if (deal?.contact?.websiteOrTgChannel !== value) {
                          await refetchActivities()
                        }
                      } catch (error) {
                        console.error('Failed to update website/TG channel:', error)
                        setContactWebsite(deal?.contact?.websiteOrTgChannel || '')
                      }
                    }, 800)
                  }}
                  placeholder={t('contacts.websiteOrTgChannelPlaceholder') || 'Введите ссылку на сайт или тг канал'}
                  className="h-9 text-sm bg-transparent !border-none !shadow-none"
                />
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-foreground flex-shrink-0 w-32">
                  {t('contacts.contactInfo') || 'Контакт'}
                </label>
                <div className="flex-1">
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
                        await updateContact(contactId, { contactInfo: value || undefined }, dealId)
                        // Invalidate contact cache instead of refetching entire deal
                        queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) })
                        // Only refetch activities if value changed significantly
                        if (deal?.contact?.contactInfo !== value) {
                          await refetchActivities()
                        }
                      } catch (error) {
                        console.error('Failed to update contact info:', error)
                        setContactInfo(deal?.contact?.contactInfo || '')
                      }
                    }, 800)
                  }}
                  placeholder={t('contacts.contactInfoPlaceholder') || 'Номер телефона или никнейм в телеграме'}
                  className="h-9 text-sm bg-transparent !border-none !shadow-none"
                />
                </div>
              </div>
            </div>

          {/* Rejection Reasons - Multi-select with Checkboxes */}
          <div className="pt-4 border-t border-border/50 flex items-start gap-3 reasons-dropdown-container mb-3" onClick={(e) => e.stopPropagation()}>
            <label className="text-sm text-foreground flex-shrink-0 w-32 pt-2">
              {t('deals.rejectionReasons') || 'Причина отказа'}
            </label>
            <div className="flex-1 relative">
              <button
                onClick={() => {
                  console.log('[DEAL DETAIL] Rejection Reasons dropdown clicked, current options:', rejectionReasonsOptions)
                  setOpenReasons(!openReasons)
                }}
                className="w-full flex items-start justify-between gap-2 px-3 min-h-9 py-2 rounded-md bg-transparent text-sm text-left"
              >
                <div className="text-foreground text-left flex-1">
                  {localRejectionReasons && localRejectionReasons.length > 0
                    ? localRejectionReasons.map((r, idx) => (
                        <div key={idx} className="text-sm">
                          {getRejectionReasonLabel(r)}
                        </div>
                      ))
                    : 'Выберите причину'}
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0 ${openReasons ? 'rotate-180' : ''}`} />
              </button>

              {openReasons && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-md p-2 bg-card shadow-md z-50">
                  {rejectionReasonsOptions.length > 10 && (
                    <Input
                      type="text"
                      placeholder="Поиск..."
                      value={searchReasons}
                      onChange={(e) => setSearchReasons(e.target.value)}
                      className="mb-2 h-7 text-xs bg-transparent !border-none !shadow-none"
                    />
                  )}
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {rejectionReasonsOptions.length > 0 ? (
                      rejectionReasonsOptions
                        .filter((reason) =>
                          getRejectionReasonLabel(reason)
                            .toLowerCase()
                            .includes(searchReasons.toLowerCase())
                        )
                        .map((reason) => (
                      <div key={reason} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`reason-${reason}`}
                          checked={localRejectionReasons.includes(reason)}
                          onChange={async (e) => {
                            try {
                              console.time('[RejectionReasons] Total time')
                              const isChecked = e.target.checked

                              console.log('[RejectionReasons] === START (INSTANT LOCAL UPDATE) ===')

                              // Calculate new reasons
                              const newReasons = isChecked
                                ? [...localRejectionReasons, reason]
                                : localRejectionReasons.filter((r) => r !== reason)

                              console.log('[RejectionReasons] New reasons:', newReasons)

                              // UPDATE LOCAL STATE IMMEDIATELY FOR INSTANT UI UPDATE
                              setLocalRejectionReasons(newReasons)
                              console.timeEnd('[RejectionReasons] Total time') // This should be < 5ms

                              // Then send to server in background (backend logs activity)
                              console.time('[RejectionReasons] Server update')
                              await updateDeal({ rejectionReasons: newReasons })
                              console.timeEnd('[RejectionReasons] Server update')

                              // Invalidate after successful update
                              await queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) })
                              await refetchActivities()

                              console.log('[RejectionReasons] Server sync complete')
                            } catch (error) {
                              console.error('Failed to update rejection reasons:', error)
                              // Revert to server state
                              setLocalRejectionReasons(deal?.rejectionReasons || [])
                              await queryClient.refetchQueries({ queryKey: dealKeys.detail(dealId) })
                            }
                          }}
                          className="h-4 w-4 rounded border border-border/60 cursor-pointer"
                        />
                        <label htmlFor={`reason-${reason}`} className="text-sm cursor-pointer">
                          {getRejectionReasonLabel(reason)}
                        </label>
                      </div>
                    ))
                  ) : (
                    <>
                      {['price', 'competitor', 'timing', 'budget', 'requirements', 'other'].map((reason) => (
                        <div key={reason} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`reason-${reason}`}
                            checked={deal.rejectionReasons?.includes(reason) || false}
                            onChange={async (e) => {
                              try {
                                console.time('[RejectionReasons-Fallback] Total time')
                                const isChecked = e.target.checked

                                console.log('[RejectionReasons-Fallback] === START (INSTANT LOCAL UPDATE) ===')

                                // Calculate new reasons
                                const newReasons = isChecked
                                  ? [...localRejectionReasons, reason]
                                  : localRejectionReasons.filter((r) => r !== reason)

                                console.log('[RejectionReasons-Fallback] New reasons:', newReasons)

                                // UPDATE LOCAL STATE IMMEDIATELY FOR INSTANT UI UPDATE
                                setLocalRejectionReasons(newReasons)
                                console.timeEnd('[RejectionReasons-Fallback] Total time') // This should be < 5ms

                                // Then send to server in background (backend logs activity)
                                console.time('[RejectionReasons-Fallback] Server update')
                                await updateDeal({ rejectionReasons: newReasons })
                                console.timeEnd('[RejectionReasons-Fallback] Server update')

                                // Invalidate after successful update
                                await queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) })
                                await refetchActivities()

                                console.log('[RejectionReasons-Fallback] Server sync complete')
                              } catch (error) {
                                console.error('Failed to update rejection reasons:', error)
                                // Revert to server state
                                setLocalRejectionReasons(deal?.rejectionReasons || [])
                                await queryClient.refetchQueries({ queryKey: dealKeys.detail(dealId) })
                              }
                            }}
                            className="h-4 w-4 rounded border border-border/60 cursor-pointer"
                          />
                          <label htmlFor={`reason-${reason}`} className="text-sm cursor-pointer">
                            {getRejectionReasonLabel(reason)}
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                  </div>
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
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0 animate-pulse-subtle" style={{ animationDelay: `${i * 100}ms` }} />
                    <div className="flex-1 space-y-2.5">
                      <Skeleton className="h-4 w-3/4 rounded-sm animate-pulse-subtle" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                      <Skeleton className="h-3 w-1/2 rounded-sm animate-pulse-subtle" style={{ animationDelay: `${i * 100 + 100}ms` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityTimeline
                activities={activities}
                pipelineStages={pipeline?.stages?.map(s => ({ id: s.id, name: s.name }))}
                onUnpinNote={handleUnpinNote}
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

