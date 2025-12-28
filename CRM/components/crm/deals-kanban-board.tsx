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
  Plus,
  Trash2
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getDeals, updateDeal, type Deal } from "@/lib/api/deals"
import { getPipelines, createStage, updateStage, deleteStage, reorderStages, type Pipeline, type Stage, type CreateStageDto } from "@/lib/api/pipelines"
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
import { useSidebar } from './sidebar-context'

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
  title?: string
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
  onDeleteDeal?: (dealId: string) => void
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
  onDeleteDeal,
  availableContacts,
  searchQuery
}: DealCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    onDragStart(deal)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', deal.id)
    e.dataTransfer.setData('application/json', JSON.stringify({ dealId: deal.id, stageId: deal.stageId }))
    e.dataTransfer.setData('drag-type', 'deal') // Add explicit drag type
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

  const isHighlighted = searchQuery && deal.title.toLowerCase().includes(searchQuery.toLowerCase())

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className={cn(
        "mb-2 cursor-pointer transition-all group shadow-none",
        isDragging && "opacity-50",
        isHighlighted && "bg-blue-50/40 dark:bg-blue-950/15 border-blue-200/50 dark:border-blue-800/30"
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
              {onDeleteDeal && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete deal "${deal.title}"?`)) {
                        try {
                          await onDeleteDeal(deal.id)
                          showSuccess('Deal deleted successfully')
                        } catch (error) {
                          showError('Failed to delete deal', error instanceof Error ? error.message : 'Unknown error')
                        }
                      }
                    }}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('deals.delete') || 'Delete Deal'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Responsible */}
        {deal.assignedTo && (
          <div className="mb-2" data-no-navigate>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {deal.assignedTo.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-foreground">
                {deal.assignedTo.name}
              </span>
            </div>
          </div>
        )}

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
  onDeleteDeal?: (dealId: string) => Promise<void>
  onAddDeal?: (stageId: string) => void
  onAddStage?: (afterStageId: string) => void
  onUpdateStage?: (stageId: string, name: string, color?: string) => Promise<void>
  onUpdateStageColor?: (stageId: string, color: string) => Promise<void>
  onDeleteStage?: (stageId: string) => Promise<void>
  onStageDragStart?: (stageId: string) => void
  onStageDragOver?: (e: React.DragEvent, stageId: string) => void
  onStageDragEnd?: () => void
  onStageDropAndSave?: (targetStageId: string) => void
  isStageDragged?: boolean
  availableContacts: Contact[]
  pipelineId: string
  searchQuery?: string
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
  onDeleteDeal,
  onAddDeal,
  onAddStage,
  onUpdateStage,
  onUpdateStageColor,
  onDeleteStage,
  onStageDragStart,
  onStageDragOver,
  onStageDragEnd,
  onStageDropAndSave,
  isStageDragged = false,
  availableContacts,
  pipelineId,
  searchQuery
}: KanbanColumnProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(stage.name)
  const [isSaving, setIsSaving] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const dragStartedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const isDeletingRef = useRef(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // Reset editing state when stage changes
  useEffect(() => {
    setIsEditing(false)
    setEditedName(stage.name)
  }, [stage.id, stage.name])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false)
      }
    }

    if (isColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isColorPickerOpen])

  // Generate color gradients - creates lighter to darker variations
  const generateColorGradients = (baseColor: string, steps: number = 9): string[] => {
    // Convert hex to RGB
    const hex = baseColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    const gradients: string[] = []
    for (let i = 0; i < steps; i++) {
      // Create variations from lighter to darker
      // Factor ranges from 0.3 (darker) to 1.0 (original) to 1.5 (lighter)
      const factor = 0.3 + (i * (1.2 / (steps - 1)))
      
      // For lighter colors, blend with white; for darker, blend with black
      let newR: number, newG: number, newB: number
      if (factor > 1.0) {
        // Lighter: blend with white
        const blendFactor = factor - 1.0
        newR = Math.round(r + (255 - r) * blendFactor)
        newG = Math.round(g + (255 - g) * blendFactor)
        newB = Math.round(b + (255 - b) * blendFactor)
      } else {
        // Darker: multiply
        newR = Math.round(r * factor)
        newG = Math.round(g * factor)
        newB = Math.round(b * factor)
      }
      
      // Clamp values
      newR = Math.min(255, Math.max(0, newR))
      newG = Math.min(255, Math.max(0, newG))
      newB = Math.min(255, Math.max(0, newB))
      
      gradients.push(`#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`)
    }
    return gradients
  }

  // Basic colors (first row)
  const basicColors = [
    '#6B7280', // Gray
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Green
    '#14B8A6', // Teal
    '#EF4444', // Red
    '#F97316', // Orange
  ]

  // Gradient base colors (for generating gradient rows)
  const gradientBaseColors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EC4899', // Pink
  ]

  const handleColorChange = async (color: string) => {
    if (onUpdateStageColor) {
      try {
        await onUpdateStageColor(stage.id, color)
        showSuccess('Stage color updated')
        setIsColorPickerOpen(false)
      } catch (error) {
        console.error('Failed to update stage color:', error)
        showError('Failed to update stage color', error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    // Allow all drags in dragOver - filtering happens in drop handler
    // This ensures deal drags work properly
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Try to get JSON data first (for stage drags)
    let isStageDrag = false
    try {
      const jsonData = e.dataTransfer.getData('application/json')
      if (jsonData) {
        const parsed = JSON.parse(jsonData)
        if (parsed.type === 'stage') {
          isStageDrag = true
        }
      }
    } catch {
      // Not JSON or not a stage drag
    }
    
    // If it's a stage drag, don't handle it here (parent handles it)
    if (isStageDrag) {
      return
    }
    
    // Handle deal drop
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

  const handleDoubleClick = () => {
    if (!isEditing) {
      setIsEditing(true)
      setEditedName(stage.name)
    }
  }

  const handleSave = async () => {
    // Don't save if we're deleting
    if (isDeletingRef.current) {
      return
    }
    
    if (!editedName.trim() || editedName.trim() === stage.name) {
      setIsEditing(false)
      setEditedName(stage.name)
      return
    }

    setIsSaving(true)
    try {
      if (onUpdateStage) {
        await onUpdateStage(stage.id, editedName.trim())
        showSuccess('Stage name updated')
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update stage:', error)
      showError('Failed to update stage', error instanceof Error ? error.message : 'Unknown error')
      setEditedName(stage.name) // Revert on error
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if the blur is because we clicked on the delete button
    const relatedTarget = e.relatedTarget as HTMLElement
    if (relatedTarget && deleteButtonRef.current && deleteButtonRef.current.contains(relatedTarget)) {
      // User clicked on delete button, don't save
      return
    }
    // Small delay to allow click events to process first
    setTimeout(() => {
      if (!isDeletingRef.current) {
        handleSave()
      }
    }, 200)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedName(stage.name)
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    console.log('🗑️ handleDelete called', { 
      stageId: stage.id, 
      stageName: stage.name,
      hasOnDeleteStage: !!onDeleteStage,
      dealsCount: deals.length,
      isEditing
    })
    
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Set flag to prevent save on blur
    isDeletingRef.current = true
    
    if (!onDeleteStage) {
      console.error('🗑️ handleDelete: onDeleteStage is not provided!')
      isDeletingRef.current = false
      return
    }
    
    if (deals.length > 0) {
      showError('Cannot delete stage', `This stage contains ${deals.length} deal(s). Move deals to another stage first.`)
      isDeletingRef.current = false
      return
    }

    if (!confirm(`Are you sure you want to delete stage "${stage.name}"?`)) {
      isDeletingRef.current = false
      return
    }

    try {
      console.log('🗑️ handleDelete: Calling onDeleteStage with stageId:', stage.id)
      await onDeleteStage(stage.id)
      console.log('🗑️ handleDelete: Stage deleted successfully')
      showSuccess('Stage deleted')
      // Don't reset flag here - component will be unmounted
    } catch (error) {
      console.error('🗑️ handleDelete: Failed to delete stage:', error)
      isDeletingRef.current = false
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('deal(s)')) {
        showError('Cannot delete stage', errorMessage)
      } else {
        showError('Failed to delete stage', errorMessage)
      }
    }
  }

  const handleStageDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', stage.id)
    e.dataTransfer.setData('application/json', JSON.stringify({ stageId: stage.id, type: 'stage' }))
    e.dataTransfer.setData('drag-type', 'stage') // Add explicit drag type
    onStageDragStart?.(stage.id)
  }

  const handleStageDragOver = (e: React.DragEvent) => {
    // In dragOver, we can't read drag-type value, but we can check types
    const types = Array.from(e.dataTransfer.types)
    
    // Check if this might be a stage drag (has drag-type marker)
    // If it has drag-type, it could be either stage or deal, but we'll try stage first
    if (types.includes('drag-type')) {
      // Likely a stage drag, handle it
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      onStageDragOver?.(e, stage.id)
      return
    }
    
    // If no drag-type but has application/json, could be old format stage drag
    if (types.includes('application/json') && types.includes('text/plain')) {
      // Might be a stage drag, try handling it
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      onStageDragOver?.(e, stage.id)
      return
    }
    
    // Otherwise, it's likely a deal drag - let Card handle it
    // Don't prevent default here, let it bubble to Card
  }
  
  const handleStageDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if this is a stage drag by checking drag-type
    const dragType = e.dataTransfer.getData('drag-type')
    
    if (dragType === 'stage') {
      // For stage drags, we just mark the drop target
      // The actual save will happen in handleStageDragEnd
      console.log('handleStageDrop: Stage drag dropped on:', stage.id)
      // Don't call onStageDropAndSave here - let dragEnd handle it
      return
    }
    
    // This is a deal drop, handle it normally
    const dealId = e.dataTransfer.getData('text/plain')
    if (dealId) {
      onDrop(stage.id)
    }
  }

  const handleStageDragEnd = (e: React.DragEvent) => {
    console.log('🔥🔥🔥 KanbanColumn handleStageDragEnd CALLED', { 
      stageId: stage.id,
      hasOnStageDragEnd: !!onStageDragEnd,
      hasOnStageDropAndSave: !!onStageDropAndSave
    })
    e.preventDefault()
    e.stopPropagation()
    
    // Reset drag flag
    dragStartedRef.current = false
    
    // Call parent handler
    if (onStageDragEnd) {
      console.log('🔥 Calling onStageDragEnd from parent')
      onStageDragEnd()
    } else {
      console.error('🔥 ERROR: onStageDragEnd is not provided!')
    }
  }

  // Calculate deals count and total amount for this stage
  const stageDealsCount = deals.length
  const stageTotalAmount = deals.reduce((sum, deal) => sum + deal.amount, 0)

  return (
    <div 
      className={cn(
        "flex-shrink-0 w-72"
      )}
      onDragOver={handleStageDragOver}
      onDrop={handleStageDrop}
    >
      <div className="mb-3 flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="relative">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary transition-all"
                style={{ backgroundColor: stage.color }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsColorPickerOpen(!isColorPickerOpen)
                }}
                title="Click to change color"
              />
              {isColorPickerOpen && (
                <div
                  ref={colorPickerRef}
                  className="absolute z-50 mt-2 p-3 bg-card border border-border rounded-lg shadow-lg w-[280px]"
                  style={{ left: '0', top: '100%' }}
                >
                  {/* Basic colors row */}
                  <div className="mb-3">
                    <div className="text-xs text-foreground mb-2">Basic Colors</div>
                    <div className="grid grid-cols-9 gap-1.5">
                      {basicColors.map((color) => (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleColorChange(color)
                          }}
                          className={`h-7 w-7 rounded border-2 transition-all hover:scale-110 ${
                            stage.color === color
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:border-foreground/30'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Gradient rows */}
                  {gradientBaseColors.map((baseColor, rowIndex) => {
                    const gradients = generateColorGradients(baseColor, 9)
                    return (
                      <div key={baseColor} className={rowIndex > 0 ? 'mt-3' : ''}>
                        <div className="text-xs text-foreground mb-2">
                          {baseColor === '#3B82F6' ? 'Blue' :
                           baseColor === '#8B5CF6' ? 'Purple' :
                           baseColor === '#10B981' ? 'Green' :
                           baseColor === '#F59E0B' ? 'Amber' :
                           'Pink'}
                        </div>
                        <div className="grid grid-cols-9 gap-1.5">
                          {gradients.map((color, index) => (
                            <button
                              key={`${baseColor}-${index}`}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleColorChange(color)
                              }}
                              className={`h-7 w-7 rounded border-2 transition-all hover:scale-110 ${
                                stage.color === color
                                  ? 'border-foreground scale-110'
                                  : 'border-transparent hover:border-foreground/30'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <Input
              ref={inputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  handleCancel()
                }
              }}
              onBlur={handleInputBlur}
              disabled={isSaving}
              className="h-7 text-sm flex-1"
            />
            {onDeleteStage && (
              <Button
                ref={deleteButtonRef}
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
                onClick={(e) => {
                  console.log('🗑️ Delete button clicked!', { stageId: stage.id, isEditing })
                  e.preventDefault()
                  e.stopPropagation()
                  handleDelete(e)
                }}
                onMouseDown={(e) => {
                  // Prevent input blur from firing before click
                  e.preventDefault()
                }}
                title="Delete stage"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <div 
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0",
              isStageDragged && "opacity-50"
            )}
          >
            <GripVertical 
              className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0 hover:text-foreground transition-colors"
              draggable={true}
              onDragStart={(e) => {
                console.log('🔥🔥🔥 GRIP onDragStart FIRED!', { 
                  stageId: stage.id, 
                  isEditing,
                  draggable: true
                })
                dragStartedRef.current = true
                // Call handleStageDragStart first to set draggedStageId
                // This ensures state is set before dragOver events fire
                if (onStageDragStart) {
                  onStageDragStart(stage.id)
                }
                // Then call the local handler to set dataTransfer
                handleStageDragStart(e)
              }}
              onDragEnd={(e) => {
                console.log('🔥🔥🔥 GRIP onDragEnd FIRED!', { 
                  stageId: stage.id,
                  hasOnStageDragEnd: !!onStageDragEnd
                })
                e.preventDefault()
                e.stopPropagation()
                // Reset drag flag after a delay to allow double click to work
                setTimeout(() => {
                  dragStartedRef.current = false
                }, 200)
                handleStageDragEnd(e)
              }}
              style={{ userSelect: 'none' }}
              title="Drag to reorder"
            />
            <div className="relative">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary transition-all"
                style={{ backgroundColor: stage.color }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsColorPickerOpen(!isColorPickerOpen)
                }}
                title="Click to change color"
              />
              {isColorPickerOpen && (
                <div
                  ref={colorPickerRef}
                  className="absolute z-50 mt-2 p-3 bg-card border border-border rounded-lg shadow-lg w-[280px]"
                  style={{ left: '0', top: '100%' }}
                >
                  {/* Basic colors row */}
                  <div className="mb-3">
                    <div className="text-xs text-foreground mb-2">Basic Colors</div>
                    <div className="grid grid-cols-9 gap-1.5">
                      {basicColors.map((color) => (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleColorChange(color)
                          }}
                          className={`h-7 w-7 rounded border-2 transition-all hover:scale-110 ${
                            stage.color === color
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:border-foreground/30'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Gradient rows */}
                  {gradientBaseColors.map((baseColor, rowIndex) => {
                    const gradients = generateColorGradients(baseColor, 9)
                    return (
                      <div key={baseColor} className={rowIndex > 0 ? 'mt-3' : ''}>
                        <div className="text-xs text-foreground mb-2">
                          {baseColor === '#3B82F6' ? 'Blue' :
                           baseColor === '#8B5CF6' ? 'Purple' :
                           baseColor === '#10B981' ? 'Green' :
                           baseColor === '#F59E0B' ? 'Amber' :
                           'Pink'}
                        </div>
                        <div className="grid grid-cols-9 gap-1.5">
                          {gradients.map((color, index) => (
                            <button
                              key={`${baseColor}-${index}`}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleColorChange(color)
                              }}
                              className={`h-7 w-7 rounded border-2 transition-all hover:scale-110 ${
                                stage.color === color
                                  ? 'border-foreground scale-110'
                                  : 'border-transparent hover:border-foreground/30'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <CardTitle 
                className="text-sm font-semibold cursor-pointer hover:text-primary transition-colors truncate"
                onDoubleClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!isEditing && !dragStartedRef.current) {
                    handleDoubleClick()
                  }
                }}
                title={stage.name}
              >
                {stage.name}
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {deals.length}
            </Badge>
            {onAddStage && !isWonOrLostStage(stage.name) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 hover:bg-muted transition-colors"
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
        )}
      </div>

      <Card
        className={cn(
          "flex flex-col shadow-none",
          isDraggedOver && "border-primary border-2"
        )}
        onDragOver={(e) => {
          // Allow all drags in dragOver - filtering happens in drop handler
          // This ensures deal drags work properly
          e.preventDefault()
          e.stopPropagation()
          handleDragOver(e)
        }}
        onDrop={(e) => {
          // Check if this is a stage drag by checking drag-type
          const dragType = e.dataTransfer.getData('drag-type')
          
          if (dragType === 'stage') {
            // Let stage drags pass through to parent (the stage column div)
            e.stopPropagation()
            return
          }
          
          // Handle deal drops
          e.preventDefault()
          e.stopPropagation()
          const dealId = e.dataTransfer.getData('text/plain')
          if (dealId) {
            onDrop(stage.id)
          }
        }}
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
                onDeleteDeal={onDeleteDeal}
                availableContacts={availableContacts}
                searchQuery={searchQuery}
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
  const { isCollapsed } = useSidebar()
  const { showSuccess, showError } = useToastNotification()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [deals, setDeals] = useState<DealCardData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedDeal, setDraggedDeal] = useState<DealCardData | null>(null)
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null)
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
      
      // Preserve currently selected pipeline if it exists
      const currentPipelineId = selectedPipeline?.id || pipelineId
      
      if (currentPipelineId) {
        const pipeline = data.find(p => p.id === currentPipelineId)
        if (pipeline) {
          console.log('Updating selected pipeline:', pipeline.id, pipeline.name, 'stages:', pipeline.stages?.length || 0)
          setSelectedPipeline(pipeline)
          return
        }
      }
      
      // Fallback to default or first pipeline
      const defaultPipeline = data.find(p => p.isDefault) || data[0]
      if (defaultPipeline) {
        console.log('Setting default pipeline:', defaultPipeline.id, defaultPipeline.name)
        setSelectedPipeline(defaultPipeline)
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
      // For kanban, we need ALL deals (no pagination limit)
      // Use a large limit to get all deals for the kanban board
      const dealsData = await getDeals({ 
        pipelineId: selectedPipeline.id,
        companyId: filters.companyId,
        contactId: filters.contactId,
        assignedToId: filters.assignedUserId,
        limit: 10000, // Large limit for kanban to show all deals
      })
      
      // API now returns paginated response, extract data array
      const safeDealsData = dealsData.data || []
      
      const transformedDeals: DealCardData[] = safeDealsData.map((deal, index) => {
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

    // Apply title filter (search by name)
    if (filters.title) {
      const searchLower = filters.title.toLowerCase()
      filtered = filtered.filter(d => 
        d.title?.toLowerCase().includes(searchLower)
      )
    }

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

  const handleDeleteDeal = async (dealId: string) => {
    try {
      const { deleteDeal } = await import('@/lib/api/deals')
      await deleteDeal(dealId)
      // Remove deal from local state
      setDeals(prevDeals => prevDeals.filter(d => d.id !== dealId))
      showSuccess('Deal deleted successfully')
    } catch (error) {
      console.error('Failed to delete deal:', error)
      // Reload deals on error
      await loadDeals()
      throw error
    }
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

  const handleUpdateStageColor = async (stageId: string, color: string) => {
    if (!selectedPipeline) return

    try {
      await updateStage(stageId, { color })
      showSuccess('Stage color updated successfully')
      await loadPipelines()
    } catch (error) {
      console.error('Failed to update stage color:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(errorMessage)
    }
  }

  const handleUpdateStage = async (stageId: string, name: string) => {
    if (!selectedPipeline) return

    try {
      await updateStage(stageId, { name })
      // Optimistically update local state
      setPipelines(prevPipelines => 
        prevPipelines.map(p => 
          p.id === selectedPipeline.id
            ? {
                ...p,
                stages: p.stages.map(s => 
                  s.id === stageId ? { ...s, name } : s
                )
              }
            : p
        )
      )
      // Update selectedPipeline
      setSelectedPipeline(prev => 
        prev ? {
          ...prev,
          stages: prev.stages.map(s => 
            s.id === stageId ? { ...s, name } : s
          )
        } : null
      )
    } catch (error) {
      console.error('Failed to update stage:', error)
      // Reload pipelines on error
      await loadPipelines()
      throw error
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!selectedPipeline) return

    try {
      await deleteStage(stageId)
      showSuccess('Stage deleted successfully')
      await loadPipelines()
    } catch (error) {
      console.error('Failed to delete stage:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(errorMessage)
    }
  }

  const [stageDropTargetId, setStageDropTargetId] = useState<string | null>(null)

  const handleStageDragStart = (stageId: string) => {
    console.log('🔥 handleStageDragStart: Starting drag for stage:', stageId)
    setDraggedStageId(stageId)
    setStageDropTargetId(null)
  }

  const handleStageDragOver = (e: React.DragEvent, targetStageId: string) => {
    if (!selectedPipeline) return

    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    // Track the drop target - always set it when dragging over
    // The draggedStageId should be set by handleStageDragStart
    console.log('🔥 handleStageDragOver: Dragging over stage:', targetStageId, 'dragged:', draggedStageId)
    
    // If we don't have draggedStageId yet, skip reordering but still allow dragOver
    if (!draggedStageId) {
      console.log('🔥 handleStageDragOver: No draggedStageId yet, allowing dragOver but skipping reorder')
      return
    }
    
    // If dragging over the same stage, skip
    if (draggedStageId === targetStageId) {
      return
    }
    
    // Set the drop target
    setStageDropTargetId(targetStageId)

    const stages = [...selectedPipeline.stages].sort((a, b) => a.order - b.order)
    const draggedIndex = stages.findIndex(s => s.id === draggedStageId)
    const targetIndex = stages.findIndex(s => s.id === targetStageId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Only update if the position actually changed
    if (draggedIndex === targetIndex) return

    // Reorder stages locally for visual feedback
    const newStages = [...stages]
    const [removed] = newStages.splice(draggedIndex, 1)
    newStages.splice(targetIndex, 0, removed)

    // Update order values
    const reorderedStages = newStages.map((stage, index) => ({
      ...stage,
      order: index
    }))

    // Optimistically update UI
    setSelectedPipeline({
      ...selectedPipeline,
      stages: reorderedStages
    })
  }

  const handleStageDragEnd = async () => {
    console.log('🔥🔥🔥 handleStageDragEnd CALLED', { 
      draggedStageId, 
      stageDropTargetId,
      hasPipeline: !!selectedPipeline,
      pipelineStages: selectedPipeline?.stages?.length,
      stagesOrder: selectedPipeline?.stages?.map(s => ({ id: s.id, name: s.name, order: s.order }))
    })
    
    // Save the current values to avoid stale closures
    const currentDraggedId = draggedStageId
    const currentTargetId = stageDropTargetId
    const currentPipeline = selectedPipeline
    
    // Clear state immediately to prevent double calls
    setDraggedStageId(null)
    setStageDropTargetId(null)
    
    // If we have dragged stage and target, save the changes
    if (currentDraggedId && currentTargetId && currentDraggedId !== currentTargetId && currentPipeline) {
      console.log('handleStageDragEnd: Saving stage reorder', {
        dragged: currentDraggedId,
        target: currentTargetId
      })
      try {
        await handleStageDropAndSave(currentTargetId, currentDraggedId)
      } catch (error) {
        console.error('handleStageDragEnd: Error saving:', error)
        await loadPipelines()
      }
    } else if (currentDraggedId && currentPipeline) {
      // No explicit target, but check if order changed
      // Use the current order from optimistically updated pipeline
      const currentStages = [...currentPipeline.stages].sort((a, b) => a.order - b.order)
      
      // Always save current order - if user dragged, order should be updated by dragOver
      console.log('handleStageDragEnd: Saving current order (no explicit target)', {
        dragged: currentDraggedId,
        stagesCount: currentStages.length,
        currentOrder: currentStages.map(s => ({ id: s.id, name: s.name, order: s.order }))
      })
      
      try {
        const stageOrders = currentStages.map((stage, index) => ({
          id: stage.id,
          order: index
        }))
        
        console.log('handleStageDragEnd: Sending reorder request to API:', {
          pipelineId: currentPipeline.id,
          stageOrders: stageOrders.map(so => ({ id: so.id, order: so.order }))
        })
        
        const result = await reorderStages(currentPipeline.id, stageOrders)
        console.log('handleStageDragEnd: API returned:', {
          pipelineId: result.id,
          stagesCount: result.stages?.length,
          stagesOrder: result.stages?.map(s => ({ id: s.id, name: s.name, order: s.order }))
        })
        
        showSuccess('Stages reordered successfully')
        
        // Update state with result
        setSelectedPipeline(result)
        setPipelines(prev => prev.map(p => p.id === currentPipeline.id ? result : p))
        
        // Reload to ensure sync with server
        await loadPipelines()
        
        console.log('handleStageDragEnd: Save complete and pipelines reloaded')
      } catch (error) {
        console.error('handleStageDragEnd: Error saving:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        showError('Failed to reorder stages', errorMessage)
        // Reload to revert optimistic update
        await loadPipelines()
      }
    }
  }

  const handleStageDropAndSave = async (targetStageId: string, draggedStageIdParam?: string) => {
    // Use parameter if provided, otherwise use state (for backward compatibility)
    const currentDraggedStageId = draggedStageIdParam || draggedStageId
    const currentPipeline = selectedPipeline
    
    console.log('handleStageDropAndSave called', {
      targetStageId,
      currentDraggedStageId,
      draggedStageIdParam,
      stateDraggedStageId: draggedStageId,
      hasPipeline: !!currentPipeline
    })
    
    if (!currentDraggedStageId || !currentPipeline) {
      console.error('handleStageDropAndSave: Missing required data', { 
        currentDraggedStageId, 
        hasPipeline: !!currentPipeline 
      })
      return
    }

    if (currentDraggedStageId === targetStageId) {
      console.log('handleStageDropAndSave: Dropped on same stage, no change needed')
      return
    }

    try {
      // Get current order from the optimistically updated pipeline
      // handleStageDragOver already updated the order values, so we can use them directly
      // BUT we need to sort by the updated order values to get the correct sequence
      const stages = [...currentPipeline.stages].sort((a, b) => a.order - b.order)
      console.log('handleStageDropAndSave: Current stages order (after optimistic update):', stages.map((s, i) => ({ 
        id: s.id, 
        name: s.name, 
        order: s.order,
        index: i 
      })))
      
      // Verify both stages exist
      const draggedIndex = stages.findIndex(s => s.id === currentDraggedStageId)
      const targetIndex = stages.findIndex(s => s.id === targetStageId)
      
      if (draggedIndex === -1 || targetIndex === -1) {
        console.error('handleStageDropAndSave: Could not find dragged or target stage', {
          draggedIndex,
          targetIndex,
          draggedStageId: currentDraggedStageId,
          targetStageId,
          stageIds: stages.map(s => s.id)
        })
        return
      }

      // The stages are already in the correct order from optimistic update
      // Just create stage orders with sequential indices (0, 1, 2, ...)
      const stageOrders = stages.map((stage, index) => ({
        id: stage.id,
        order: index
      }))
      
      console.log('handleStageDropAndSave: Final stage orders to save', {
        stageOrders: stageOrders.map((so, i) => ({ 
          id: so.id, 
          order: so.order,
          stageName: stages.find(s => s.id === so.id)?.name,
          index: i
        }))
      })

      console.log('handleStageDropAndSave: Sending reorder request:', {
        pipelineId: currentPipeline.id,
        draggedStageId: currentDraggedStageId,
        targetStageId,
        draggedIndex,
        targetIndex,
        stageOrders: stageOrders.map(so => ({ id: so.id, order: so.order }))
      })

      const result = await reorderStages(currentPipeline.id, stageOrders)
      console.log('✅ handleStageDropAndSave: Reorder successful, result:', result)
      console.log('✅ handleStageDropAndSave: Result stages order:', result.stages?.map((s, i) => ({ 
        id: s.id, 
        name: s.name, 
        order: s.order,
        index: i 
      })))
      
      // Verify the order was saved correctly
      const savedOrder = result.stages?.map(s => s.order) || []
      const expectedOrder = stageOrders.map(so => so.order)
      const ordersMatch = JSON.stringify(savedOrder.sort()) === JSON.stringify(expectedOrder.sort())
      console.log('✅ handleStageDropAndSave: Order verification', {
        savedOrder,
        expectedOrder,
        ordersMatch,
        savedStages: result.stages?.map((s, i) => ({ name: s.name, order: s.order, index: i }))
      })
      
      if (!ordersMatch) {
        console.error('❌ handleStageDropAndSave: Order mismatch! Saved order does not match expected order')
      }
      
      showSuccess('Stages reordered successfully')
      
      // Update pipelines list with the result
      setPipelines(prevPipelines => 
        prevPipelines.map(p => 
          p.id === currentPipeline.id ? result : p
        )
      )
      
      // Update selected pipeline with the result
      setSelectedPipeline(result)
      
      // Also reload to ensure we have the latest data from server
      console.log('🔄 handleStageDropAndSave: Reloading pipelines to verify persistence...')
      const reloadedData = await getPipelines()
      
      // After reload, check if order persisted
      const reloadedPipeline = reloadedData.find(p => p.id === currentPipeline.id)
      if (reloadedPipeline) {
        const reloadedOrder = reloadedPipeline.stages?.map(s => s.order) || []
        const persisted = JSON.stringify(reloadedOrder.sort()) === JSON.stringify(expectedOrder.sort())
        console.log('🔄 handleStageDropAndSave: After reload verification', {
          persisted,
          reloadedOrder,
          expectedOrder,
          reloadedStages: reloadedPipeline.stages?.map((s, i) => ({ name: s.name, order: s.order, index: i }))
        })
        if (!persisted) {
          console.error('❌ handleStageDropAndSave: Order did NOT persist after reload!')
          console.error('❌ This indicates a backend/database issue - the order was not saved correctly')
        } else {
          console.log('✅ handleStageDropAndSave: Order persisted correctly after reload!')
        }
        
        // Update state with reloaded data
        setPipelines(reloadedData)
        setSelectedPipeline(reloadedPipeline)
      }
    } catch (error) {
      console.error('handleStageDropAndSave: Failed to reorder stages:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('handleStageDropAndSave: Error details:', {
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined
      })
      showError('Failed to reorder stages', errorMessage)
      // Reload to revert optimistic update
      await loadPipelines()
    } finally {
      setDraggedStageId(null)
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
          const isStageDragged = draggedStageId === stage.id

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
              onDeleteDeal={handleDeleteDeal}
              onAddDeal={handleAddDealClick}
              onAddStage={handleAddStage}
              onUpdateStage={handleUpdateStage}
              onUpdateStageColor={handleUpdateStageColor}
              onDeleteStage={handleDeleteStage}
              onStageDragStart={handleStageDragStart}
              onStageDragOver={handleStageDragOver}
              onStageDragEnd={handleStageDragEnd}
              onStageDropAndSave={handleStageDropAndSave}
              isStageDragged={isStageDragged}
              availableContacts={contacts}
              pipelineId={selectedPipeline.id}
              searchQuery={filters.title}
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
            className="!h-screen max-h-[100vh] overflow-hidden p-0 m-0 rounded-none border-0 translate-x-0 translate-y-[-50%] top-[50%] animate-in fade-in-0 zoom-in-95 duration-200 transition-[left,width]"
            style={{
              left: isCollapsed ? '4rem' : '15rem',
              width: isCollapsed ? 'calc(100vw - 4rem)' : 'calc(100vw - 15rem)',
              maxWidth: 'none'
            }}
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
