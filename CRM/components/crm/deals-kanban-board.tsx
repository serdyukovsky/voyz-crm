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
  DollarSign, 
  GripVertical, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  UserPlus,
  ExternalLink,
  Filter,
  ArrowUpDown,
  X,
  Calendar,
  Building2,
  User
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getDeals, updateDeal, type Deal } from "@/lib/api/deals"
import { getPipelines, type Pipeline, type Stage } from "@/lib/api/pipelines"
import { getCompanies, type Company } from "@/lib/api/companies"
import { getContacts, type Contact } from "@/lib/api/contacts"
import { CompanyBadge } from "@/components/shared/company-badge"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { cn } from "@/lib/utils"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { io, Socket } from 'socket.io-client'

interface DealCardData {
  id: string
  title: string
  amount: number
  contact?: {
    id: string
    fullName: string
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
  onDealClick?: (dealId: string) => void
  showFilters?: boolean
  filters?: FilterState
  sort?: SortState
  onFiltersChange?: (filters: FilterState) => void
  onSortChange?: (sort: SortState) => void
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
    // Don't navigate if clicking on dropdown, badges, or during drag
    if (isDragging || (e.target as HTMLElement).closest('[data-no-navigate]')) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    // Navigate to deal detail page
    navigate(`/deals/${deal.id}`)
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
                className="text-green-600"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('dealCard.markAsWon')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onMarkAsLost(deal.id)}
                className="text-red-600"
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

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(deal.amount)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatRelativeTime(deal.updatedAt)}
          </div>
        </div>

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
  availableContacts: Contact[]
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
  availableContacts
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

  return (
    <div className="flex-shrink-0 w-72">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <CardTitle className="text-sm font-semibold">{stage.name}</CardTitle>
        <Badge variant="secondary" className="text-xs">
          {deals.length}
        </Badge>
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
  showFilters: externalShowFilters,
  filters: externalFilters,
  sort: externalSort,
  onFiltersChange: externalOnFiltersChange,
  onSortChange: externalOnSortChange
}: DealsKanbanBoardProps) {
  const { showSuccess, showError } = useToastNotification()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [deals, setDeals] = useState<DealCardData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedDeal, setDraggedDeal] = useState<DealCardData | null>(null)
  
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
  
  const socketRef = useRef<Socket | null>(null)

  const loadPipelines = async () => {
    try {
      console.log('Loading pipelines...')
      const data = await getPipelines()
      console.log('Loaded pipelines:', data.length, data)
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
      
      console.log('Loaded deals data:', dealsData)
      console.log('Loaded deals count:', Array.isArray(dealsData) ? dealsData.length : 'Not an array!')
      
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
  }, [selectedPipeline, filters.companyId, filters.contactId, filters.assignedUserId, loadDeals])

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedPipeline) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001/realtime', {
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
      showSuccess('Deal moved successfully')
      
      setDeals(prevDeals => prevDeals.map(deal =>
        deal.id === draggedDeal.id
          ? { ...deal, stageId, updatedAt: new Date().toISOString() }
          : deal
      ))
    } catch (error) {
      showError('Failed to move deal', error instanceof Error ? error.message : 'Unknown error')
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
        showSuccess('Deal marked as Won')
        loadDeals()
      } else {
        showError('Closed-Won stage not found', 'Please configure your pipeline')
      }
    } catch (error) {
      showError('Failed to mark deal as Won', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleMarkAsLost = async (dealId: string) => {
    try {
      // Find closed-lost stage
      const closedLostStage = selectedPipeline?.stages.find(s => s.isClosed && s.name.toLowerCase().includes('lost'))
      if (closedLostStage) {
        await updateDeal(dealId, { stageId: closedLostStage.id, status: 'closed' })
        showSuccess('Deal marked as Lost')
        loadDeals()
      } else {
        showError('Closed-Lost stage not found', 'Please configure your pipeline')
      }
    } catch (error) {
      showError('Failed to mark deal as Lost', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleReassignContact = async (dealId: string) => {
    // TODO: Implement contact reassignment modal
    showError('Not implemented', 'Contact reassignment will be available soon')
  }

  const handleOpenInSidebar = (dealId: string) => {
    if (onDealClick) {
      onDealClick(dealId)
    } else {
      window.open(`/deals/${dealId}`, '_blank')
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
      <div className="flex gap-3 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-72">
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-[calc(100vh-300px)] w-full" />
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

  const stages = selectedPipeline.stages.sort((a, b) => a.order - b.order)

  // Don't show empty state - always show columns even if empty
  // Empty state is handled within each KanbanColumn component

  return (
    <div className="flex flex-col h-full">
      {/* Kanban Board - Scrollable */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto" style={{ width: '100%' }}>
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
              availableContacts={contacts}
            />
          )
          })}
        </div>
      </div>
    </div>
  )
}
