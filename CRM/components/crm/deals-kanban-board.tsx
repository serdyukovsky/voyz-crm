"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  GripVertical, 
  MoreVertical,
  Link as LinkIcon,
  Users,
  Hash, 
  CheckCircle2, 
  XCircle, 
  UserPlus,
  ExternalLink,
  Filter,
  ArrowUpDown,
  X,
  Calendar,
  Building2,
  User,
  Plus
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getDeals, updateDeal, type Deal } from "@/lib/api/deals"
import { getPipelines, createStage, type Pipeline, type Stage, type CreateStageDto } from "@/lib/api/pipelines"
import { getCompanies, type Company } from "@/lib/api/companies"
import { getContacts, type Contact } from "@/lib/api/contacts"
import { CompanyBadge } from "@/components/shared/company-badge"
import { DealDetail } from './deal-detail'
import { useToastNotification } from "@/hooks/use-toast-notification"
import { cn } from "@/lib/utils"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { io, Socket } from 'socket.io-client'
import { getWsUrl } from '@/lib/config'
import { CreateDealModal } from './create-deal-modal'
import { AddStageModal } from './add-stage-modal'

interface DealCardData {
  id: string
  title: string
  amount: number
  contact?: {
    id: string
    fullName: string
    link?: string
    subscriberCount?: string
    directions?: string[]
  }
  company?: {
    id: string
    name: string
    industry?: string
  }
  assignedTo?: {
    id: string
    name: string
    avatar?: string
  }
  updatedAt: string
  stageId: string
  status?: string
}

interface DealsKanbanBoardProps {
  pipelineId?: string
  onDealClick?: (dealId: string | null) => void
  selectedDealId?: string | null
  showFilters?: boolean
  filters?: FilterState
  sort?: SortState
  onFiltersChange?: (filters: FilterState) => void
  onSortChange?: (sort: SortState) => void
  onAddDeal?: (stageId: string) => void
}

interface FilterState {
  companyId?: string
  contactId?: string
  assignedUserId?: string
  amountMin?: number
  amountMax?: number
  updatedAfter?: string
  updatedBefore?: string
}

type SortField = 'amount' | 'updatedAt'
type SortDirection = 'asc' | 'desc'

interface SortState {
  field: SortField
  direction: SortDirection
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface DealCardProps {
  deal: DealCardData
  stage: Stage
  onDragStart: (deal: DealCardData) => void
  onDragEnd: () => void
  onMarkAsWon: (dealId: string) => void
  onMarkAsLost: (dealId: string) => void
  onReassignContact: (dealId: string) => void
  onOpenInSidebar: (dealId: string) => void
  availableContacts: Contact[]
}

function DealCard({ 
  deal, 
  stage, 
  onDragStart, 
  onDragEnd,
  onMarkAsWon,
  onMarkAsLost,
  onReassignContact,
  onOpenInSidebar,
  availableContacts
}: DealCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    onDragStart(deal)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', deal.id)
    e.dataTransfer.setData('application/json', JSON.stringify({ dealId: deal.id, stageId: deal.stageId }))
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    onDragEnd()
  }

  const handleCardClick = (e: React.MouseEvent) => {
    console.log('handleCardClick called', { 
      isDragging, 
      target: (e.target as HTMLElement).tagName,
      closestNoNavigate: !!(e.target as HTMLElement).closest('[data-no-navigate]'),
      dealId: deal.id
    })
    
    // Don't navigate if clicking on dropdown, badges, or during drag
    if (isDragging) {
      console.log('Navigation prevented: isDragging')
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    const noNavigateElement = (e.target as HTMLElement).closest('[data-no-navigate]')
    if (noNavigateElement) {
      console.log('Navigation prevented: clicked on no-navigate element', noNavigateElement)
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    // Open deal in modal instead of navigating
    console.log('Opening deal in modal:', deal.id)
    e.preventDefault()
    e.stopPropagation()
    onOpenInSidebar(deal.id)
  }

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className={cn(
        "mb-2 cursor-pointer hover:shadow-md transition-all group",
        isDragging && "opacity-50"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div 
            className="font-medium text-sm line-clamp-2 flex-1 hover:text-primary transition-colors cursor-pointer"
            onClick={handleCardClick}
          >
            {deal.title}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild data-no-navigate>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onOpenInSidebar(deal.id)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('dealCard.openInSidebar')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReassignContact(deal.id)}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('dealCard.reassignContact')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onMarkAsWon(deal.id)}
                className="text-green-600 dark:text-green-400"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('dealCard.markAsWon')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onMarkAsLost(deal.id)}
                className="text-red-600 dark:text-red-400"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t('dealCard.markAsLost')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {deal.company && (
          <div className="mb-2" data-no-navigate>
            <CompanyBadge 
              company={{
                id: deal.company.id,
                name: deal.company.name,
                industry: deal.company.industry,
              }}
              className="text-xs"
            />
          </div>
        )}

        {deal.contact && (
          <div className="mb-2" data-no-navigate>
            <Link
              to={`/contacts/${deal.contact.id}`}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-accent/50 transition-colors text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{deal.contact.fullName}</span>
            </Link>
          </div>
        )}

        {/* Link */}
        {deal.contact?.link && (
          <div className="mb-2" data-no-navigate>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LinkIcon className="h-3 w-3" />
              <span className="truncate">{deal.contact.link}</span>
            </div>
          </div>
        )}

        {/* Subscriber Count */}
        {deal.contact?.subscriberCount && (
          <div className="mb-2" data-no-navigate>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{deal.contact.subscriberCount}</span>
            </div>
          </div>
        )}

        {/* Directions */}
        {deal.contact?.directions && deal.contact.directions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1" data-no-navigate>
            {deal.contact.directions.map((direction, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/50 text-xs text-muted-foreground"
              >
                <Hash className="h-3 w-3" />
                {direction}
              </span>
            ))}
          </div>
        )}

        {/* Updated Date */}
        <div className="mb-2">
          <div className="text-xs text-muted-foreground">
            {formatRelativeTime(deal.updatedAt)}
          </div>
        </div>

        {/* Responsible */}
        {deal.assignedTo && (
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs">
                {deal.assignedTo.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {deal.assignedTo.name}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface KanbanColumnProps {
  stage: Stage
  deals: DealCardData[]
  isDraggedOver: boolean
  onDrop: (stageId: string) => void
  onDragStart: (deal: DealCardData) => void
  onDragEnd: () => void
  onMarkAsWon: (dealId: string) => void
  onMarkAsLost: (dealId: string) => void
  onReassignContact: (dealId: string) => void
  onOpenInSidebar: (dealId: string) => void
  onAddDeal?: (stageId: string) => void
  onAddStage?: (afterStageId: string) => void
  availableContacts: Contact[]
  pipelineId: string
}

// Helper function to check if stage is "Won" or "Lost"
function isWonOrLostStage(stageName: string): boolean {
  const name = stageName.toLowerCase().trim()
  return name === 'выиграно' || name === 'проиграно' || 
         name === 'won' || name === 'lost' ||
         name === 'closed-won' || name === 'closed-lost' ||
         name === 'closed won' || name === 'closed lost'
}

function KanbanColumn({ 
  stage, 
  deals, 
  isDraggedOver, 
  onDrop, 
  onDragStart, 
  onDragEnd,
  onMarkAsWon,
  onMarkAsLost,
  onReassignContact,
  onOpenInSidebar,
  onAddDeal,
  onAddStage,
  availableContacts,
  pipelineId
}: KanbanColumnProps) {
  const { t } = useTranslation()
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dealId = e.dataTransfer.getData('text/plain')
    if (dealId) {
      onDrop(stage.id)
    }
  }

  const handleAddDeal = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    console.log('handleAddDeal called for stage:', stage.id, 'onAddDeal:', !!onAddDeal, 'onAddDeal type:', typeof onAddDeal)
    if (!onAddDeal) {
      console.error('onAddDeal callback is not provided! This should not happen.')
      return
    }
    console.log('Calling onAddDeal with stage.id:', stage.id)
    try {
      onAddDeal(stage.id)
      console.log('onAddDeal called successfully')
    } catch (error) {
      console.error('Error calling onAddDeal:', error)
    }
  }

  // Calculate deals count and total amount for this stage
  const stageDealsCount = deals.length
  const stageTotalAmount = deals.reduce((sum, deal) => sum + deal.amount, 0)

  return (
    <div className="flex-shrink-0 w-72">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <CardTitle className="text-sm font-semibold flex-1">{stage.name}</CardTitle>
        <Badge variant="secondary" className="text-xs">
          {deals.length}
        </Badge>
        {onAddStage && !isWonOrLostStage(stage.name) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-muted transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddStage(stage.id)
            }}
            title="Добавить стадию после этой"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Card
        className={cn(
          "flex flex-col",
          isDraggedOver && "border-primary border-2"
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="p-3">
          {!stage.isClosed && (
            <button
              className="w-full flex items-center gap-2 mb-3 text-sm text-muted-foreground hover:text-foreground transition-colors font-normal cursor-pointer"
              onClick={(e) => {
                console.log('Button clicked! Stage:', stage.id, 'onAddDeal exists:', !!onAddDeal)
                handleAddDeal(e)
              }}
              type="button"
              data-testid="add-deal-button"
            >
              <Plus className="h-4 w-4" />
              {t('deals.addDeal') || 'Добавить сделку'}
            </button>
          )}
          {deals.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {t('dealCard.noDeals')}
            </div>
          ) : (
            deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                stage={stage}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onMarkAsWon={onMarkAsWon}
                onMarkAsLost={onMarkAsLost}
                onReassignContact={onReassignContact}
                onOpenInSidebar={onOpenInSidebar}
                availableContacts={availableContacts}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function DealsKanbanBoard({ 
  pipelineId, 
  onDealClick,
  selectedDealId: externalSelectedDealId,
  showFilters: externalShowFilters,
  filters: externalFilters,
  sort: externalSort,
  onFiltersChange: externalOnFiltersChange,
  onSortChange: externalOnSortChange,
  onAddDeal
}: DealsKanbanBoardProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [deals, setDeals] = useState<DealCardData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedDeal, setDraggedDeal] = useState<DealCardData | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false)
  const [afterStageId, setAfterStageId] = useState<string | null>(null)
  const [internalSelectedDealId, setInternalSelectedDealId] = useState<string | null>(null)
  const selectedDealId = externalSelectedDealId !== undefined ? externalSelectedDealId : internalSelectedDealId
  const scrollPositionRef = useRef<number>(0)

  // Sync with external selectedDealId
  useEffect(() => {
    if (externalSelectedDealId !== undefined) {
      setInternalSelectedDealId(externalSelectedDealId)
    }
  }, [externalSelectedDealId])
  
  // Debug: отслеживаем изменения состояния модального окна
  useEffect(() => {
    console.log('Modal state changed:', { isCreateModalOpen, selectedStageId, hasPipeline: !!selectedPipeline })
  }, [isCreateModalOpen, selectedStageId, selectedPipeline])
  
  // Синхронизация: если selectedStageId установлен, но модальное окно закрыто - открываем его
  useEffect(() => {
    if (selectedStageId && !isCreateModalOpen && selectedPipeline) {
      console.log('Auto-opening modal because selectedStageId is set but modal is closed')
      setIsCreateModalOpen(true)
    }
  }, [selectedStageId, isCreateModalOpen, selectedPipeline])
  
  // Use external state if provided, otherwise use internal state
  const [internalFilters, setInternalFilters] = useState<FilterState>({})
  const [internalSort, setInternalSort] = useState<SortState>({ field: 'updatedAt', direction: 'desc' })
  const [internalShowFilters, setInternalShowFilters] = useState(false)
  
  const filters = externalFilters ?? internalFilters
  const sort = externalSort ?? internalSort
  const showFilters = externalShowFilters ?? internalShowFilters
  const setFilters = externalOnFiltersChange ?? setInternalFilters
  const setSort = externalOnSortChange ?? setInternalSort
  const setShowFilters = externalShowFilters !== undefined ? () => {} : setInternalShowFilters
  
  // Internal handler for opening create deal modal
  const handleOpenCreateModal = (stageId: string) => {
    console.log('handleOpenCreateModal called with stageId:', stageId)
    console.log('Current state - selectedStageId:', selectedStageId, 'isCreateModalOpen:', isCreateModalOpen)
    setSelectedStageId(stageId)
    setIsCreateModalOpen(true)
    console.log('State updated - selectedStageId set to:', stageId, 'isCreateModalOpen set to: true')
  }
  
  // Always use internal handler to open modal
  // External onAddDeal is not used here - we always open the modal internally
  const handleAddDealClick = (stageId: string) => {
    console.log('handleAddDealClick called with stageId:', stageId)
    console.log('Opening create deal modal for stage:', stageId)
    handleOpenCreateModal(stageId)
  }
  
  const socketRef = useRef<Socket | null>(null)

  const loadPipelines = async () => {
    try {
      console.log('Loading pipelines...')
      const data = await getPipelines()
      console.log('Loaded pipelines:', data.length, 'pipelines')
      setPipelines(data)
      
      if (data.length === 0) {
        console.warn('No pipelines found')
        setLoading(false) // Ensure loading is false if no pipelines
        return
      }
      
      const defaultPipeline = data.find(p => p.isDefault) || data[0]
      if (defaultPipeline) {
        console.log('Setting default pipeline:', defaultPipeline.id, defaultPipeline.name)
        setSelectedPipeline(defaultPipeline)
      }
      
      if (pipelineId) {
        const pipeline = data.find(p => p.id === pipelineId)
        if (pipeline) {
          console.log('Setting pipeline from URL:', pipeline.id, pipeline.name)
          setSelectedPipeline(pipeline)
        }
      }
    } catch (error) {
      // Handle unauthorized error - redirect to login
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        console.warn('Unauthorized - redirecting to login')
        // Token already cleared in API function
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return
      }
      // Only show error if it's not a network/empty response issue
      if (error instanceof Error && !error.message.includes('Network error') && !error.message.includes('Unauthorized')) {
        showError('Failed to load pipelines', error.message)
      } else {
        console.warn('Pipelines not available:', error instanceof Error ? error.message : 'Unknown error')
      }
      setLoading(false) // Ensure loading is false on error
    }
  }

  const loadCompanies = async () => {
    try {
      console.log('Loading companies...')
      const data = await getCompanies()
      console.log('Loaded companies:', data.length)
      setCompanies(data)
    } catch (error) {
      console.error('Failed to load companies:', error)
      setCompanies([]) // Set empty array on error
      // Don't show error toast for companies/contacts as they're optional for filters
    }
  }

  const loadContacts = async () => {
    try {
      console.log('Loading contacts...')
      const data = await getContacts()
      console.log('Loaded contacts:', data.length)
      setContacts(data)
    } catch (error) {
      console.error('Failed to load contacts:', error)
      setContacts([]) // Set empty array on error
    }
  }

  const loadDeals = useCallback(async () => {
    if (!selectedPipeline) {
      console.log('No pipeline selected, skipping deals load')
      setDeals([])
      setLoading(false) // Ensure loading is false even if no pipeline
      return
    }

    try {
      setLoading(true)
      console.log('Loading deals for pipeline:', selectedPipeline.id)
      const dealsData = await getDeals({ 
        pipelineId: selectedPipeline.id,
        companyId: filters.companyId,
        contactId: filters.contactId,
        assignedToId: filters.assignedUserId,
      })
      
      console.log('Loaded deals count:', Array.isArray(dealsData) ? dealsData.length : 'Not an array!')
      if (Array.isArray(dealsData) && dealsData.length > 0) {
        console.log('First deal sample:', {
          id: dealsData[0].id,
          title: dealsData[0].title,
          amount: dealsData[0].amount,
        })
      }
      
      // Always ensure we have an array - even if empty
      const safeDealsData = Array.isArray(dealsData) ? dealsData : []
      
      const transformedDeals: DealCardData[] = safeDealsData.map((deal, index) => {
        console.log(`Processing deal ${index}:`, deal.id, deal.title, deal.stage?.id)
        return {
          id: deal.id,
          title: deal.title || 'Untitled Deal',
          amount: deal.amount || 0,
          contact: deal.contact ? {
            id: deal.contact.id,
            fullName: deal.contact.fullName || 'Unknown Contact',
            link: deal.contact.link,
            subscriberCount: deal.contact.subscriberCount,
            directions: deal.contact.directions,
          } : undefined,
          company: deal.company ? {
            id: deal.company.id,
            name: deal.company.name || 'Unknown Company',
            industry: deal.company.industry,
          } : undefined,
          assignedTo: deal.assignedTo ? {
            id: deal.assignedTo.id,
            name: deal.assignedTo.name || 'Unknown User',
            avatar: deal.assignedTo.avatar,
          } : undefined,
          updatedAt: deal.updatedAt || new Date().toISOString(),
          stageId: deal.stage?.id || '',
          status: deal.status,
        }
      })
      
      console.log('Transformed deals:', transformedDeals.length)
      setDeals(transformedDeals)
    } catch (error) {
      // Only show error if it's not a network/empty response issue
      if (error instanceof Error && !error.message.includes('Network error') && !error.message.includes('Unauthorized')) {
        showError('Failed to load deals', error.message)
      } else {
        console.warn('Deals not available:', error instanceof Error ? error.message : 'Unknown error')
      }
      // Always set empty array on error to show empty state instead of loading
      setDeals([])
    } finally {
      setLoading(false) // Always set loading to false
    }
  }, [selectedPipeline, filters.companyId, filters.contactId, filters.assignedUserId, showError])

  useEffect(() => {
    loadPipelines()
    loadCompanies()
    loadContacts()
  }, [])

  // Reload pipelines when pipelineId prop changes (e.g., after creating a new pipeline)
  useEffect(() => {
    if (pipelineId) {
      console.log('PipelineId prop changed, reloading pipelines:', pipelineId)
      loadPipelines()
    }
  }, [pipelineId])

  // Handle pipelineId prop changes - reload pipelines if pipeline not found
  useEffect(() => {
    if (!pipelineId) return

    // If pipelines list is empty or doesn't contain the requested pipeline, reload
    if (pipelines.length === 0 || !pipelines.find(p => p.id === pipelineId)) {
      console.log('DealsKanbanBoard: Pipeline not in list, reloading pipelines for:', pipelineId)
      loadPipelines()
      return
    }

    // Find and set the pipeline
    const pipeline = pipelines.find(p => p.id === pipelineId)
    if (pipeline) {
      if (pipeline.id !== selectedPipeline?.id) {
        console.log('DealsKanbanBoard: Setting pipeline from prop:', pipeline.id, pipeline.name, 'stages:', pipeline.stages?.length || 0)
        console.log('DealsKanbanBoard: Pipeline stages:', pipeline.stages)
        // Log pipeline without circular references
        try {
          const pipelineLog = {
            id: pipeline.id,
            name: pipeline.name,
            description: pipeline.description,
            isDefault: pipeline.isDefault,
            isActive: pipeline.isActive,
            stages: pipeline.stages?.map(s => ({
              id: s.id,
              name: s.name,
              order: s.order,
              color: s.color,
            })) || [],
          }
          console.log('DealsKanbanBoard: Full pipeline object:', JSON.stringify(pipelineLog, null, 2))
        } catch (e) {
          console.log('DealsKanbanBoard: Pipeline (could not stringify):', pipeline.id, pipeline.name)
        }
        setSelectedPipeline(pipeline)
      }
    } else {
      console.warn('DealsKanbanBoard: Pipeline not found in list after reload:', pipelineId)
    }
  }, [pipelineId, pipelines, selectedPipeline?.id])

  // Track selectedPipeline changes
  useEffect(() => {
    console.log('selectedPipeline changed:', selectedPipeline?.id, selectedPipeline?.name)
  }, [selectedPipeline])

  useEffect(() => {
    console.log('useEffect triggered - selectedPipeline:', selectedPipeline?.id, 'filters:', filters)
    if (selectedPipeline) {
      console.log('Calling loadDeals for pipeline:', selectedPipeline.id)
      loadDeals()
    } else {
      console.log('No pipeline selected, not loading deals')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPipeline?.id, filters.companyId, filters.contactId, filters.assignedUserId])

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedPipeline) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    const wsUrl = getWsUrl()
    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('WebSocket connected for Kanban board')
    })

    socket.on('deal.stage.updated', (data: { dealId: string; stageId?: string; [key: string]: any }) => {
      if (data.dealId) {
        setDeals(prevDeals => {
          const dealIndex = prevDeals.findIndex(d => d.id === data.dealId)
          if (dealIndex >= 0 && data.stageId) {
            const updated = [...prevDeals]
            updated[dealIndex] = {
              ...updated[dealIndex],
              stageId: data.stageId,
              updatedAt: new Date().toISOString(),
            }
            return updated
          }
          // If deal not found, reload all deals
          loadDeals()
          return prevDeals
        })
      }
    })

    socket.on('deal.updated', (data: { dealId: string; [key: string]: any }) => {
      if (data.dealId) {
        setDeals(prevDeals => {
          const dealIndex = prevDeals.findIndex(d => d.id === data.dealId)
          if (dealIndex >= 0) {
            const updated = [...prevDeals]
            updated[dealIndex] = {
              ...updated[dealIndex],
              ...data,
              updatedAt: new Date().toISOString(),
            }
            return updated
          }
          loadDeals()
          return prevDeals
        })
      }
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [selectedPipeline, loadDeals])

  // Filter and sort deals
  const filteredAndSortedDeals = useMemo(() => {
    let filtered = [...deals]

    // Apply amount range filter
    if (filters.amountMin !== undefined) {
      filtered = filtered.filter(d => d.amount >= filters.amountMin!)
    }
    if (filters.amountMax !== undefined) {
      filtered = filtered.filter(d => d.amount <= filters.amountMax!)
    }

    // Apply date range filter
    if (filters.updatedAfter) {
      const afterDate = new Date(filters.updatedAfter)
      filtered = filtered.filter(d => new Date(d.updatedAt) >= afterDate)
    }
    if (filters.updatedBefore) {
      const beforeDate = new Date(filters.updatedBefore)
      filtered = filtered.filter(d => new Date(d.updatedAt) <= beforeDate)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      if (sort.field === 'amount') {
        comparison = a.amount - b.amount
      } else if (sort.field === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      }
      return sort.direction === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [deals, filters, sort])

  const handleDragStart = (deal: DealCardData) => {
    setDraggedDeal(deal)
  }

  const handleDragEnd = () => {
    setDraggedDeal(null)
  }

  const handleDrop = async (stageId: string) => {
    if (!draggedDeal || draggedDeal.stageId === stageId) {
      setDraggedDeal(null)
      return
    }

    try {
      await updateDeal(draggedDeal.id, { stageId })
      showSuccess(t('deals.dealMovedSuccess'))
      
      setDeals(prevDeals => prevDeals.map(deal =>
        deal.id === draggedDeal.id
          ? { ...deal, stageId, updatedAt: new Date().toISOString() }
          : deal
      ))
    } catch (error) {
      showError(t('deals.failedToMoveDeal'), error instanceof Error ? error.message : t('messages.pleaseTryAgain'))
      loadDeals()
    } finally {
      setDraggedDeal(null)
    }
  }

  const handleMarkAsWon = async (dealId: string) => {
    try {
      // Find closed-won stage
      const closedWonStage = selectedPipeline?.stages.find(s => s.isClosed && s.name.toLowerCase().includes('won'))
      if (closedWonStage) {
        await updateDeal(dealId, { stageId: closedWonStage.id, status: 'closed' })
        showSuccess(t('deals.dealMarkedAsWon'))
        loadDeals()
      } else {
        showError(t('deals.closedWonStageNotFound'), t('deals.configurePipeline'))
      }
    } catch (error) {
      showError(t('deals.failedToMarkAsWon'), error instanceof Error ? error.message : t('messages.pleaseTryAgain'))
    }
  }

  const handleMarkAsLost = async (dealId: string) => {
    try {
      // Find closed-lost stage
      const closedLostStage = selectedPipeline?.stages.find(s => s.isClosed && s.name.toLowerCase().includes('lost'))
      if (closedLostStage) {
        await updateDeal(dealId, { stageId: closedLostStage.id, status: 'closed' })
        showSuccess(t('deals.dealMarkedAsLost'))
        loadDeals()
      } else {
        showError(t('deals.closedLostStageNotFound'), t('deals.configurePipeline'))
      }
    } catch (error) {
      showError(t('deals.failedToMarkAsLost'), error instanceof Error ? error.message : t('messages.pleaseTryAgain'))
    }
  }

  const handleReassignContact = async (dealId: string) => {
    // TODO: Implement contact reassignment modal
    showError('Not implemented', 'Contact reassignment will be available soon')
  }

  const handleOpenInSidebar = useCallback((dealId: string) => {
    console.log('DealsKanbanBoard: handleOpenInSidebar called with dealId:', dealId)
    console.log('DealsKanbanBoard: onDealClick prop:', onDealClick)
    // Save current scroll position before opening modal
    const kanbanContainer = document.querySelector('[data-kanban-container]') as HTMLElement
    if (kanbanContainer) {
      scrollPositionRef.current = kanbanContainer.scrollLeft
      console.log('Saved scroll position:', scrollPositionRef.current)
    }
    setInternalSelectedDealId(dealId)
    console.log('DealsKanbanBoard: Calling onDealClick with dealId:', dealId, 'onDealClick exists:', !!onDealClick, 'type:', typeof onDealClick)
    
    // Update URL directly if onDealClick is not provided
    if (onDealClick) {
      onDealClick(dealId)
    } else {
      console.warn('DealsKanbanBoard: onDealClick is not provided, updating URL directly')
      // Update URL directly
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        params.set('deal', dealId)
        const newUrl = `${window.location.pathname}?${params.toString()}`
        console.log('DealsKanbanBoard: Updating URL directly to:', newUrl)
        window.history.pushState({}, '', newUrl)
        console.log('DealsKanbanBoard: URL after pushState:', window.location.href)
      }
    }
  }, [onDealClick])

  const handleCloseDealModal = useCallback(() => {
    console.log('DealsKanbanBoard: handleCloseDealModal called')
    setInternalSelectedDealId(null)
    
    // Call onDealClick to update URL - this should handle URL update
    if (onDealClick) {
      console.log('DealsKanbanBoard: Calling onDealClick(null) to update URL')
      onDealClick(null)
    } else {
      // Fallback: update URL directly if onDealClick is not provided
      console.warn('DealsKanbanBoard: onDealClick not provided, updating URL directly')
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        params.delete('deal')
        const queryString = params.toString()
        const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`
        console.log('DealsKanbanBoard: Removing deal from URL:', newUrl)
        window.history.pushState({}, '', newUrl)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
    
    // Restore scroll position after modal closes
    requestAnimationFrame(() => {
      setTimeout(() => {
        const kanbanContainer = document.querySelector('[data-kanban-container]') as HTMLElement
        if (kanbanContainer) {
          kanbanContainer.scrollLeft = scrollPositionRef.current
          console.log('Restored scroll position:', scrollPositionRef.current)
        }
      }, 50)
    })
  }, [onDealClick])

  const handleAddStage = (afterStageId: string) => {
    console.log('handleAddStage called for afterStageId:', afterStageId)
    setAfterStageId(afterStageId)
    setIsAddStageModalOpen(true)
  }

  const handleSaveNewStage = async (name: string, color: string) => {
    if (!selectedPipeline || !afterStageId) return

    try {
      // Find the stage after which the new stage should be inserted
      const stages = selectedPipeline.stages.sort((a, b) => a.order - b.order)
      const afterStageIndex = stages.findIndex(s => s.id === afterStageId)
      
      if (afterStageIndex === -1) {
        showError('Stage not found', 'The selected stage was not found')
        return
      }

      const afterStage = stages[afterStageIndex]
      const newOrder = afterStage.order + 1

      // Find all stages that need to be shifted (order >= newOrder)
      const stagesToUpdate = stages.filter(s => s.order >= newOrder).sort((a, b) => b.order - a.order)

      console.log('Creating new stage with data:', { 
        name, 
        color, 
        order: newOrder, 
        pipelineId: selectedPipeline.id,
        afterStageId,
        afterStageOrder: afterStage.order,
        stagesToUpdate: stagesToUpdate.map(s => ({ id: s.id, name: s.name, order: s.order }))
      })

      // Update stages in reverse order (from highest to lowest) to avoid conflicts
      const { updateStage } = await import('@/lib/api/pipelines')
      for (const stage of stagesToUpdate) {
        try {
          await updateStage(stage.id, { order: stage.order + 1 })
          console.log(`Updated stage ${stage.name} order from ${stage.order} to ${stage.order + 1}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Failed to update stage ${stage.id}:`, errorMessage)
          
          // If unauthorized, stop and redirect to login
          if (errorMessage === 'UNAUTHORIZED') {
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
            return
          }
          
          // For other errors, continue with other stages
        }
      }

      // Now create the new stage with the desired order
      await createStage(selectedPipeline.id, { name, color, order: newOrder })
      showSuccess('Stage created successfully')
      setIsAddStageModalOpen(false)
      setAfterStageId(null)
      await loadPipelines() // Reload pipelines to get updated stages
    } catch (error) {
      console.error('Failed to create stage:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // If unauthorized, redirect to login
      if (errorMessage === 'UNAUTHORIZED') {
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return
      }
      
      showError('Failed to create stage', errorMessage)
    }
  }

  const clearFilters = () => {
    setFilters({})
  }

  const hasActiveFilters = Object.keys(filters).length > 0

  // Get unique assigned users from deals - MUST be called before any conditional returns
  const assignedUsers = useMemo(() => {
    const users = new Map<string, { id: string; name: string }>()
    deals.forEach(deal => {
      if (deal.assignedTo) {
        users.set(deal.assignedTo.id, deal.assignedTo)
      }
    })
    return Array.from(users.values())
  }, [deals])

  if (loading && deals.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 animate-in fade-in-50 duration-300">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-72">
            <Skeleton className="h-7 w-40 mb-4 rounded-lg" />
            <div className="space-y-3 p-3 bg-card rounded-lg border shadow-sm min-h-[calc(100vh-300px)]">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-24 w-full rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Check if user is authenticated
  const isAuthenticated = typeof window !== 'undefined' && !!localStorage.getItem('access_token')

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Please log in to view deals</p>
        <Button onClick={() => window.location.href = '/login'}>
          Go to Login
        </Button>
      </div>
    )
  }

  if (!selectedPipeline) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No pipeline selected</p>
        <p className="text-sm text-muted-foreground">Please create a pipeline in settings</p>
      </div>
    )
  }

  // Ensure stages array exists and is sorted
  const stages = (selectedPipeline.stages || []).sort((a, b) => a.order - b.order)

  // Show message if no stages
  if (stages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No stages in this pipeline</p>
        <p className="text-sm text-muted-foreground mb-4">
          {t('deals.addStagesToPipeline')}
        </p>
        <Button 
          variant="outline" 
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/settings/pipelines'
            }
          }}
        >
          Go to Pipeline Settings
        </Button>
      </div>
    )
  }

  // Handle deal creation from modal
  const handleCreateDeal = async (dealData: {
    title: string
    amount: number
    stageId: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    companyName?: string
    companyAddress?: string
  }) => {
    if (!selectedPipeline) {
      showError('No pipeline selected', 'Please select a pipeline first')
      return
    }

    try {
      let contactId: string | undefined
      let companyId: string | undefined

      // Create contact if provided
      if (dealData.contactName || dealData.contactPhone || dealData.contactEmail) {
        const { createContact } = await import('@/lib/api/contacts')
        try {
          const contact = await createContact({
            fullName: dealData.contactName || '',
            phone: dealData.contactPhone,
            email: dealData.contactEmail,
            companyId: companyId,
          })
          contactId = contact.id
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error('Failed to create contact:', errorMsg)
          // Continue without contact
        }
      }

      // Create company if provided
      if (dealData.companyName) {
        const { createCompany } = await import('@/lib/api/companies')
        try {
          const company = await createCompany({
            name: dealData.companyName,
            address: dealData.companyAddress,
          })
          companyId = company.id
          
          // Update contact with company if contact was created
          if (contactId && !dealData.contactName) {
            const { updateContact } = await import('@/lib/api/contacts')
            try {
              await updateContact(contactId, { companyId })
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error)
              console.error('Failed to update contact with company:', errorMsg)
            }
          }
        } catch (error) {
          console.error('Failed to create company:', error)
          // Continue without company
        }
      }

      // Create deal
      const { createDeal } = await import('@/lib/api/deals')
      console.log('Creating deal with data:', {
        title: dealData.title,
        amount: dealData.amount,
        pipelineId: selectedPipeline?.id,
        stageId: dealData.stageId,
        contactId: contactId || undefined,
        companyId: companyId || undefined,
      })
      
      const newDeal = await createDeal({
        title: dealData.title,
        amount: dealData.amount,
        pipelineId: selectedPipeline.id,
        stageId: dealData.stageId,
        contactId,
        companyId,
      })

      console.log('Deal created successfully:', newDeal?.id, newDeal?.title, newDeal?.amount)
      
      // Save deal to sessionStorage for immediate access in detail page
      if (typeof window !== 'undefined' && newDeal?.id) {
        try {
          // Create a clean object without circular references
          const cleanDeal = {
            id: newDeal.id,
            number: newDeal.number,
            title: newDeal.title,
            amount: newDeal.amount,
            pipelineId: newDeal.pipelineId,
            stageId: newDeal.stageId,
            contactId: newDeal.contactId,
            companyId: newDeal.companyId,
            assignedToId: newDeal.assignedToId,
            createdById: newDeal.createdById,
            description: newDeal.description,
            expectedCloseAt: newDeal.expectedCloseAt,
            tags: newDeal.tags || [],
            createdAt: newDeal.createdAt,
            updatedAt: newDeal.updatedAt,
            stage: newDeal.stage ? {
              id: newDeal.stage.id,
              name: newDeal.stage.name,
              color: newDeal.stage.color,
              order: newDeal.stage.order,
            } : null,
            contact: newDeal.contact ? {
              id: newDeal.contact.id,
              fullName: newDeal.contact.fullName,
              email: newDeal.contact.email,
              phone: newDeal.contact.phone,
            } : null,
            company: newDeal.company ? {
              id: newDeal.company.id,
              name: newDeal.company.name,
            } : null,
          }
          sessionStorage.setItem(`deal-${newDeal.id}`, JSON.stringify(cleanDeal))
          sessionStorage.setItem(`deal-${newDeal.id}-isNew`, 'true')
        } catch (e) {
          console.error('Failed to save deal to sessionStorage:', e)
        }
      }

      showSuccess('Deal created successfully')
      
      // Close modal first
      setIsCreateModalOpen(false)
      setSelectedStageId(null)
      
      // Reload deals to show the new one
      await loadDeals()
    } catch (error) {
      // Log error without circular references
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error('Failed to create deal:', errorMessage)
      if (errorStack) {
        console.error('Error stack:', errorStack)
      }
      showError('Failed to create deal', errorMessage)
    }
  }

  // Calculate deals count and total amount for selected stage
  const selectedStageDeals = selectedStageId 
    ? filteredAndSortedDeals.filter(deal => deal.stageId === selectedStageId)
    : []
  const selectedStageDealsCount = selectedStageDeals.length
  const selectedStageTotalAmount = selectedStageDeals.reduce((sum, deal) => sum + deal.amount, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Kanban Board - Scrollable */}
      <div 
        className="flex-1 min-h-0 overflow-x-auto overflow-y-auto" 
        style={{ width: '100%' }}
        data-kanban-container
      >
        <div className="flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
          {stages.map((stage) => {
          const stageDeals = filteredAndSortedDeals.filter(deal => deal.stageId === stage.id)
          const isDraggedOver = draggedDeal !== null && draggedDeal.stageId !== stage.id

          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              isDraggedOver={isDraggedOver}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onMarkAsWon={handleMarkAsWon}
              onMarkAsLost={handleMarkAsLost}
              onReassignContact={handleReassignContact}
              onOpenInSidebar={handleOpenInSidebar}
              onAddDeal={handleAddDealClick}
              onAddStage={handleAddStage}
              availableContacts={contacts}
              pipelineId={selectedPipeline.id}
            />
          )
          })}
        </div>
      </div>

      {/* Create Deal Modal */}
      {selectedPipeline && selectedStageId && (
        <CreateDealModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            console.log('Closing modal, current state:', { isCreateModalOpen, selectedStageId })
            setIsCreateModalOpen(false)
            setSelectedStageId(null)
          }}
          onSave={handleCreateDeal}
          stageId={selectedStageId}
          pipelineId={selectedPipeline.id}
          dealsCount={selectedStageDealsCount}
          totalAmount={selectedStageTotalAmount}
        />
      )}
      
      {/* Debug info - только в development */}
      {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
        <div style={{ 
          position: 'fixed', 
          bottom: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '8px', 
          fontSize: '12px', 
          zIndex: 9999, 
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <div>Modal: {isCreateModalOpen ? 'OPEN' : 'CLOSED'}</div>
          <div>Stage: {selectedStageId || 'NONE'}</div>
          <div>Pipeline: {selectedPipeline?.id?.slice(0, 8) || 'NONE'}</div>
        </div>
      )}

      {/* Add Stage Modal */}
      {selectedPipeline && afterStageId && (
        <AddStageModal
          isOpen={isAddStageModalOpen}
          onClose={() => {
            setIsAddStageModalOpen(false)
            setAfterStageId(null)
          }}
          onAdd={handleSaveNewStage}
        />
      )}

      {/* Deal Detail Modal */}
      {selectedDealId && (
        <Dialog open={!!selectedDealId} onOpenChange={(open) => {
          if (!open) {
            handleCloseDealModal()
          }
        }}>
          <DialogContent 
            className="!max-w-[calc(100vw-240px)] !w-[calc(100vw-240px)] !h-screen max-h-[100vh] overflow-hidden p-0 m-0 rounded-none border-0 translate-x-0 translate-y-[-50%] top-[50%] left-[240px] animate-in fade-in-0 zoom-in-95 duration-200"
            showCloseButton={false}
          >
            <div className="overflow-y-auto h-full w-full">
              <DealDetail dealId={selectedDealId} onClose={handleCloseDealModal} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
