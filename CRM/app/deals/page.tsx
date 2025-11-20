"use client"

import { useState } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { KanbanBoard, Deal, Stage } from "@/components/crm/kanban-board"
import { DealsListView } from "@/components/crm/deals-list-view"
import { PipelineSettingsModal, Funnel } from "@/components/crm/pipeline-settings-modal"
import { DealSourcesPanel, DealSource } from "@/components/crm/deal-sources-panel"
import { Button } from "@/components/ui/button"
import { Plus, Filter, LayoutGrid, List, Settings, ChevronDown, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isFunnelDropdownOpen, setIsFunnelDropdownOpen] = useState(false)
  const [funnels, setFunnels] = useState<Funnel[]>(defaultFunnels)
  const [currentFunnelId, setCurrentFunnelId] = useState("default")
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

  const currentFunnel = funnels.find(f => f.id === currentFunnelId) || funnels[0]

  const handleAddFunnel = (name: string) => {
    const newFunnel: Funnel = {
      id: `funnel-${Date.now()}`,
      name,
    }
    setFunnels([...funnels, newFunnel])
  }

  const handleDeleteFunnel = (funnelId: string) => {
    if (funnelId === "default") return
    setFunnels(funnels.filter(f => f.id !== funnelId))
    if (currentFunnelId === funnelId) {
      setCurrentFunnelId("default")
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

  const handleCreateNewDeal = () => {
    // Current user (default assignee)
    const currentUser = { name: "Current User", avatar: "CU" }
    
    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      title: "",
      client: "",
      amount: 0,
      stage: "new",
      assignedTo: currentUser,
      updatedAt: new Date().toISOString(),
    }
    
    // Save to sessionStorage for DealDetail to access
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`deal-${newDeal.id}`, JSON.stringify(newDeal))
      sessionStorage.setItem(`deal-${newDeal.id}-isNew`, 'true')
    }
    
    setDeals([...deals, newDeal])
    router.push(`/deals/${newDeal.id}`)
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
                  className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
                >
                  {currentFunnel.name}
                  <ChevronDown className="h-5 w-5" />
                </button>
                
                {isFunnelDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsFunnelDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border/50 rounded-lg shadow-lg z-20 overflow-hidden">
                      {funnels.map((funnel) => (
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
                      ))}
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
                  className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
                >
                  {currentFunnel.name}
                  <ChevronDown className="h-5 w-5" />
                </button>
              
              {isFunnelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFunnelDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border/50 rounded-lg shadow-lg z-20 overflow-hidden">
                    {funnels.map((funnel) => (
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
                    ))}
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
              <KanbanBoard
                initialStages={stages}
                initialDeals={deals}
                onStagesChange={setStages}
                onDealsChange={setDeals}
                isEditMode={isEditMode}
              />
            </div>
          </div>
        ) : (
          <DealsListView
            deals={deals}
            selectedDeals={selectedDeals}
            onSelectDeals={setSelectedDeals}
            onBulkDelete={handleBulkDelete}
            onBulkChangeStage={handleBulkChangeStage}
            stages={stages}
          />
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
