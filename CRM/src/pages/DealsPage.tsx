import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from 'react-router-dom'
import { CRMLayout } from "@/components/crm/layout"
import { KanbanBoard, Deal, Stage } from "@/components/crm/kanban-board"
import { DealsListView } from "@/components/crm/deals-list-view"
import { DealSourcesPanel, DealSource } from "@/components/crm/deal-sources-panel"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Filter, LayoutGrid, List, Settings, ChevronDown, ArrowLeft, CheckCircle2, ArrowUpDown, X, Building2, User, Trash2, Loader2 } from 'lucide-react'
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { RedirectOldDealUrl } from "@/components/shared/redirect-old-deal-url"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { usePipelines } from "@/hooks/use-pipelines"
import { useCreateDeal } from "@/hooks/use-deals"
import { getDeals, deleteDeal, updateDeal, bulkDeleteDeals, bulkAssignDeals, getDealsCount, type Deal as APIDeal } from "@/lib/api/deals"
import { getUsers, type User as APIUser } from "@/lib/api/users"
import { useSelectionState } from "@/hooks/use-selection-state"
import { getPipelines } from "@/lib/api/pipelines"
import { useTranslation } from "@/lib/i18n/i18n-context"
import { useSearch } from "@/components/crm/search-context"
import { useUserRole } from "@/hooks/use-user-role"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Import kanban board directly (already lazy-loaded at route level via App.tsx)
import { DealsKanbanBoard } from "@/components/crm/deals-kanban-board"

const defaultStages: Stage[] = [
  { 
    id: "new", 
    label: "New", 
    color: "#6B8AFF", 
    isCustom: false,
    triggers: []
  },
  { 
    id: "in-progress", 
    label: "In Progress", 
    color: "#F59E0B", 
    isCustom: false,
    triggers: [
      {
        id: "trigger-1",
        type: "on_create",
        action: "create_task",
        taskTitle: "Связаться",
        taskDescription: "Связаться с клиентом, квалифицировать потребность"
      },
      {
        id: "trigger-2",
        type: "on_transition",
        action: "create_task",
        taskTitle: "Отправить предложение",
        taskDescription: "Подготовить и отправить коммерческое предложение"
      }
    ]
  },
  { 
    id: "negotiation", 
    label: "Negotiation", 
    color: "#8B5CF6", 
    isCustom: false,
    triggers: [
      {
        id: "trigger-3",
        type: "on_transition",
        action: "create_task",
        taskTitle: "Связаться",
        taskDescription: "Предложить варианты и обсудить условия"
      },
      {
        id: "trigger-4",
        type: "on_create",
        action: "create_task",
        taskTitle: "Назначить встречу",
        taskDescription: "Организовать встречу с клиентом для переговоров"
      }
    ]
  },
  { 
    id: "closed-won", 
    label: "Closed Won", 
    color: "#10B981", 
    isCustom: false,
    triggers: [
      {
        id: "trigger-5",
        type: "on_transition",
        action: "create_task",
        taskTitle: "Оформить договор",
        taskDescription: "Подготовить и подписать договор с клиентом"
      }
    ]
  },
  { 
    id: "closed-lost", 
    label: "Closed Lost", 
    color: "#EF4444", 
    isCustom: false,
    triggers: [
      {
        id: "trigger-6",
        type: "on_transition",
        action: "create_task",
        taskTitle: "Собрать обратную связь",
        taskDescription: "Выяснить причины отказа и получить обратную связь"
      }
    ]
  },
]

const demoDeals: Deal[] = [
  {
    id: "1",
    title: "Enterprise Software License",
    client: "Acme Corp",
    amount: 125000,
    stage: "negotiation",
    assignedTo: { name: "Sarah Wilson", avatar: "SW" },
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    title: "Cloud Migration Project",
    client: "TechStart Inc",
    amount: 85000,
    stage: "in-progress",
    assignedTo: { name: "Mike Chen", avatar: "MC" },
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    title: "Marketing Automation Setup",
    client: "Growth Labs",
    amount: 45000,
    stage: "new",
    assignedTo: { name: "Emma Davis", avatar: "ED" },
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    title: "Data Analytics Platform",
    client: "DataFlow Systems",
    amount: 95000,
    stage: "closed-won",
    assignedTo: { name: "Sarah Wilson", avatar: "SW" },
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    title: "Mobile App Development",
    client: "AppStart Co",
    amount: 65000,
    stage: "in-progress",
    assignedTo: { name: "John Smith", avatar: "JS" },
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "6",
    title: "CRM Implementation",
    client: "SalesForce Ltd",
    amount: 110000,
    stage: "negotiation",
    assignedTo: { name: "Mike Chen", avatar: "MC" },
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "7",
    title: "Website Redesign",
    client: "Creative Agency",
    amount: 35000,
    stage: "new",
    assignedTo: { name: "Emma Davis", avatar: "ED" },
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "8",
    title: "Security Audit",
    client: "FinTech Solutions",
    amount: 55000,
    stage: "closed-lost",
    assignedTo: { name: "John Smith", avatar: "JS" },
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
]

function DealsPageContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { searchValue, dealFilters } = useSearch()
  const { canManagePipelines, isAdmin } = useUserRole()
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [isEditMode, setIsEditMode] = useState(false)
  const [isFunnelDropdownOpen, setIsFunnelDropdownOpen] = useState(false)
  
  // Load saved funnel ID from localStorage
  const [currentFunnelId, setCurrentFunnelId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastSelectedFunnelId')
      return saved || ""
    }
    return ""
  })
  
  // Save funnel ID to localStorage when it changes
  useEffect(() => {
    if (currentFunnelId && typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedFunnelId', currentFunnelId)
    }
  }, [currentFunnelId])
  const [stages, setStages] = useState<Stage[]>(defaultStages)
  const [deals, setDeals] = useState<Deal[]>(demoDeals)
  
  // Use new selection state hook
  const selection = useSelectionState()
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined)
  const [kanbanDealsCount, setKanbanDealsCount] = useState<number>(0)

  const handleDealsCountChange = useCallback((count: number) => {
    setKanbanDealsCount(count)
  }, [])

  const [dealSources, setDealSources] = useState<DealSource[]>([
    {
      id: "unsorted",
      name: "Неразобранное",
      type: "unsorted",
      enabled: true,
      description: "Поступившие запросы в виде заявок в статусе \"Неразобранное\""
    },
    {
      id: "duplicate_control",
      name: "Контроль дублей",
      type: "duplicate_control",
      enabled: true,
      description: "Установите параметры проверки входящей заявки на дубль"
    },
    {
      id: "messenger_1",
      name: "Кедровый остров",
      type: "messenger",
      enabled: true
    },
    {
      id: "widget_1",
      name: "[WA] 79039197573",
      type: "widget",
      enabled: true
    },
    {
      id: "widget_2",
      name: "[WA] 79236649605",
      type: "widget",
      enabled: true
    },
  ])

  // Используем React Query для загрузки пайплайнов
  const { data: pipelines = [], isLoading: pipelinesLoading, error: pipelinesError } = usePipelines()
  const createDealMutation = useCreateDeal()

  // Загружаем stages из выбранного pipeline
  useEffect(() => {
    if (currentFunnelId && pipelines.length > 0) {
      const currentPipeline = pipelines.find(p => p.id === currentFunnelId)
      if (currentPipeline && currentPipeline.stages && currentPipeline.stages.length > 0) {
        // Преобразуем API stages в UI format
        const uiStages: Stage[] = currentPipeline.stages.map(stage => ({
          id: stage.id,
          label: stage.name,
          color: stage.color,
          isCustom: true,
        }))
        setStages(uiStages)
      }
    }
  }, [currentFunnelId, pipelines])

  // Преобразуем пайплайны в воронки
  const funnelsList = pipelines.map(p => ({
    id: p.id,
    name: p.name,
  }))

  // Устанавливаем дефолтный пайплайн при загрузке или проверяем сохраненный
  useEffect(() => {
    if (funnelsList.length > 0) {
      // Check if saved funnel ID exists in current pipelines
      if (currentFunnelId) {
        const savedPipeline = pipelines.find(p => p.id === currentFunnelId)
        if (savedPipeline) {
          // Saved pipeline exists, use it
          return
        } else {
          // Saved pipeline doesn't exist, clear it
          setCurrentFunnelId("")
          if (typeof window !== 'undefined') {
            localStorage.removeItem('lastSelectedFunnelId')
          }
        }
      }
      
      // If no current funnel, set default or first one
      if (!currentFunnelId) {
        const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
        if (defaultPipeline) {
          setCurrentFunnelId(defaultPipeline.id)
        }
      }
    }
  }, [pipelines, funnelsList.length, currentFunnelId])

  // Обработка ошибок авторизации
  useEffect(() => {
    if (pipelinesError && pipelinesError instanceof Error && (pipelinesError.message === 'UNAUTHORIZED' || pipelinesError.message.includes('401'))) {
      console.warn('Authentication failed, redirecting to login')
      window.location.href = '/app/login'
    }
  }, [pipelinesError, navigate])

  const currentFunnel = funnelsList.find(f => f.id === currentFunnelId) || funnelsList[0] || null

  const handleSelectFunnel = (funnelId: string) => {
    setCurrentFunnelId(funnelId)
    setIsFunnelDropdownOpen(false)
  }

  const handleBulkDelete = () => {
    const selectedCount = selection.getSelectedCount()
    if (selectedCount === 0) {
      return
    }
    // Set default delete mode based on selection mode
    setDeleteMode(selection.state.selectionMode === 'ALL_MATCHING' ? 'ALL_MATCHING' : 'PAGE')
    setIsDeleteDialogOpen(true)
  }

  const confirmBulkDelete = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    const selectedCount = deleteMode === 'ALL_MATCHING'
      ? Math.max(0, (totalCount ?? 0) - selection.state.excludedIds.size)
      : selection.getSelectedCount()
    if (selectedCount === 0) {
      return
    }

    try {
      setIsDeleting(true)
      setDeletionProgress({ current: 0, total: selectedCount })
      
      let result: { deletedCount: number; failedCount: number }
      
      if (deleteMode === 'PAGE') {
        // Delete by IDs (page selection)
        const idsToDelete = Array.from(selection.state.selectedIds)
        result = await bulkDeleteDeals({
          mode: 'IDS',
          ids: idsToDelete,
        })
      } else {
        // Delete by filter (all matching)
        const excludedIds = Array.from(selection.state.excludedIds)
        result = await bulkDeleteDeals({
          mode: 'FILTER',
          filter: {
            pipelineId: selectedPipelineForList,
            companyId: filters.companyId,
            contactId: filters.contactId,
            assignedToId: filters.assignedUserId,
            search: filters.title,
          },
          excludedIds: excludedIds.length > 0 ? excludedIds : undefined,
        })
      }
      
      setDeletionProgress({ current: result.deletedCount, total: selectedCount })
      
      // Remove deleted deals from listDeals (only if PAGE mode)
      if (deleteMode === 'PAGE') {
        const idsToDelete = Array.from(selection.state.selectedIds)
        setListDeals(prevDeals => prevDeals.filter(deal => !idsToDelete.includes(deal.id)))
      } else {
        // For ALL_MATCHING mode, reload the list
        // This will be handled by the useEffect that watches filters
      }

      // Update total count locally if known
      if (totalCount !== undefined && result.deletedCount > 0) {
        setTotalCount(Math.max(0, totalCount - result.deletedCount))
      }
      
      // Clear selection
      selection.clearSelection()
      
      // Close dialog and show success
      setIsDeleting(false)
      setDeletionProgress({ current: 0, total: 0 })
      setIsDeleteDialogOpen(false)
      
      const message = result.deletedCount > 0
        ? `${result.deletedCount} ${result.deletedCount === 1 ? 'сделка удалена' : 'сделок удалено'}`
        : 'Удаление не выполнено'
      showSuccess(message)
      
      if (result.failedCount > 0) {
        showError(`Не удалось удалить ${result.failedCount} ${result.failedCount === 1 ? 'сделку' : 'сделок'}`)
      }
      
      // Reload deals if needed
      if (viewMode === 'list') {
        // Trigger reload for list view
        setListRefreshKey(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to delete deals:', error)
      setIsDeleting(false)
      setDeletionProgress({ current: 0, total: 0 })
      showError(t('deals.deleteError') || 'Ошибка при удалении сделок', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleOpenAssignDialog = () => {
    if (selection.getSelectedCount() === 0) {
      return
    }
    setAssignUserId(undefined)
    setIsAssignDialogOpen(true)
  }

  const confirmBulkAssign = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (assignUserId === undefined) {
      return
    }

    const selectedCount = selection.getSelectedCount()
    if (selectedCount === 0) {
      return
    }

    try {
      setIsAssigning(true)

      let result: { updatedCount: number; failedCount: number }

      if (selection.state.selectionMode === 'PAGE') {
        const idsToUpdate = Array.from(selection.state.selectedIds)
        result = await bulkAssignDeals({
          mode: 'IDS',
          ids: idsToUpdate,
          assignedToId: assignUserId,
        })

        const selectedUser = users.find(u => u.id === assignUserId) || null
        setListDeals(prevDeals => prevDeals.map(deal => {
          if (!idsToUpdate.includes(deal.id)) {
            return deal
          }
          return {
            ...deal,
            assignedToId: assignUserId === null ? null : assignUserId,
            assignedTo: selectedUser
              ? {
                  id: selectedUser.id,
                  name: selectedUser.fullName || `${selectedUser.firstName} ${selectedUser.lastName}`.trim(),
                  avatar: selectedUser.avatar,
                }
              : null,
          }
        }))
      } else {
        const excludedIds = Array.from(selection.state.excludedIds)
        result = await bulkAssignDeals({
          mode: 'FILTER',
          filter: {
            pipelineId: selectedPipelineForList,
            companyId: filters.companyId,
            contactId: filters.contactId,
            assignedToId: filters.assignedUserId,
            search: filters.title,
          },
          excludedIds: excludedIds.length > 0 ? excludedIds : undefined,
          assignedToId: assignUserId,
        })
      }

      selection.clearSelection()
      setIsAssigning(false)
      setIsAssignDialogOpen(false)

      const message = result.updatedCount > 0
        ? `Ответственный обновлен для ${result.updatedCount} ${result.updatedCount === 1 ? 'сделки' : 'сделок'}`
        : 'Обновление не выполнено'
      showSuccess(message)

      if (result.failedCount > 0) {
        showError(`Не удалось обновить ${result.failedCount} ${result.failedCount === 1 ? 'сделку' : 'сделок'}`)
      }

      if (viewMode === 'list') {
        setListRefreshKey(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to bulk assign deals:', error)
      setIsAssigning(false)
      showError('Ошибка при изменении ответственного', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleBulkChangeStage = async (newStage: string) => {
    if (selection.getSelectedCount() === 0) {
      return
    }

    const selectedIds = selection.state.selectionMode === 'PAGE' 
      ? Array.from(selection.state.selectedIds)
      : listDeals.map(d => d.id).filter(id => selection.isSelected(id))

    if (selectedIds.length === 0) {
      return
    }

    const updatedAt = new Date().toISOString()
    const stageLabel = stages.find(stage => stage.id === newStage)?.label

    // Optimistic UI update for list and kanban data
    setListDeals(prevDeals => prevDeals.map(deal => {
      if (!selectedIds.includes(deal.id)) {
        return deal
      }
      return {
        ...deal,
        stageId: newStage,
        stage: {
          id: newStage,
          name: stageLabel || deal.stage?.name || newStage
        },
        updatedAt
      }
    }))
    setDeals(prevDeals => prevDeals.map(deal =>
      selectedIds.includes(deal.id) ? { ...deal, stage: newStage, updatedAt } : deal
    ))

    selection.clearSelection()

    const results = await Promise.all(
      selectedIds.map(dealId =>
        updateDeal(dealId, { stageId: newStage }).catch(error => {
          console.error(`Failed to update deal ${dealId} stage:`, error)
          return null
        })
      )
    )

    const failedCount = results.filter(result => result === null).length
    if (failedCount > 0) {
      showError(
        'Ошибка при изменении стадии',
        `Не удалось обновить ${failedCount} сдел${failedCount === 1 ? 'ку' : failedCount <= 4 ? 'ки' : 'ок'}`
      )
    } else {
      showSuccess('Стадия сделки обновлена')
    }
  }

  const { showSuccess, showError } = useToastNotification()
  const [listDeals, setListDeals] = useState<APIDeal[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedPipelineForList, setSelectedPipelineForList] = useState<string | undefined>()
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0)
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0 })
  const [deleteMode, setDeleteMode] = useState<'PAGE' | 'ALL_MATCHING'>('PAGE') // Mode for deletion dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignUserId, setAssignUserId] = useState<string | null | undefined>(undefined)
  const [users, setUsers] = useState<APIUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  
  // Filters and sort state
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{
    companyId?: string
    contactId?: string
    assignedUserId?: string
    amountMin?: number
    amountMax?: number
    updatedAfter?: string
    updatedBefore?: string
    title?: string
    stageIds?: string[]
    taskStatuses?: string[]
  }>({})
  const [sort, setSort] = useState<{ field: 'amount' | 'updatedAt'; direction: 'asc' | 'desc' }>({
    field: 'updatedAt',
    direction: 'desc'
  })

  const effectiveStageIds = dealFilters?.stageIds ?? filters.stageIds
  const effectiveStageId = effectiveStageIds?.length === 1 ? effectiveStageIds[0] : undefined

  // Обновляем фильтры при изменении поиска или панели
  useEffect(() => {
    const newTitle = searchValue.trim() || dealFilters?.title?.trim() || undefined
    setFilters(prev => {
      const newFilters = {
        ...prev,
        title: newTitle,
        stageIds: dealFilters?.stageIds,
        companyId: dealFilters?.companyId,
        contactId: dealFilters?.contactId,
        assignedUserId: dealFilters?.assignedToId,
        amountMin: dealFilters?.amountMin,
        amountMax: dealFilters?.amountMax,
        updatedAfter: dealFilters?.dateFrom,
        updatedBefore: dealFilters?.dateTo,
        taskStatuses: dealFilters?.taskStatuses,
      }
      return newFilters
    })
  }, [searchValue, dealFilters])

  // Sync selectedPipelineForList with currentFunnelId when switching to list view
  useEffect(() => {
    if (viewMode === 'list' && currentFunnelId && currentFunnelId !== '') {
      setSelectedPipelineForList(currentFunnelId)
    }
  }, [viewMode, currentFunnelId])

  // Get default pipeline ID for list view if no pipeline is selected
  useEffect(() => {
    if (viewMode === 'list' && !selectedPipelineForList && (!currentFunnelId || currentFunnelId === '')) {
      getPipelines()
        .then((pipelines) => {
          const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
          if (defaultPipeline) {
            setSelectedPipelineForList(defaultPipeline.id)
            if (!currentFunnelId || currentFunnelId === '') {
              setCurrentFunnelId(defaultPipeline.id)
            }
          } else {
          }
        })
        .catch((error) => {
          console.error('Failed to load pipelines for list:', error)
        })
    }
  }, [viewMode, selectedPipelineForList, currentFunnelId])

  // Load deals for list view
  useEffect(() => {
    if (viewMode === 'list') {
      if (selectedPipelineForList) {
        setListLoading(true)
        const listParams = {
          pipelineId: selectedPipelineForList,
          companyId: filters.companyId,
          contactId: filters.contactId,
          assignedToId: filters.assignedUserId,
          search: filters.title,
          stageId: effectiveStageId,
          stageIds: effectiveStageIds,
          limit: 50,
        }
        getDeals(listParams)
          .then((response) => {
            // API now always returns paginated response
            setListDeals(response.data)
            setNextCursor(response.nextCursor)
            setHasMore(response.hasMore)
            if (response.total !== undefined) {
              setTotalCount(response.total)
            } else {
              getDealsCount(listParams).then(setTotalCount).catch(error => {
                console.error('Failed to load deals count:', error)
              })
            }
          })
          .catch((error) => {
            console.error('Failed to load deals for list:', error)
            setListDeals([])
            setNextCursor(undefined)
            setHasMore(false)
          })
          .finally(() => {
            setListLoading(false)
          })
      } else {
        // Try to load all deals if no pipeline is selected
        setListLoading(true)
        const listParams = {
          companyId: filters.companyId,
          contactId: filters.contactId,
          assignedToId: filters.assignedUserId,
          search: filters.title,
          stageId: effectiveStageId,
          stageIds: effectiveStageIds,
          limit: 50,
        }
        getDeals(listParams)
          .then((response) => {
            // API now always returns paginated response
            setListDeals(response.data)
            setNextCursor(response.nextCursor)
            setHasMore(response.hasMore)
            if (response.total !== undefined) {
              setTotalCount(response.total)
            } else {
              getDealsCount(listParams).then(setTotalCount).catch(error => {
                console.error('Failed to load deals count:', error)
              })
            }
          })
          .catch((error) => {
            console.error('Failed to load deals for list:', error)
            setListDeals([])
            setNextCursor(undefined)
            setHasMore(false)
          })
          .finally(() => {
            setListLoading(false)
          })
      }
    } else {
      // Clear deals when switching away from list view
      setListDeals([])
      setNextCursor(undefined)
      setHasMore(false)
    }
  }, [viewMode, selectedPipelineForList, filters.companyId, filters.contactId, filters.assignedUserId, filters.title, effectiveStageIds, listRefreshKey])

  // Ensure total count always matches active filters (for list view)
  useEffect(() => {
    if (viewMode !== 'list') return
    const countParams = {
      pipelineId: selectedPipelineForList,
      companyId: filters.companyId,
      contactId: filters.contactId,
      assignedToId: filters.assignedUserId,
      search: filters.title,
      stageId: effectiveStageId,
      stageIds: effectiveStageIds,
    }
    getDealsCount(countParams)
      .then(count => {
        setTotalCount(count)
      })
      .catch(error => {
        console.error('Failed to load deals count:', error)
      })
  }, [viewMode, selectedPipelineForList, filters.companyId, filters.contactId, filters.assignedUserId, filters.title, effectiveStageIds])
  
  // Memoize selectedDeals array for DealsListView (must be before conditional rendering)
  const selectedDealsArray = useMemo(() => {
    const mode = selection.state.selectionMode
    if (mode === 'PAGE') {
      return Array.from(selection.state.selectedIds)
    } else {
      const excludedIds = Array.from(selection.state.excludedIds)
      return (listDeals || [])
        .filter(d => d && d.id) // Filter out undefined/null deals
        .map(d => d.id!)
        .filter(id => !excludedIds.includes(id))
    }
  }, [
    selection.state.selectionMode,
    selection.state.selectedIds.size,
    Array.from(selection.state.selectedIds).sort().join(','),
    selection.state.excludedIds.size,
    Array.from(selection.state.excludedIds).sort().join(','),
    listDeals.length,
    (listDeals || []).map(d => d?.id).filter(Boolean).sort().join(',')
  ])

  const filteredListDeals = useMemo(() => {
    return (listDeals || [])
      .filter(deal => {
        if (filters.title) {
          const searchLower = filters.title.toLowerCase()
          return deal.title?.toLowerCase().includes(searchLower)
        }
        return true
      })
      .filter(deal => {
        if (!effectiveStageIds || effectiveStageIds.length === 0) return true
        const dealStageId = (deal as any).stageId || deal.stage?.id
        return dealStageId ? effectiveStageIds.includes(dealStageId) : false
      })
      .filter(deal => deal && deal.id)
  }, [listDeals, filters.title, effectiveStageIds])
  
  // Clear selection when switching away from list view
  useEffect(() => {
    if (viewMode !== 'list') {
      selection.clearSelection()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])
  
  // Load users for bulk assignee change
  useEffect(() => {
    if (!isAssignDialogOpen || users.length > 0 || usersLoading) {
      return
    }

    setUsersLoading(true)
    setUsersError(null)
    getUsers()
      .then(data => {
        setUsers(data)
      })
      .catch(error => {
        console.error('Failed to load users:', error)
        setUsersError(error instanceof Error ? error.message : 'Failed to load users')
      })
      .finally(() => {
        setUsersLoading(false)
      })
  }, [isAssignDialogOpen, users.length, usersLoading])

  // Load more deals handler
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return

    setLoadingMore(true)
    try {
      const params: any = {
        companyId: filters.companyId,
        contactId: filters.contactId,
        assignedToId: filters.assignedUserId,
        search: filters.title,
        stageId: effectiveStageId,
        stageIds: effectiveStageIds,
        limit: 50,
        cursor: nextCursor,
      }
      if (selectedPipelineForList) {
        params.pipelineId = selectedPipelineForList
      }
      
      const response = await getDeals(params)

      // API now always returns paginated response
      if (response && response.data) {
        setListDeals(prev => [...prev, ...response.data])
        setNextCursor(response.nextCursor)
        setHasMore(response.hasMore)
      }
    } catch (error) {
      console.error('Failed to load more deals:', error)
      showError('Ошибка загрузки', 'Не удалось загрузить дополнительные сделки. Попробуйте еще раз.')
      // Don't update state on error, let user try again
    } finally {
      setLoadingMore(false)
    }
  }

  const handleCreateNewDeal = async (stageId?: string) => {
    try {
      if (!currentFunnelId) {
        showError(t('deals.noPipelineSelected'), t('deals.selectOrCreatePipeline'))
        return
      }

      const currentFunnel = pipelines.find(p => p.id === currentFunnelId)
      if (!currentFunnel || !currentFunnel.stages || currentFunnel.stages.length === 0) {
        showError(t('deals.noPipelineAvailable'), t('deals.createPipelineWithStages'))
        return
      }

      // Get current user ID
      let currentUserId: string | undefined
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          currentUserId = user.id
        }
      } catch (error) {
        console.error('Failed to get current user:', error)
      }

      // Use provided stageId or default to first stage
      const targetStageId = stageId || currentFunnel.stages.sort((a, b) => a.order - b.order)[0].id

      const newDeal = await createDealMutation.mutateAsync({
        title: t('deals.newDeal'),
        amount: 0,
        pipelineId: currentFunnelId,
        stageId: targetStageId,
        status: 'open',
        assignedToId: currentUserId,
      })

      showSuccess(t('deals.dealCreatedSuccess'))
      navigate(`/deals/${newDeal.id}`)
    } catch (error) {
      console.error('Failed to create deal:', error)
      showError(t('deals.failedToCreateDeal'), error instanceof Error ? error.message : t('messages.pleaseTryAgain'))
    }
  }

  return (
      <div className="h-[calc(100vh-3rem)] flex flex-col px-6 py-6">
        <div className="flex-shrink-0 mb-6">
          {isEditMode ? (
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(false)}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <button
                  onClick={() => setIsFunnelDropdownOpen(!isFunnelDropdownOpen)}
                  className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pipelinesLoading}
                >
                  {pipelinesLoading ? 'Loading...' : (currentFunnel?.name || 'No pipeline')}
                  <ChevronDown className="h-5 w-5" />
                </button>
                
                {isFunnelDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsFunnelDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border/50 rounded-lg shadow-lg z-20 overflow-hidden">
                      {funnelsList.length === 0 ? (
                        <div className="px-4 py-2.5 text-sm text-muted-foreground">
                          {t('pipeline.noPipelinesFound')}
                        </div>
                      ) : (
                        funnelsList.map((funnel) => (
                          <button
                            key={funnel.id}
                            onClick={() => handleSelectFunnel(funnel.id)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              funnel.id === currentFunnelId
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-accent/50"
                            }`}
                          >
                            {funnel.name}
                            {funnel.id === currentFunnelId && (
                              <span className="ml-2 text-xs text-muted-foreground">✓</span>
                            )}
                          </button>
                        ))
                      )}
                      {canManagePipelines && (
                        <div className="border-t border-border/50">
                          <button
                            onClick={() => {
                              setIsFunnelDropdownOpen(false)
                              navigate('/settings/pipelines')
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-accent/50 transition-colors flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            {t('deals.addPipeline')}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <Button size="sm" onClick={() => setIsEditMode(false)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('common.save')}
            </Button>
            </div>
          ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="relative">
                <button
                  onClick={() => setIsFunnelDropdownOpen(!isFunnelDropdownOpen)}
                  className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pipelinesLoading}
                >
                  {pipelinesLoading ? 'Loading...' : (currentFunnel?.name || 'No pipeline')}
                  <ChevronDown className="h-5 w-5" />
                </button>
              
              {isFunnelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFunnelDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border/50 rounded-lg shadow-lg z-20 overflow-hidden">
                    {funnelsList.length === 0 ? (
                      <div className="px-4 py-2.5 text-sm text-muted-foreground">
                        {t('pipeline.noPipelinesFound')}
                      </div>
                    ) : (
                      funnelsList.map((funnel) => (
                        <button
                          key={funnel.id}
                          onClick={() => handleSelectFunnel(funnel.id)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            funnel.id === currentFunnelId
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-accent/50"
                          }`}
                        >
                          {funnel.name}
                          {funnel.id === currentFunnelId && (
                            <span className="ml-2 text-xs text-muted-foreground">✓</span>
                          )}
                        </button>
                      ))
                    )}
                    {canManagePipelines && (
                      <div className="border-t border-border/50">
                        <button
                          onClick={() => {
                            setIsFunnelDropdownOpen(false)
                            navigate('/settings/pipelines')
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-accent/50 transition-colors flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          {t('deals.addPipeline')}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('deals.managePipeline')}
              {viewMode === 'kanban' && (
                <span className="ml-2">
                  · {kanbanDealsCount}
                </span>
              )}
              {viewMode === 'list' && (
                <span className="ml-2">
                  · {t('deals.dealsShown') || 'Показано'} {filteredListDeals.length}
                  {' '}
                  {t('deals.dealsOf') || 'из'} {totalCount ?? filteredListDeals.length}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-border/40 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "kanban"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                }`}
                aria-label={t('deals.kanbanView')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-sm border-l border-border/40 transition-colors ${
                  viewMode === "list"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                }`}
                aria-label={t('deals.listView')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="text-xs"
              >
                <Settings className="mr-2 h-4 w-4 shrink-0" />
                {t('settings.title')}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <ArrowUpDown className="mr-2 h-4 w-4 shrink-0" />
                  {sort.direction === 'desc' ? 'Сначала новые' : 'Сначала старые'}
                  <ChevronDown className="ml-2 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setSort({ field: 'updatedAt', direction: 'desc' })}
                  className={sort.direction === 'desc' ? 'bg-accent' : ''}
                >
                  Сначала новые
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSort({ field: 'updatedAt', direction: 'asc' })}
                  className={sort.direction === 'asc' ? 'bg-accent' : ''}
                >
                  Сначала старые
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
              <Button size="sm" onClick={() => handleCreateNewDeal()} className="text-xs">
                <Plus className="mr-2 h-4 w-4 shrink-0" />
                {t('deals.newDeal')}
              </Button>
            </div>
            </div>
          )}
        </div>

        {/* Filters Panel - Fixed */}
        {showFilters && viewMode === "kanban" && (
          <div className="flex-shrink-0 px-6 py-4 border-b border-border/40">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">{t('deals.company')}</label>
                  <Select
                    value={filters.companyId || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, companyId: value === 'all' ? undefined : value })}
                  >
                    <SelectTrigger className="h-8 text-xs" size="sm">
                      <Building2 className="mr-2 h-4 w-4 shrink-0" />
                      <SelectValue placeholder={t('deals.allCompanies')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('deals.allCompanies')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">{t('deals.contact')}</label>
                  <Select
                    value={filters.contactId || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, contactId: value === 'all' ? undefined : value })}
                  >
                    <SelectTrigger className="h-8 text-xs" size="sm">
                      <User className="mr-2 h-4 w-4 shrink-0" />
                      <SelectValue placeholder={t('deals.allContacts')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('deals.allContacts')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">{t('deals.amountRange')}</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={t('common.min')}
                      value={filters.amountMin || ''}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        amountMin: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      placeholder={t('common.max')}
                      value={filters.amountMax || ''}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        amountMax: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">{t('deals.updatedAfter')}</label>
                  <Input
                    type="date"
                    value={filters.updatedAfter || ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      updatedAfter: e.target.value || undefined 
                    })}
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">{t('deals.updatedBefore')}</label>
                  <Input
                    type="date"
                    value={filters.updatedBefore || ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      updatedBefore: e.target.value || undefined 
                    })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          {viewMode === "kanban" ? (
            <div className="flex gap-4 h-full flex-1 min-h-0">
            {isEditMode && (
              <DealSourcesPanel
                sources={dealSources}
                onUpdateSource={(sourceId, updates) => {
                  setDealSources(dealSources.map(s => 
                    s.id === sourceId ? { ...s, ...updates } : s
                  ))
                }}
                onAddSource={() => {
                }}
              />
            )}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {isEditMode ? (
                <KanbanBoard
                  initialStages={stages}
                  initialDeals={deals}
                  onStagesChange={setStages}
                  onDealsChange={setDeals}
                  isEditMode={isEditMode}
                />
              ) : (
                  <DealsKanbanBoard
                    key={kanbanRefreshKey}
                    pipelineId={currentFunnelId && currentFunnelId !== "" ? currentFunnelId : undefined}
                    showFilters={showFilters}
                    filters={filters}
                    sort={sort}
                    onFiltersChange={setFilters}
                    onSortChange={setSort}
                    onAddDeal={handleCreateNewDeal}
                    onDealsCountChange={handleDealsCountChange}
                  />
              )}
            </div>
          </div>
        ) : (
          listLoading ? (
            <PageSkeleton />
          ) : (
            <>
              <DealsListView
                deals={filteredListDeals.map(deal => {
                  if (!deal || !deal.id) return null // Safety check
                  // Use stageId from deal object or from nested stage object
                  const stageId = (deal as any).stageId || deal.stage?.id || 'new'
                  // Use stage name directly from deal.stage if available
                  const stageName = deal.stage?.name
                  return {
                    id: deal.id,
                    title: deal.title,
                    client: deal.contact?.fullName || deal.company?.name || 'No client',
                    amount: deal.amount || 0,
                    stage: stageId,
                    stageName: stageName, // Store stage name for fallback
                    assignedTo: deal.assignedTo ? {
                      id: deal.assignedTo.id,
                      name: deal.assignedTo.firstName && deal.assignedTo.lastName
                        ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`
                        : deal.assignedTo.name || deal.assignedTo.email || 'Unknown',
                      avatar: deal.assignedTo.avatar || (deal.assignedTo.firstName && deal.assignedTo.lastName
                        ? `${deal.assignedTo.firstName[0]}${deal.assignedTo.lastName[0]}`.toUpperCase()
                        : deal.assignedTo.name?.substring(0, 2).toUpperCase() || deal.assignedTo.email?.substring(0, 2).toUpperCase() || 'U'),
                    } : { name: 'Unassigned', avatar: 'U' },
                    updatedAt: deal.updatedAt || deal.createdAt || new Date().toISOString(),
                    contact: deal.contact ? {
                      link: deal.contact.link,
                      subscriberCount: deal.contact.subscriberCount,
                      directions: deal.contact.directions,
                    } : undefined,
                  }
                })}
              selectedDeals={selectedDealsArray}
              onSelectDeals={(ids) => {
                if (ids.length === 0) {
                  selection.clearSelection()
                } else {
                  selection.selectAllOnPage(ids)
                }
              }}
              totalCount={totalCount}
              selectionMode={selection.state.selectionMode}
              onBulkDelete={handleBulkDelete}
              onBulkAssign={handleOpenAssignDialog}
              onBulkChangeStage={handleBulkChangeStage}
              searchQuery={searchValue}
              stages={(() => {
                // Convert API stages (with 'name') to component format (with 'label')
                // Use stages ONLY from selected pipeline
                const currentPipeline = pipelines.find(p => p.id === selectedPipelineForList)
                if (currentPipeline?.stages && currentPipeline.stages.length > 0) {
                  return currentPipeline.stages.map(s => ({
                    id: s.id,
                    label: s.name,
                    color: s.color,
                    isCustom: !s.isDefault
                  }))
                }
                // Return empty array if no pipeline selected or no stages
                return []
              })()}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={handleLoadMore}
              />
            </>
          )
          )}
        </div>

        {/* Bulk Assign Confirmation Dialog */}
        <Dialog
          open={isAssignDialogOpen}
          onOpenChange={(open) => {
            if (!open && isAssigning) {
              return
            }
            setIsAssignDialogOpen(open)
          }}
        >
          <DialogContent className="max-w-lg p-5 space-y-4 rounded-br-3xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground">
                    Изменить ответственного
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Выбрано сделок: {selection.getSelectedCount()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Новый ответственный
                </label>
                {usersLoading ? (
                  <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/20">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Загрузка пользователей...</span>
                  </div>
                ) : usersError ? (
                  <div className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg text-sm text-destructive">
                    {usersError}
                  </div>
                ) : (
                  <Select
                    value={assignUserId === null ? '__UNASSIGNED__' : assignUserId ?? ''}
                    onValueChange={(value) => {
                      if (value === '__UNASSIGNED__') {
                        setAssignUserId(null)
                      } else if (value) {
                        setAssignUserId(value)
                      } else {
                        setAssignUserId(undefined)
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Выберите пользователя" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__UNASSIGNED__">— Без ответственного —</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName || `${user.firstName} ${user.lastName}`.trim()} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                  disabled={isAssigning}
                >
                  Отмена
                </Button>
                <Button
                  onClick={confirmBulkAssign}
                  disabled={isAssigning || assignUserId === undefined}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Обновление...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Изменить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Deals Confirmation Dialog */}
        <Dialog 
          open={isDeleteDialogOpen} 
          onOpenChange={(open) => {
            // Prevent closing during deletion
            if (!open && isDeleting) {
              return
            }
            setIsDeleteDialogOpen(open)
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4 rounded-br-3xl">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground">
                    Удаление сделок
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isDeleting 
                      ? `Удаление ${deletionProgress.current} из ${deletionProgress.total}...`
                      : 'Выберите режим удаления:'
                    }
                  </p>
                </div>
              </div>

              {/* Delete Mode Selection */}
              {!isDeleting && (
                <div className="space-y-3 py-2 border-b border-border/40">
                    <label className="flex items-start gap-3 p-3 rounded-md border border-border/40 hover:bg-surface/30 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteMode === 'PAGE'}
                      onChange={() => setDeleteMode('PAGE')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        Удалить только выбранные на странице
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Будет удалено {selection.state.selectedIds.size} {selection.state.selectedIds.size === 1 ? 'сделка' : 'сделок'}
                      </div>
                    </div>
                  </label>
                  {totalCount !== undefined && totalCount > (selection.state.selectionMode === 'PAGE' ? selection.state.selectedIds.size : listDeals.filter(d => selection.isSelected(d.id)).length) && (
                    <label className="flex items-start gap-3 p-3 rounded-md border border-border/40 hover:bg-surface/30 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deleteMode"
                        checked={deleteMode === 'ALL_MATCHING'}
                        onChange={() => setDeleteMode('ALL_MATCHING')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          Удалить все найденные по текущему фильтру
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Будет удалено {totalCount - selection.state.excludedIds.size} из {totalCount} {totalCount === 1 ? 'сделки' : 'сделок'} по текущим фильтрам
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              {isDeleting && (
                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Прогресс удаления</span>
                    <span className="font-semibold text-foreground">
                      {deletionProgress.current} / {deletionProgress.total}
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out flex items-center justify-end pr-2"
                      style={{ width: `${deletionProgress.total > 0 ? (deletionProgress.current / deletionProgress.total) * 100 : 0}%` }}
                    >
                      {deletionProgress.current > 0 && (
                        <span className="text-[10px] font-medium text-primary-foreground">
                          {Math.round((deletionProgress.current / deletionProgress.total) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Удаление сделок, пожалуйста, подождите...
                  </p>
                </div>
              )}

              {/* Deals List */}
              {!isDeleting && deleteMode === 'PAGE' && (
                <div className="max-h-[300px] overflow-y-auto rounded-md border border-border/40 bg-surface/30 p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">
                    Сделки для удаления ({selection.state.selectedIds.size}):
                  </p>
                  <div className="space-y-2">
                    {listDeals
                      .filter(deal => selection.isSelected(deal.id))
                      .slice(0, 10)
                      .map(deal => (
                        <div key={deal.id} className="flex items-center gap-2 text-sm py-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                          <span className="truncate text-foreground">{deal.title || 'Untitled Deal'}</span>
                        </div>
                      ))}
                    {selection.state.selectedIds.size > 10 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        и еще {selection.state.selectedIds.size - 10}...
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!isDeleting && deleteMode === 'ALL_MATCHING' && totalCount !== undefined && (
                <div className="rounded-md border border-border/40 bg-surface/30 p-4">
                  <p className="text-sm text-foreground">
                    Будет удалено <strong>{totalCount - selection.state.excludedIds.size}</strong> из <strong>{totalCount}</strong> сделок, соответствующих текущим фильтрам.
                  </p>
                  {selection.state.excludedIds.size > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Исключено из удаления: {selection.state.excludedIds.size} {selection.state.excludedIds.size === 1 ? 'сделка' : 'сделок'}
                    </p>
                  )}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Отмена
                </Button>
                <Button
                  onClick={confirmBulkDelete}
                  disabled={isDeleting}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Удаление...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
  )
}

export default function DealsPage() {
  return (
    <CRMLayout>
      <RedirectOldDealUrl />
      <DealsPageContent />
    </CRMLayout>
  )
}
