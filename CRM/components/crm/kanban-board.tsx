"use client"

import { useState, useEffect } from "react"
import { DealCard } from "./deal-card"
import { KanbanColumn } from "./kanban-column"
import { AddStageModal } from "./add-stage-modal"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import type { Trigger } from "./trigger-card"

export interface Deal {
  id: string
  title: string
  client: string
  amount: number
  stage: string
  stageName?: string
  assignedTo: {
    name: string
    avatar: string
  }
  updatedAt: string
  contact?: {
    link?: string
    subscriberCount?: string
    directions?: string[]
  }
  tasks?: Array<{
    id: string
    status: string
    deadline: string | null
  }>
}

export interface Stage {
  id: string
  label: string
  color: string
  isCustom?: boolean
  triggers?: Trigger[]
}

const defaultStages: Stage[] = [
  { id: "new", label: "New", color: "#6B7280" },
  { id: "in-progress", label: "In Progress", color: "#3B82F6" },
  { id: "negotiation", label: "Negotiation", color: "#F59E0B" },
  { id: "closed-won", label: "Closed Won", color: "#10B981" },
  { id: "closed-lost", label: "Closed Lost", color: "#EF4444" },
]

interface KanbanBoardProps {
  initialStages?: Stage[]
  initialDeals?: Deal[]
  onStagesChange?: (stages: Stage[]) => void
  onDealsChange?: (deals: Deal[]) => void
  isEditMode?: boolean
}

export function KanbanBoard({ 
  initialStages,
  initialDeals, 
  onStagesChange,
  onDealsChange,
  isEditMode = false
}: KanbanBoardProps = {}) {
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null)
  const [draggedStage, setDraggedStage] = useState<number | null>(null)
  const [deals, setDeals] = useState<Deal[]>(initialDeals || [
    {
      id: "1",
      title: "Enterprise License Agreement",
      client: "Acme Corp",
      amount: 45000,
      stage: "new",
      assignedTo: { name: "John Smith", avatar: "JS" },
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "2",
      title: "Annual SaaS Subscription",
      client: "TechStart Inc",
      amount: 12000,
      stage: "new",
      assignedTo: { name: "Sarah Lee", avatar: "SL" },
      updatedAt: "2024-01-14T16:20:00Z"
    },
    {
      id: "3",
      title: "Platform Integration Services",
      client: "CloudFlow Systems",
      amount: 28000,
      stage: "in-progress",
      assignedTo: { name: "Mike Chen", avatar: "MC" },
      updatedAt: "2024-01-13T09:15:00Z"
    },
    {
      id: "4",
      title: "Premium Support Package",
      client: "DataCo Analytics",
      amount: 8500,
      stage: "in-progress",
      assignedTo: { name: "Emma Wilson", avatar: "EW" },
      updatedAt: "2024-01-12T14:45:00Z"
    },
    {
      id: "5",
      title: "Team Plan Upgrade",
      client: "DesignHub Studio",
      amount: 15000,
      stage: "negotiation",
      assignedTo: { name: "Alex Turner", avatar: "AT" },
      updatedAt: "2024-01-11T11:00:00Z"
    },
    {
      id: "6",
      title: "Custom Development Project",
      client: "InnovateLabs",
      amount: 52000,
      stage: "negotiation",
      assignedTo: { name: "Chris Park", avatar: "CP" },
      updatedAt: "2024-01-10T15:30:00Z"
    },
    {
      id: "7",
      title: "Enterprise Suite License",
      client: "MegaTech Corporation",
      amount: 85000,
      stage: "closed-won",
      assignedTo: { name: "David Kim", avatar: "DK" },
      updatedAt: "2024-01-09T13:20:00Z"
    },
    {
      id: "8",
      title: "Consulting Retainer",
      client: "StartupXYZ",
      amount: 9000,
      stage: "closed-lost",
      assignedTo: { name: "Lisa Brown", avatar: "LB" },
      updatedAt: "2024-01-08T10:10:00Z"
    },
  ])
  const [stages, setStages] = useState<Stage[]>(initialStages || defaultStages)
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false)
  const [insertAfterIndex, setInsertAfterIndex] = useState<number>(-1)

  useEffect(() => {
    if (initialDeals && initialDeals.length > 0) {
      setDeals(initialDeals)
    }
  }, [initialDeals])

  useEffect(() => {
    if (initialStages && initialStages.length > 0) {
      setStages(initialStages)
    }
  }, [initialStages])

  useEffect(() => {
    onStagesChange?.(stages)
  }, [stages, onStagesChange])

  useEffect(() => {
    onDealsChange?.(deals)
  }, [deals, onDealsChange])

  const handleAddStage = (name: string, color: string) => {
    const newStage: Stage = {
      id: `custom-${Date.now()}`,
      label: name,
      color: color,
      isCustom: true,
    }
    if (insertAfterIndex >= 0) {
      const updatedStages = [...stages]
      updatedStages.splice(insertAfterIndex + 1, 0, newStage)
      setStages(updatedStages)
    } else {
      setStages([...stages, newStage])
    }
    setIsAddStageModalOpen(false)
    setInsertAfterIndex(-1)
  }

  const handleOpenAddStageModal = (afterIndex: number) => {
    setInsertAfterIndex(afterIndex)
    setIsAddStageModalOpen(true)
  }

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal)
  }

  const handleDragEnd = () => {
    setDraggedDeal(null)
  }

  const handleDrop = (stageId: string) => {
    if (!draggedDeal) return

    // If dropping in the same stage, do nothing
    if (draggedDeal.stage === stageId) {
      setDraggedDeal(null)
      return
    }

    // Update the deal's stage
    setDeals(deals.map(deal => 
      deal.id === draggedDeal.id 
        ? { ...deal, stage: stageId, updatedAt: new Date().toISOString() }
        : deal
    ))
    
    setDraggedDeal(null)
  }

  const handleStageDragStart = (index: number) => {
    setDraggedStage(index)
  }

  const handleStageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedStage === null || draggedStage === index) return
    
    const newStages = [...stages]
    const [removed] = newStages.splice(draggedStage, 1)
    newStages.splice(index, 0, removed)
    
    setStages(newStages)
    setDraggedStage(index)
  }

  const handleStageDragEnd = () => {
    setDraggedStage(null)
  }

  const handleStageUpdate = (stageId: string, updates: Partial<Stage>) => {
    setStages(stages.map(stage => 
      stage.id === stageId ? { ...stage, ...updates } : stage
    ))
  }

  const handleTriggerAdd = (stageId: string, trigger: Trigger) => {
    setStages(stages.map(stage => 
      stage.id === stageId 
        ? { ...stage, triggers: [...(stage.triggers || []), trigger] }
        : stage
    ))
  }

  const handleTriggerUpdate = (stageId: string, triggerId: string, updates: Partial<Trigger>) => {
    setStages(stages.map(stage => 
      stage.id === stageId
        ? { 
            ...stage, 
            triggers: (stage.triggers || []).map(t => 
              t.id === triggerId ? { ...t, ...updates } : t
            )
          }
        : stage
    ))
  }

  const handleTriggerDelete = (stageId: string, triggerId: string) => {
    setStages(stages.map(stage => 
      stage.id === stageId
        ? { 
            ...stage, 
            triggers: (stage.triggers || []).filter(t => t.id !== triggerId)
          }
        : stage
    ))
  }

  const handleDealAdd = (dealData: Omit<Deal, "id" | "updatedAt">) => {
    const newDeal: Deal = {
      ...dealData,
      id: `deal-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    }
    setDeals([...deals, newDeal])
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage, index) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          deals={isEditMode ? [] : deals.filter((deal) => deal.stage === stage.id)}
          onAddStageClick={() => handleOpenAddStageModal(index)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          isDraggedOver={draggedDeal !== null && draggedDeal.stage !== stage.id}
          isEditMode={isEditMode}
          onStageUpdate={(updates) => handleStageUpdate(stage.id, updates)}
          onTriggerAdd={(trigger) => handleTriggerAdd(stage.id, trigger)}
          onTriggerUpdate={(triggerId, updates) => handleTriggerUpdate(stage.id, triggerId, updates)}
          onTriggerDelete={(triggerId) => handleTriggerDelete(stage.id, triggerId)}
          isStageDragged={draggedStage === index}
          onStageDragStart={() => handleStageDragStart(index)}
          onStageDragOver={(e) => handleStageDragOver(e, index)}
          onStageDragEnd={handleStageDragEnd}
          onDealAdd={handleDealAdd}
        />
      ))}

      {/* Add Stage Button in Edit Mode */}
      {isEditMode && (
        <div className="flex-shrink-0 w-72">
          <div className="mb-3 h-6" />
          <Button
            variant="outline"
            className="w-full h-[500px] border-dashed flex flex-col items-center justify-center gap-2"
            onClick={() => {
              setInsertAfterIndex(stages.length - 1)
              setIsAddStageModalOpen(true)
            }}
          >
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Добавить этап</span>
          </Button>
        </div>
      )}

      <AddStageModal
        isOpen={isAddStageModalOpen}
        onClose={() => setIsAddStageModalOpen(false)}
        onAdd={handleAddStage}
      />
    </div>
  )
}
