"use client"

console.log('🔴🔴🔴 DEALS PAGE MODULE LOADED - TIMESTAMP:', new Date().toISOString())

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { CRMLayout } from "@/components/crm/layout"
import { KanbanBoard, Deal, Stage } from "@/components/crm/kanban-board"
import { DealsKanbanBoard } from "@/components/crm/deals-kanban-board"
import { DealsListView } from "@/components/crm/deals-list-view"
import { PipelineSettingsModal, Funnel } from "@/components/crm/pipeline-settings-modal"
import { DealSourcesPanel, DealSource } from "@/components/crm/deal-sources-panel"
import { Button } from "@/components/ui/button"
import { Plus, Filter, LayoutGrid, List, Settings, ChevronDown, ArrowLeft, CheckCircle2 } from 'lucide-react'
// Custom hook to replace useSearchParams from next/navigation
let globalSetParams: ((params: URLSearchParams) => void) | null = null

const useSearchParams = () => {
  const [params, setParams] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search)
    }
    return new URLSearchParams()
  })

  useEffect(() => {
    globalSetParams = setParams
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      setParams(new URLSearchParams(window.location.search))
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (globalSetParams === setParams) {
        globalSetParams = null
      }
    }
  }, [])

  return params
}
import { PageSkeleton, DealsPageSkeleton } from "@/components/shared/loading-skeleton"
import { createDeal, getDeals, deleteDeal, updateDeal, type Deal as APIDeal } from "@/lib/api/deals"
import { getPipelines, createPipeline, createStage, type Pipeline, type Stage as PipelineStage } from "@/lib/api/pipelines"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { useUserRole } from '@/hooks/use-user-role'
import { useSearch } from "@/components/crm/search-context"

const defaultFunnels: Funnel[] = [
  { id: "default", name: "Sales Pipeline" },
  { id: "marketing", name: "Marketing Leads" },
]

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

export default function DealsPage() {
  useAuthGuard()
  const { isAdmin, role } = useUserRole()
  console.log('🔐 DealsPage: isAdmin =', isAdmin, ', role =', role)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { searchValue, dealFilters } = useSearch()
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [kanbanDealsCount, setKanbanDealsCount] = useState<number>(0)

  const handleDealsCountChange = useCallback((count: number) => {
    console.log('🔔 handleDealsCountChange called with:', count)
    setKanbanDealsCount(count)
  }, [])

  useEffect(() => {
    console.log('📈 Page kanbanDealsCount updated:', kanbanDealsCount)
  }, [kanbanDealsCount])

  const searchInput = useMemo(() => searchValue.trim(), [searchValue])
  const titleFilter = useMemo(() => dealFilters?.title?.trim() || '', [dealFilters])

  // Debug: Log dealFilters changes
  useEffect(() => {
    console.log('🔵 deals/page.tsx: dealFilters changed:', dealFilters)
    console.log('🔵 deals/page.tsx: dealFilters.taskStatuses =', dealFilters?.taskStatuses)
  }, [dealFilters])

  const kanbanFilters = useMemo(() => {
    const filters = {
      searchQuery: searchInput || undefined,
      title: titleFilter || undefined,
      number: dealFilters?.number,
      description: dealFilters?.description,
      companyId: dealFilters?.companyId,
      contactId: dealFilters?.contactId,
      assignedUserId: dealFilters?.assignedToId,
      amountMin: dealFilters?.amountMin,
      amountMax: dealFilters?.amountMax,
      budgetMin: dealFilters?.budgetMin,
      budgetMax: dealFilters?.budgetMax,
      dateFrom: dealFilters?.dateFrom,
      dateTo: dealFilters?.dateTo,
      dateType: dealFilters?.dateType,
      expectedCloseFrom: dealFilters?.expectedCloseFrom,
      expectedCloseTo: dealFilters?.expectedCloseTo,
      tags: dealFilters?.tags,
      rejectionReasons: dealFilters?.rejectionReasons,
      activeStagesOnly: dealFilters?.activeStagesOnly,
      contactSubscriberCountMin: dealFilters?.contactSubscriberCountMin,
      contactSubscriberCountMax: dealFilters?.contactSubscriberCountMax,
      contactDirections: dealFilters?.contactDirections,
      stageIds: dealFilters?.stageIds,
      taskStatuses: dealFilters?.taskStatuses,
    }
    console.log('🔵 kanbanFilters useMemo: dealFilters =', dealFilters)
    console.log('🔵 kanbanFilters useMemo: taskStatuses =', filters.taskStatuses)
    return filters
  }, [searchInput, titleFilter, dealFilters])

  // Read deal ID from URL on mount and when URL changes
  useEffect(() => {
    const dealId = searchParams.get('deal')
    if (dealId && dealId !== selectedDealId) {
      setSelectedDealId(dealId)
    } else if (!dealId && selectedDealId !== null) {
      setSelectedDealId(null)
    }
  }, [searchParams, selectedDealId])

  // Handle deal click - update URL
  const handleDealClick = useCallback((dealId: string | null) => {
    // Update state first
    setSelectedDealId(dealId)
    
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams(window.location.search)
    if (dealId) {
      params.set('deal', dealId)
    } else {
      params.delete('deal')
    }
    const queryString = params.toString()
    const newUrl = `/deals${queryString ? `?${queryString}` : ''}`
    
    // Update URL using pushState
    window.history.pushState({ path: newUrl }, '', newUrl)
    
    // Update search params state
    if (globalSetParams) {
      globalSetParams(params)
    }
    
    // Force update by dispatching popstate
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isFunnelDropdownOpen, setIsFunnelDropdownOpen] = useState(false)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [pipelinesLoading, setPipelinesLoading] = useState(true)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [currentFunnelId, setCurrentFunnelId] = useState<string>("")
  const [stages, setStages] = useState<Stage[]>(defaultStages)
  const [deals, setDeals] = useState<Deal[]>(demoDeals)
  const [selectedDeals, setSelectedDeals] = useState<string[]>([])
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

  const mapPipelineStages = (pipelineStages: PipelineStage[]) =>
    [...pipelineStages]
      .sort((a, b) => a.order - b.order)
      .map(stage => ({
        id: stage.id,
        label: stage.name,
        color: stage.color || "#6B7280",
        isCustom: !stage.isDefault
      }))

  // Load pipelines from API
  useEffect(() => {
    const loadPipelines = async () => {
      // Check if user is authenticated
      if (typeof window === 'undefined') return
      
      try {
        setPipelinesLoading(true)
        const pipelines = await getPipelines()
        
        setPipelines(pipelines)

        // Convert Pipeline[] to Funnel[]
        const funnelsList: Funnel[] = pipelines.map(p => ({
          id: p.id,
          name: p.name,
        }))
        
        setFunnels(funnelsList)
        
        // Set default pipeline or first one
        if (funnelsList.length > 0) {
          const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
          if (defaultPipeline) {
            setCurrentFunnelId(defaultPipeline.id)
            if (defaultPipeline.stages?.length) {
              setStages(mapPipelineStages(defaultPipeline.stages))
            }
          }
        }
      } catch (error) {
        console.error('Failed to load pipelines:', error)
        // Check if it's an auth error
        if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message.includes('401'))) {
          // Token already cleared in API function
          router.push('/login')
          return
        }
        // Fallback to empty array on error
        setFunnels([])
        setPipelines([])
      } finally {
        setPipelinesLoading(false)
      }
    }
    
    loadPipelines()
  }, [])

  const currentFunnel = funnels.find(f => f.id === currentFunnelId) || funnels[0] || null

  useEffect(() => {
    if (pipelines.length === 0) return
    const targetPipelineId = selectedPipelineForList || currentFunnelId
    if (!targetPipelineId) return
    const pipeline = pipelines.find(p => p.id === targetPipelineId)
    if (pipeline?.stages?.length) {
      setStages(mapPipelineStages(pipeline.stages))
    }
  }, [pipelines, selectedPipelineForList, currentFunnelId])

  const handleAddFunnel = async (name: string) => {
    if (!name.trim()) {
      showError('Pipeline name required', 'Please enter a pipeline name')
      return
    }

    try {
      const newPipeline = await createPipeline({
        name: name.trim(),
        isDefault: false, // Don't set as default automatically
      })

      // Create default stages for the new pipeline
      const defaultStagesToCreate = [
        { name: 'New', color: '#6B8AFF', order: 0, isDefault: true },
        { name: 'In Progress', color: '#F59E0B', order: 1, isDefault: false },
        { name: 'Negotiation', color: '#8B5CF6', order: 2, isDefault: false },
        { name: 'Closed Won', color: '#10B981', order: 3, isDefault: false, isClosed: true },
        { name: 'Closed Lost', color: '#EF4444', order: 4, isDefault: false, isClosed: true },
      ]

      let stagesCreated = 0
      for (const stageData of defaultStagesToCreate) {
        try {
          await createStage(newPipeline.id, stageData)
          stagesCreated++
        } catch (stageError) {
          console.error(`Failed to create stage ${stageData.name}:`, stageError)
          // Continue creating other stages even if one fails
        }
      }

      showSuccess(`Pipeline "${newPipeline.name}" created successfully with ${stagesCreated} stages`)
      
      // Wait a bit more for stages to be fully created and indexed in DB
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Refresh pipelines list from API to get the pipeline with stages
      const pipelines = await getPipelines()
      
      // Find the newly created pipeline
      const createdPipeline = pipelines.find(p => p.id === newPipeline.id)
      if (!createdPipeline) {
        // Retry once more
        await new Promise(resolve => setTimeout(resolve, 1000))
        const retryPipelines = await getPipelines()
        retryPipelines.find(p => p.id === newPipeline.id)
      }
      
      // Update funnels list with all pipelines from API
      setPipelines(pipelines)

      const funnelsList: Funnel[] = pipelines.map(p => ({
        id: p.id,
        name: p.name,
      }))
      
      setFunnels(funnelsList)
      
      // Select the newly created pipeline
      setCurrentFunnelId(newPipeline.id)
      if (createdPipeline?.stages?.length) {
        setStages(mapPipelineStages(createdPipeline.stages))
      }
      
      // Force Kanban board to refresh by changing key - this will make it reload pipelines
      setKanbanRefreshKey(prev => prev + 1)

      // Close settings modal if open
      setIsSettingsOpen(false)
    } catch (error) {
      console.error('Failed to create pipeline:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showError('Failed to create pipeline', errorMessage)
    }
  }

  const handleDeleteFunnel = async (funnelId: string) => {
    // Don't allow deleting non-existent pipelines
    const funnel = funnels.find(f => f.id === funnelId)
    if (!funnel) return
    
    try {
      // TODO: Implement deletePipeline API call when backend supports it
      // For now, just remove from local state
      setFunnels(funnels.filter(f => f.id !== funnelId))
      
      // If deleting current pipeline, select default or first one
      if (currentFunnelId === funnelId) {
        const remainingPipelines = funnels.filter(f => f.id !== funnelId)
        if (remainingPipelines.length > 0) {
          setCurrentFunnelId(remainingPipelines[0].id)
        } else {
          setCurrentFunnelId("")
        }
      }
    } catch (error) {
      console.error('Failed to delete pipeline:', error)
      showError('Failed to delete pipeline', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleUpdateStages = (updatedStages: Stage[]) => {
    setStages(updatedStages)
  }

  const handleSelectFunnel = (funnelId: string) => {
    setCurrentFunnelId(funnelId)
    setIsFunnelDropdownOpen(false)
  }

  const handleBulkDelete = async () => {
    if (selectedDeals.length === 0) {
      return
    }

    const dealsToDelete = [...selectedDeals]
    const dealsCount = dealsToDelete.length

    try {
      // Delete deals in parallel for faster execution (no delays)
      await Promise.all(
        dealsToDelete.map(dealId => 
          deleteDeal(dealId).catch(error => {
            console.error(`Failed to delete deal ${dealId}:`, error)
            // Continue with other deals even if one fails
            return null
          })
        )
      )

      // Update listDeals state (used in list view)
      setListDeals(prevDeals => prevDeals.filter(deal => !dealsToDelete.includes(deal.id)))
      
      // Also update deals state (used in kanban view)
      setDeals(prevDeals => prevDeals.filter(d => !dealsToDelete.includes(d.id)))
      
      // Clear selection
      setSelectedDeals([])
      
      // Формируем правильное сообщение в зависимости от количества
      let message = ''
      if (dealsCount === 1) {
        message = 'Сделка успешно удалена'
      } else if (dealsCount >= 2 && dealsCount <= 4) {
        message = `Удалено ${dealsCount} сделки`
      } else {
        message = `Удалено ${dealsCount} сделок`
      }
      showSuccess(message)
    } catch (error) {
      console.error('Failed to delete deals:', error)
      showError('Ошибка при удалении сделок', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleBulkChangeStage = async (newStage: string) => {
    if (selectedDeals.length === 0) {
      return
    }

    const dealsToUpdate = [...selectedDeals]
    const updatedAt = new Date().toISOString()
    const stageLabel = stages.find(stage => stage.id === newStage)?.label

    // Optimistically update list and kanban data
    setListDeals(prevDeals =>
      prevDeals.map(deal =>
        dealsToUpdate.includes(deal.id)
          ? {
              ...deal,
              stageId: newStage,
              stage: {
                id: newStage,
                name: stageLabel || deal.stage?.name || newStage
              },
              updatedAt
            }
          : deal
      )
    )
    setDeals(prevDeals =>
      prevDeals.map(deal =>
        dealsToUpdate.includes(deal.id)
          ? { ...deal, stage: newStage, updatedAt }
          : deal
      )
    )
    setSelectedDeals([])

    const results = await Promise.all(
      dealsToUpdate.map(dealId =>
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
  const [selectedPipelineForList, setSelectedPipelineForList] = useState<string | undefined>()
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0) // For forcing Kanban refresh

  const listQueryParams = useMemo(() => {
    return {
      search: searchInput || undefined,
      title: titleFilter || undefined,
      number: dealFilters?.number,
      description: dealFilters?.description,
      pipelineId: selectedPipelineForList,
      stageIds: dealFilters?.stageIds,
      companyId: dealFilters?.companyId,
      contactId: dealFilters?.contactId,
      assignedToId: dealFilters?.assignedToId,
      createdById: dealFilters?.createdById,
      amountMin: dealFilters?.amountMin,
      amountMax: dealFilters?.amountMax,
      budgetMin: dealFilters?.budgetMin,
      budgetMax: dealFilters?.budgetMax,
      dateFrom: dealFilters?.dateFrom,
      dateTo: dealFilters?.dateTo,
      dateType: dealFilters?.dateType,
      expectedCloseFrom: dealFilters?.expectedCloseFrom,
      expectedCloseTo: dealFilters?.expectedCloseTo,
      tags: dealFilters?.tags,
      rejectionReasons: dealFilters?.rejectionReasons,
      activeStagesOnly: dealFilters?.activeStagesOnly,
      contactSubscriberCountMin: dealFilters?.contactSubscriberCountMin,
      contactSubscriberCountMax: dealFilters?.contactSubscriberCountMax,
      contactDirections: dealFilters?.contactDirections,
      taskStatuses: dealFilters?.taskStatuses,
    }
  }, [searchInput, titleFilter, selectedPipelineForList, dealFilters])

  // Sync selectedPipelineForList with currentFunnelId when switching to list view or when currentFunnelId changes
  useEffect(() => {
    if (viewMode === 'list') {
      if (currentFunnelId && currentFunnelId !== '') {
        console.log('📋 Syncing selectedPipelineForList with currentFunnelId:', currentFunnelId)
        setSelectedPipelineForList(currentFunnelId)
      }
    }
  }, [viewMode, currentFunnelId])

  // Get default pipeline ID for list view if no pipeline is selected
  useEffect(() => {
    if (viewMode === 'list' && !selectedPipelineForList) {
      console.log('📋 No pipeline selected for list view, loading default pipeline')
      getPipelines()
        .then((pipelines) => {
          const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
          if (defaultPipeline) {
            console.log('📋 Setting default pipeline for list view:', defaultPipeline.id)
            setSelectedPipelineForList(defaultPipeline.id)
            if (!currentFunnelId || currentFunnelId === '') {
              setCurrentFunnelId(defaultPipeline.id)
            }
          } else {
            console.log('📋 No pipelines available')
          }
        })
        .catch((error) => {
          console.error('Failed to load pipelines for list:', error)
        })
    }
  }, [viewMode, selectedPipelineForList, currentFunnelId])

  // Load deals for list view
  useEffect(() => {
    if (viewMode !== 'list') {
      // Clear deals when switching away from list view
      setListDeals([])
      return
    }

    if (listQueryParams.pipelineId) {
      console.log('📋 Loading deals for list view, pipelineId:', listQueryParams.pipelineId)
    } else {
      console.log('📋 List view but no pipeline selected yet')
    }

    setListLoading(true)
    getDeals({ ...listQueryParams, limit: 50 })
      .then((response) => {
        console.log('📋 Loaded deals for list view:', response.data.length, 'deals')
        setListDeals(response.data)
      })
      .catch((error) => {
        console.error('Failed to load deals for list:', error)
        setListDeals([])
      })
      .finally(() => {
        setListLoading(false)
      })
  }, [viewMode, listQueryParams])

  const handleCreateNewDeal = async () => {
    try {
      // Get default pipeline and first stage
      const pipelines = await getPipelines()
      const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]

      if (!defaultPipeline || !defaultPipeline.stages || defaultPipeline.stages.length === 0) {
        showError('No pipeline available', 'Please create a pipeline with stages first')
        return
      }

      const firstStage = defaultPipeline.stages.sort((a, b) => a.order - b.order)[0]

      console.log('[DEBUG] Full pipeline:', defaultPipeline)
      console.log('[DEBUG] First stage:', firstStage)
      console.log('[DEBUG] First stage ID:', firstStage?.id)
      console.log('[DEBUG] First stage ID type:', typeof firstStage?.id)
      console.log('[DEBUG] First stage stringified:', JSON.stringify(firstStage))

      // Safely extract ID
      const stageId = firstStage?.id || (firstStage as any)?.stageId || null
      const pipelineId = defaultPipeline?.id || null

      console.log('[DEBUG] Extracted IDs:', { stageId, pipelineId })

      if (!stageId || !pipelineId) {
        showError('Invalid data', 'Pipeline or stage ID is missing')
        return
      }

      // Create deal via API
      const newDeal = await createDeal({
        title: 'New Deal',
        amount: 0,
        pipelineId: String(pipelineId),
        stageId: String(stageId),
      })

      showSuccess('Deal created successfully')
      router.push(`/deals/${newDeal.id}`)
    } catch (error) {
      console.error('Failed to create deal:', error)
      showError('Failed to create deal', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Show unified skeleton while pipelines are loading
  if (pipelinesLoading && funnels.length === 0) {
    return (
      <CRMLayout>
        <DealsPageSkeleton />
      </CRMLayout>
    )
  }

  return (
    <CRMLayout>
      <div className="h-[calc(100vh-3rem)] flex flex-col px-6 py-6">
        {/* Fixed Header - не скроллится */}
        <div className="flex-shrink-0 pb-2 pt-2 mb-3">
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
                  {currentFunnel?.name || 'No pipeline'}
                  <ChevronDown className="h-5 w-5" />
                </button>
                
                {isFunnelDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsFunnelDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border/50 rounded-lg shadow-lg z-20 overflow-hidden">
                      {funnels.length === 0 ? (
                        <div className="px-4 py-2.5 text-sm text-muted-foreground">
                          No pipelines found
                        </div>
                      ) : (
                        funnels.map((funnel) => (
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
                      {isAdmin && (
                        <div className="border-t border-border/50">
                          <button
                            onClick={() => {
                              setIsFunnelDropdownOpen(false)
                              setIsSettingsOpen(true)
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-accent/50 transition-colors flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Добавить воронку
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
              Сохранить
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
                  {currentFunnel?.name || 'No pipeline'}
                  <ChevronDown className="h-5 w-5" />
                </button>
              
              {isFunnelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFunnelDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border/50 rounded-lg shadow-lg z-20 overflow-hidden">
                    {funnels.length === 0 ? (
                      <div className="px-4 py-2.5 text-sm text-muted-foreground">
                        No pipelines found
                      </div>
                    ) : (
                      funnels.map((funnel) => (
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
                    {isAdmin && (
                      <div className="border-t border-border/50">
                        <button
                          onClick={() => {
                            setIsFunnelDropdownOpen(false)
                            setIsSettingsOpen(true)
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-accent/50 transition-colors flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Добавить воронку
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Manage your sales pipeline</span>
              {viewMode === "kanban" && (
                <>
                  <span>•</span>
                  <span className="font-medium text-foreground">{kanbanDealsCount}</span>
                </>
              )}
            </div>
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
                aria-label="Kanban view"
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
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
              <Button size="sm" onClick={handleCreateNewDeal}>
                <Plus className="mr-2 h-4 w-4" />
                Новая сделка
              </Button>
            </div>
            </div>
          )}
        </div>

        {/* Content Area - скроллится */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
          {viewMode === "kanban" ? (
            <div className="flex gap-4 h-full">
            {isEditMode && (
              <DealSourcesPanel
                sources={dealSources}
                onUpdateSource={(sourceId, updates) => {
                  setDealSources(dealSources.map(s => 
                    s.id === sourceId ? { ...s, ...updates } : s
                  ))
                }}
                onAddSource={() => {
                  // Add new source logic
                }}
              />
            )}
            <div className="flex-1">
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
                  selectedDealId={selectedDealId}
                  onDealClick={handleDealClick}
                  filters={kanbanFilters}
                  onDealsCountChange={handleDealsCountChange}
                />
              )}
            </div>
          </div>
        ) : (
          listLoading ? (
            <PageSkeleton />
          ) : (
            <DealsListView
              deals={listDeals.map(deal => {
                console.log('📋 Mapping deal:', deal.id, deal.title)
                return {
                  id: deal.id,
                  title: deal.title || 'Untitled Deal',
                  client: deal.contact?.fullName || deal.company?.name || 'No client',
                  amount: deal.amount || 0,
                  stage: deal.stageId || deal.stage?.id || 'new',
                  stageName: deal.stage?.name || (deal as any).stageName,
                  assignedTo: deal.assignedTo ? {
                    name: deal.assignedTo.firstName && deal.assignedTo.lastName 
                      ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`
                      : deal.assignedTo.name || deal.assignedTo.email || 'Unknown',
                    avatar: deal.assignedTo.avatar || (deal.assignedTo.firstName && deal.assignedTo.lastName
                      ? `${deal.assignedTo.firstName[0]}${deal.assignedTo.lastName[0]}`.toUpperCase()
                      : deal.assignedTo.name?.substring(0, 2).toUpperCase() || deal.assignedTo.email?.substring(0, 2).toUpperCase() || 'U')
                  } : { name: 'Unassigned', avatar: 'U' },
                  updatedAt: deal.updatedAt || deal.createdAt || new Date().toISOString(),
                }
              })}
              selectedDeals={selectedDeals}
              onSelectDeals={setSelectedDeals}
              onBulkDelete={handleBulkDelete}
              onBulkChangeStage={handleBulkChangeStage}
              stages={stages}
              selectedDealId={selectedDealId}
              onDealClick={handleDealClick}
            />
          )
          )}
        </div>

        <PipelineSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          stages={stages}
          onUpdateStages={handleUpdateStages}
          funnels={funnels}
          currentFunnelId={currentFunnelId}
          onSelectFunnel={setCurrentFunnelId}
          onAddFunnel={handleAddFunnel}
          onDeleteFunnel={handleDeleteFunnel}
        />

      </div>
    </CRMLayout>
  )
}
