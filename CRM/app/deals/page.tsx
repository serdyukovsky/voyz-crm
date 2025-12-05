"use client"

import { useState, useEffect, useCallback } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { KanbanBoard, Deal, Stage } from "@/components/crm/kanban-board"
import { DealsKanbanBoard } from "@/components/crm/deals-kanban-board"
import { DealsListView } from "@/components/crm/deals-list-view"
import { PipelineSettingsModal, Funnel } from "@/components/crm/pipeline-settings-modal"
import { DealSourcesPanel, DealSource } from "@/components/crm/deal-sources-panel"
import { Button } from "@/components/ui/button"
import { Plus, Filter, LayoutGrid, List, Settings, ChevronDown, ArrowLeft, CheckCircle2 } from 'lucide-react'
// Custom hooks to replace next/navigation
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

const useRouter = () => {
  return {
    push: (url: string) => {
      if (typeof window !== 'undefined') {
        console.log('useRouter.push: Updating URL to:', url)
        // Extract path and search params
        const [path, search] = url.split('?')
        const newSearch = search || ''
        
        // Update search params state immediately
        if (globalSetParams) {
          const newParams = new URLSearchParams(newSearch)
          console.log('useRouter.push: Updating search params:', newParams.toString())
          globalSetParams(newParams)
        }
        
        // Update URL using pushState - this should update the address bar
        const newUrl = path + (newSearch ? `?${newSearch}` : '')
        window.history.pushState({ path: newUrl }, '', newUrl)
        
        // Force update by dispatching popstate event
        window.dispatchEvent(new PopStateEvent('popstate'))
        
        console.log('useRouter.push: URL after pushState:', window.location.href)
        console.log('useRouter.push: window.location.search:', window.location.search)
      }
    }
  }
}
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { createDeal, getDeals, type Deal as APIDeal } from "@/lib/api/deals"
import { getPipelines, createPipeline, createStage } from "@/lib/api/pipelines"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { useAuthGuard } from '@/hooks/use-auth-guard'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

  // Read deal ID from URL on mount and when URL changes
  useEffect(() => {
    const dealId = searchParams.get('deal')
    console.log('DealsPage: Reading deal from URL:', dealId, 'Current selectedDealId:', selectedDealId)
    if (dealId && dealId !== selectedDealId) {
      console.log('DealsPage: Setting selectedDealId from URL:', dealId)
      setSelectedDealId(dealId)
    } else if (!dealId && selectedDealId !== null) {
      console.log('DealsPage: No deal in URL, clearing selectedDealId')
      setSelectedDealId(null)
    }
  }, [searchParams, selectedDealId])

  // Handle deal click - update URL
  const handleDealClick = useCallback((dealId: string | null) => {
    console.log('DealsPage: handleDealClick called with dealId:', dealId)
    console.log('DealsPage: Current URL before update:', window.location.href)
    
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
    console.log('DealsPage: New URL to push:', newUrl)
    
    // Update URL using pushState
    window.history.pushState({ path: newUrl }, '', newUrl)
    console.log('DealsPage: URL immediately after pushState:', window.location.href)
    console.log('DealsPage: window.location.search:', window.location.search)
    
    // Update search params state
    if (globalSetParams) {
      globalSetParams(params)
    }
    
    // Force update by dispatching popstate
    window.dispatchEvent(new PopStateEvent('popstate'))
    
    // Double check after a delay
    setTimeout(() => {
      console.log('DealsPage: URL after pushState (delayed):', window.location.href)
      console.log('DealsPage: window.location.search (delayed):', window.location.search)
    }, 100)
  }, [])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isFunnelDropdownOpen, setIsFunnelDropdownOpen] = useState(false)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [pipelinesLoading, setPipelinesLoading] = useState(true)
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

  // Load pipelines from API
  useEffect(() => {
    const loadPipelines = async () => {
      // Check if user is authenticated
      if (typeof window === 'undefined') return
      
      try {
        setPipelinesLoading(true)
        const pipelines = await getPipelines()
        
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
          }
        } else {
          console.log('No pipelines found, but user is authenticated')
        }
      } catch (error) {
        console.error('Failed to load pipelines:', error)
        // Check if it's an auth error
        if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message.includes('401'))) {
          console.warn('Authentication failed, redirecting to login')
          // Token already cleared in API function
          router.push('/login')
          return
        }
        // Fallback to empty array on error
        setFunnels([])
      } finally {
        setPipelinesLoading(false)
      }
    }
    
    loadPipelines()
  }, [])

  const currentFunnel = funnels.find(f => f.id === currentFunnelId) || funnels[0] || null

  const handleAddFunnel = async (name: string) => {
    if (!name.trim()) {
      showError('Pipeline name required', 'Please enter a pipeline name')
      return
    }

    try {
      console.log('Creating pipeline:', name.trim())
      const newPipeline = await createPipeline({
        name: name.trim(),
        isDefault: false, // Don't set as default automatically
      })

      console.log('Pipeline created:', newPipeline)
      console.log('Pipeline ID:', newPipeline.id)
      console.log('Pipeline name:', newPipeline.name)

      // Create default stages for the new pipeline
      const defaultStagesToCreate = [
        { name: 'New', color: '#6B8AFF', order: 0, isDefault: true },
        { name: 'In Progress', color: '#F59E0B', order: 1, isDefault: false },
        { name: 'Negotiation', color: '#8B5CF6', order: 2, isDefault: false },
        { name: 'Closed Won', color: '#10B981', order: 3, isDefault: false, isClosed: true },
        { name: 'Closed Lost', color: '#EF4444', order: 4, isDefault: false, isClosed: true },
      ]

      console.log('Creating default stages for pipeline:', newPipeline.id)
      let stagesCreated = 0
      for (const stageData of defaultStagesToCreate) {
        try {
          const createdStage = await createStage(newPipeline.id, stageData)
          console.log('Stage created:', stageData.name, createdStage.id)
          stagesCreated++
        } catch (stageError) {
          console.error(`Failed to create stage ${stageData.name}:`, stageError)
          // Continue creating other stages even if one fails
        }
      }
      console.log(`Created ${stagesCreated} out of ${defaultStagesToCreate.length} stages`)

      showSuccess(`Pipeline "${newPipeline.name}" created successfully with ${stagesCreated} stages`)
      
      // Wait a bit more for stages to be fully created and indexed in DB
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Refresh pipelines list from API to get the pipeline with stages
      console.log('Refreshing pipelines list to get created pipeline with stages...')
      const pipelines = await getPipelines()
      console.log('Refreshed pipelines:', pipelines.length)
      
      // Find the newly created pipeline
      const createdPipeline = pipelines.find(p => p.id === newPipeline.id)
      if (createdPipeline) {
        console.log('Found created pipeline with stages:', createdPipeline.stages?.length || 0)
      } else {
        console.warn('Created pipeline not found in refreshed list, retrying...')
        // Retry once more
        await new Promise(resolve => setTimeout(resolve, 1000))
        const retryPipelines = await getPipelines()
        const retryPipeline = retryPipelines.find(p => p.id === newPipeline.id)
        if (retryPipeline) {
          console.log('Found pipeline on retry:', retryPipeline.stages?.length || 0, 'stages')
        }
      }
      
      // Update funnels list with all pipelines from API
      const funnelsList: Funnel[] = pipelines.map(p => ({
        id: p.id,
        name: p.name,
      }))
      
      console.log('Updating funnels list:', funnelsList.length, funnelsList)
      setFunnels(funnelsList)
      
      // Select the newly created pipeline
      console.log('Setting currentFunnelId to:', newPipeline.id)
      setCurrentFunnelId(newPipeline.id)
      
      // Force Kanban board to refresh by changing key - this will make it reload pipelines
      setKanbanRefreshKey(prev => {
        const newKey = prev + 1
        console.log('Kanban refresh key updated to:', newKey)
        return newKey
      })
      
      // Close settings modal if open
      setIsSettingsOpen(false)
      console.log('Settings modal closed')
      
      console.log('Pipeline creation completed successfully')
    } catch (error) {
      console.error('Failed to create pipeline:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error details:', {
        message: errorMessage,
        error: error,
        stack: error instanceof Error ? error.stack : undefined
      })
      showError('Failed to create pipeline', errorMessage)
      // Don't close modal on error so user can try again
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

  const handleBulkDelete = () => {
    setDeals(deals.filter(d => !selectedDeals.includes(d.id)))
    setSelectedDeals([])
  }

  const handleBulkChangeStage = (newStage: string) => {
    setDeals(deals.map(d => 
      selectedDeals.includes(d.id) ? { ...d, stage: newStage } : d
    ))
    setSelectedDeals([])
  }

  const { showSuccess, showError } = useToastNotification()
  const [listDeals, setListDeals] = useState<APIDeal[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [selectedPipelineForList, setSelectedPipelineForList] = useState<string | undefined>()
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0) // For forcing Kanban refresh

  // Load deals for list view
  useEffect(() => {
    if (viewMode === 'list' && selectedPipelineForList) {
      setListLoading(true)
      getDeals({ pipelineId: selectedPipelineForList })
        .then((deals) => {
          setListDeals(deals)
        })
        .catch((error) => {
          console.error('Failed to load deals for list:', error)
          setListDeals([])
        })
        .finally(() => {
          setListLoading(false)
        })
    }
  }, [viewMode, selectedPipelineForList])

  // Get default pipeline ID for list view
  useEffect(() => {
    if (viewMode === 'list' && !selectedPipelineForList) {
      getPipelines()
        .then((pipelines) => {
          const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
          if (defaultPipeline) {
            setSelectedPipelineForList(defaultPipeline.id)
          }
        })
        .catch((error) => {
          console.error('Failed to load pipelines for list:', error)
        })
    }
  }, [viewMode, selectedPipelineForList])

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

      // Create deal via API
      const newDeal = await createDeal({
        title: 'New Deal',
        amount: 0,
        pipelineId: defaultPipeline.id,
        stageId: firstStage.id,
      })

      showSuccess('Deal created successfully')
      router.push(`/deals/${newDeal.id}`)
    } catch (error) {
      console.error('Failed to create deal:', error)
      showError('Failed to create deal', error instanceof Error ? error.message : 'Unknown error')
    }
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
                  </div>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Manage your sales pipeline</p>
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditMode(!isEditMode)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
              <Button size="sm" onClick={handleCreateNewDeal}>
                <Plus className="mr-2 h-4 w-4" />
                New Deal
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
                />
              )}
            </div>
          </div>
        ) : (
          listLoading ? (
            <PageSkeleton />
          ) : (
            <DealsListView
              deals={listDeals.map(deal => ({
                id: deal.id,
                title: deal.title,
                client: deal.contact?.fullName || deal.company?.name || 'No client',
                amount: deal.amount || 0,
                stage: deal.stage?.id || 'new',
                assignedTo: deal.assignedTo ? {
                  name: deal.assignedTo.name || 'Unknown',
                  avatar: deal.assignedTo.avatar || deal.assignedTo.name?.substring(0, 2).toUpperCase() || 'U'
                } : { name: 'Unassigned', avatar: 'U' },
                updatedAt: deal.updatedAt || new Date().toISOString(),
              }))}
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
