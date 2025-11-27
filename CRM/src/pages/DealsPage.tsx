import { useState, useEffect, lazy, Suspense } from "react"
import { useNavigate } from 'react-router-dom'
import { CRMLayout } from "@/components/crm/layout"
import { KanbanBoard, Deal, Stage } from "@/components/crm/kanban-board"
import { DealsListView } from "@/components/crm/deals-list-view"
import { PipelineSettingsModal, Funnel } from "@/components/crm/pipeline-settings-modal"
import { DealSourcesPanel, DealSource } from "@/components/crm/deal-sources-panel"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Filter, LayoutGrid, List, Settings, ChevronDown, ArrowLeft, CheckCircle2, ArrowUpDown, X, Building2, User } from 'lucide-react'
import { PageSkeleton, CardSkeleton } from "@/components/shared/loading-skeleton"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { usePipelines, useCreatePipeline } from "@/hooks/use-pipelines"
import { useCreateDeal } from "@/hooks/use-deals"
import { useCompanies } from "@/hooks/use-companies"
import { useContacts } from "@/hooks/use-contacts"
import { getDeals } from "@/lib/api/deals"
import { getPipelines } from "@/lib/api/pipelines"
import { useTranslation } from "@/lib/i18n/i18n-context"

// Lazy load heavy kanban board component (998 lines)
const DealsKanbanBoard = lazy(() => import("@/components/crm/deals-kanban-board").then(m => ({ default: m.DealsKanbanBoard })))

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
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isFunnelDropdownOpen, setIsFunnelDropdownOpen] = useState(false)
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

  // Используем React Query для загрузки пайплайнов
  const { data: pipelines = [], isLoading: pipelinesLoading, error: pipelinesError } = usePipelines()
  const createPipelineMutation = useCreatePipeline()
  const createDealMutation = useCreateDeal()
  const { data: companies = [] } = useCompanies()
  const { data: contacts = [] } = useContacts()

  // Преобразуем пайплайны в воронки
  const funnelsList: Funnel[] = pipelines.map(p => ({
    id: p.id,
    name: p.name,
  }))

  // Устанавливаем дефолтный пайплайн при загрузке
  useEffect(() => {
    if (funnelsList.length > 0 && !currentFunnelId) {
      const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
      if (defaultPipeline) {
        setCurrentFunnelId(defaultPipeline.id)
      }
    }
  }, [pipelines, funnelsList.length, currentFunnelId])

  // Обработка ошибок авторизации
  useEffect(() => {
    if (pipelinesError && pipelinesError instanceof Error && (pipelinesError.message === 'UNAUTHORIZED' || pipelinesError.message.includes('401'))) {
      console.warn('Authentication failed, redirecting to login')
      navigate('/login')
    }
  }, [pipelinesError, navigate])

  const currentFunnel = funnelsList.find(f => f.id === currentFunnelId) || funnelsList[0] || null

  const handleAddFunnel = async (name: string) => {
    try {
      const newPipeline = await createPipelineMutation.mutateAsync({ name, isDefault: false })
      const updatedFunnels = [...funnelsList, { id: newPipeline.id, name: newPipeline.name }]
      if (updatedFunnels.length === 1) {
        setCurrentFunnelId(newPipeline.id)
      }
      showSuccess('Pipeline created successfully')
    } catch (error) {
      console.error('Failed to create pipeline:', error)
      showError('Failed to create pipeline', 'Please try again')
    }
  }

  const handleAddFunnelOld = async (name: string) => {
    if (!name.trim()) {
      showError('Pipeline name required', 'Please enter a pipeline name')
      return
    }

    try {
      console.log('Creating pipeline:', name.trim())
      const newPipeline = await createPipeline({
        name: name.trim(),
        isDefault: false,
      })

      console.log('Pipeline created:', newPipeline)

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
        }
      }
      console.log(`Created ${stagesCreated} out of ${defaultStagesToCreate.length} stages`)

      showSuccess(`Pipeline "${newPipeline.name}" created successfully with ${stagesCreated} stages`)
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('Refreshing pipelines list to get created pipeline with stages...')
      const pipelines = await getPipelines()
      console.log('Refreshed pipelines:', pipelines.length)
      
      const createdPipeline = pipelines.find(p => p.id === newPipeline.id)
      if (createdPipeline) {
        console.log('Found created pipeline with stages:', createdPipeline.stages?.length || 0)
      } else {
        console.warn('Created pipeline not found in refreshed list, retrying...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        const retryPipelines = await getPipelines()
        const retryPipeline = retryPipelines.find(p => p.id === newPipeline.id)
        if (retryPipeline) {
          console.log('Found pipeline on retry:', retryPipeline.stages?.length || 0, 'stages')
        }
      }
      
      const funnelsList: Funnel[] = pipelines.map(p => ({
        id: p.id,
        name: p.name,
      }))
      
      console.log('Updating funnels list:', funnelsList.length, funnelsList)
      // funnels обновляются автоматически через React Query
      
      console.log('Setting currentFunnelId to:', newPipeline.id)
      setCurrentFunnelId(newPipeline.id)
      
      setKanbanRefreshKey(prev => {
        const newKey = prev + 1
        console.log('Kanban refresh key updated to:', newKey)
        return newKey
      })
      
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
    }
  }

  const handleDeleteFunnel = async (funnelId: string) => {
    const funnel = funnelsList.find(f => f.id === funnelId)
    if (!funnel) return
    
    try {
      // Удаление обрабатывается через React Query мутацию
      // funnels обновятся автоматически после инвалидации кэша
      
      if (currentFunnelId === funnelId) {
        const remainingPipelines = funnelsList.filter(f => f.id !== funnelId)
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
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0)
  
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
  }>({})
  const [sort, setSort] = useState<{ field: 'amount' | 'updatedAt'; direction: 'asc' | 'desc' }>({ 
    field: 'updatedAt', 
    direction: 'desc' 
  })
  
  const hasActiveFilters = Object.keys(filters).length > 0
  const clearFilters = () => setFilters({})

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

  const handleCreateNewDeal = async (stageId?: string) => {
    try {
      if (!currentFunnelId) {
        showError('No pipeline selected', 'Please select or create a pipeline first.')
        return
      }
      
      const currentFunnel = pipelines.find(p => p.id === currentFunnelId)
      if (!currentFunnel || !currentFunnel.stages || currentFunnel.stages.length === 0) {
        showError('No pipeline available', 'Please create a pipeline with stages first')
        return
      }

      // Use provided stageId or default to first stage
      const targetStageId = stageId || currentFunnel.stages.sort((a, b) => a.order - b.order)[0].id

      const newDeal = await createDealMutation.mutateAsync({
        title: 'New Deal',
        amount: 0,
        pipelineId: currentFunnelId,
        stageId: targetStageId,
        status: 'open',
      })

      showSuccess('Deal created successfully')
      navigate(`/deals/${newDeal.id}`)
    } catch (error) {
      console.error('Failed to create deal:', error)
      showError('Failed to create deal', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return (
    <CRMLayout>
      <div className="h-[calc(100vh-3rem)] flex flex-col px-6 py-6">
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
                      {funnelsList.length === 0 ? (
                        <div className="px-4 py-2.5 text-sm text-muted-foreground">
                          No pipelines found
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
                    {funnelsList.length === 0 ? (
                      <div className="px-4 py-2.5 text-sm text-muted-foreground">
                        No pipelines found
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
            <Select
              value={`${sort.field}-${sort.direction}`}
              onValueChange={(value) => {
                const [field, direction] = value.split('-') as ['amount' | 'updatedAt', 'asc' | 'desc']
                setSort({ field, direction })
              }}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount-desc">Amount: High to Low</SelectItem>
                <SelectItem value="amount-asc">Amount: Low to High</SelectItem>
                <SelectItem value="updatedAt-desc">Last Update: Newest</SelectItem>
                <SelectItem value="updatedAt-asc">Last Update: Oldest</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            )}
              <Button size="sm" onClick={handleCreateNewDeal}>
                <Plus className="mr-2 h-4 w-4" />
                New Deal
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
                  <label className="text-xs text-muted-foreground mb-2 block">Company</label>
                  <Select
                    value={filters.companyId || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, companyId: value === 'all' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <Building2 className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Contact</label>
                  <Select
                    value={filters.contactId || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, contactId: value === 'all' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <User className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="All contacts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All contacts</SelectItem>
                      {contacts.map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Amount Range</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.amountMin || ''}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        amountMin: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.amountMax || ''}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        amountMax: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Updated After</label>
                  <Input
                    type="date"
                    value={filters.updatedAfter || ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      updatedAfter: e.target.value || undefined 
                    })}
                    className="h-9"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Updated Before</label>
                  <Input
                    type="date"
                    value={filters.updatedBefore || ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      updatedBefore: e.target.value || undefined 
                    })}
                    className="h-9"
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
                <Suspense fallback={<CardSkeleton className="h-[600px]" />}>
                  <DealsKanbanBoard 
                    key={kanbanRefreshKey} 
                    pipelineId={currentFunnelId && currentFunnelId !== "" ? currentFunnelId : undefined}
                    showFilters={showFilters}
                    filters={filters}
                    sort={sort}
                    onFiltersChange={setFilters}
                    onSortChange={setSort}
                    onAddDeal={handleCreateNewDeal}
                  />
                </Suspense>
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
            />
          )
          )}
        </div>

        <PipelineSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          stages={stages}
          onUpdateStages={handleUpdateStages}
          funnels={funnelsList}
          currentFunnelId={currentFunnelId}
          onSelectFunnel={setCurrentFunnelId}
          onAddFunnel={handleAddFunnel}
          onDeleteFunnel={handleDeleteFunnel}
        />

      </div>
    </CRMLayout>
  )
}
