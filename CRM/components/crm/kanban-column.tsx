"use client"

import { useState, useMemo } from "react"
import { DealCard } from "./deal-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, GripVertical, Edit2, Check, X } from 'lucide-react'
import type { Stage, Deal } from "./kanban-board"
import type { Trigger } from "./trigger-card"
import { TriggerCard } from "./trigger-card"
import { AddTriggerModal } from "./add-trigger-modal"
import { QuickAddDealModal } from "./quick-add-deal-modal"

interface KanbanColumnProps {
  stage: Stage
  deals: Deal[]
  onAddStageClick?: () => void
  onDragStart?: (deal: Deal) => void
  onDragEnd?: () => void
  onDrop?: (stageId: string) => void
  isDraggedOver?: boolean
  isEditMode?: boolean
  onStageUpdate?: (updates: Partial<Stage>) => void
  onTriggerAdd?: (trigger: Trigger) => void
  onTriggerUpdate?: (triggerId: string, updates: Partial<Trigger>) => void
  onTriggerDelete?: (triggerId: string) => void
  isStageDragged?: boolean
  onStageDragStart?: () => void
  onStageDragOver?: (e: React.DragEvent) => void
  onStageDragEnd?: () => void
  onDealAdd?: (deal: Omit<Deal, "id" | "updatedAt">) => void
}

export function KanbanColumn({ 
  stage, 
  deals, 
  onAddStageClick,
  onDragStart,
  onDragEnd,
  onDrop,
  isDraggedOver = false,
  isEditMode = false,
  onStageUpdate,
  onTriggerAdd,
  onTriggerUpdate,
  onTriggerDelete,
  isStageDragged = false,
  onStageDragStart,
  onStageDragOver,
  onStageDragEnd,
  onDealAdd
}: KanbanColumnProps) {
  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(stage.label)
  const [isAddTriggerModalOpen, setIsAddTriggerModalOpen] = useState(false)
  const [isQuickAddDealModalOpen, setIsQuickAddDealModalOpen] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if leaving the column container itself
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    onDrop?.(stage.id)
  }

  const handleNameSave = () => {
    onStageUpdate?.({ label: editedName })
    setIsEditingName(false)
  }

  const handleNameCancel = () => {
    setEditedName(stage.label)
    setIsEditingName(false)
  }

  const handleAddTrigger = (trigger: Trigger) => {
    onTriggerAdd?.(trigger)
    setIsAddTriggerModalOpen(false)
  }


  return (
    <div 
      className={`flex-shrink-0 w-72 ${isStageDragged ? 'opacity-50' : ''}`}
      draggable={isEditMode}
      onDragStart={isEditMode ? onStageDragStart : undefined}
      onDragOver={isEditMode ? onStageDragOver : undefined}
      onDragEnd={isEditMode ? onStageDragEnd : undefined}
    >
      {/* Column Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditMode && (
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          )}
          <div 
            className="h-2 w-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          {isEditMode && isEditingName ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave()
                  if (e.key === 'Escape') handleNameCancel()
                }}
                onBlur={handleNameSave}
                className="h-6 text-sm flex-1"
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleNameSave}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleNameCancel}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <h3 
              className={`text-sm font-medium text-foreground flex-1 min-w-0 ${isEditMode ? 'cursor-pointer hover:text-primary' : ''}`}
              onDoubleClick={isEditMode ? () => setIsEditingName(true) : undefined}
            >
              {stage.label}
            </h3>
          )}
          {!isEditMode && <span className="text-xs text-muted-foreground">({deals.length})</span>}
        </div>
        {!isEditMode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              ${(totalValue / 1000).toFixed(0)}k
            </span>
            {onAddStageClick && (
              <button
                onClick={onAddStageClick}
                className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors border border-dashed border-border/50 hover:border-border"
                aria-label="Add stage after this column"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Droppable Area */}
      <div 
        className={`space-y-2 min-h-[500px] max-h-[calc(100vh-12rem)] overflow-y-auto rounded-lg border-2 border-dashed transition-all p-2 ${
          isDraggingOver 
            ? 'border-primary bg-primary/5' 
            : 'border-transparent hover:border-border/30'
        }`}
        onDragOver={!isEditMode ? handleDragOver : undefined}
        onDragLeave={!isEditMode ? handleDragLeave : undefined}
        onDrop={!isEditMode ? handleDrop : undefined}
      >
        {isEditMode ? (
          <>
            {/* Add Trigger Button at top */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border mb-3"
              onClick={() => setIsAddTriggerModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Triggers Section */}
            <div className="space-y-2">
              {(stage.triggers || []).map((trigger) => (
                <TriggerCard
                  key={trigger.id}
                  trigger={trigger}
                  isEditMode={isEditMode}
                  onUpdate={(updated) => onTriggerUpdate?.(trigger.id, updated)}
                  onDelete={() => onTriggerDelete?.(trigger.id)}
                />
              ))}
            </div>

            {/* Hint count */}
            {(stage.triggers || []).length > 0 && (
              <div className="text-xs text-muted-foreground mt-3">
                {(stage.triggers || []).length} подсказка{(stage.triggers || []).length > 1 ? 'и' : ''}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Add Deal Button - at the top for non-closed stages */}
            {!['closed-won', 'closed-lost'].includes(stage.id) && (
              <Button
                variant="ghost"
                className="w-full justify-start border border-dashed border-border/50 bg-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-border transition-colors"
                onClick={() => setIsQuickAddDealModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add deal
              </Button>
            )}

            {deals.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                {isDraggingOver ? 'Drop here' : 'No deals'}
              </div>
            )}

            {/* Deal Cards */}
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                stage={stage}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
          </>
        )}
      </div>

      {/* Add Trigger Modal */}
      {isAddTriggerModalOpen && (
        <AddTriggerModal
          isOpen={isAddTriggerModalOpen}
          onClose={() => setIsAddTriggerModalOpen(false)}
          onAdd={handleAddTrigger}
        />
      )}

      {/* Quick Add Deal Modal */}
      {isQuickAddDealModalOpen && !isEditMode && onDealAdd && (
        <QuickAddDealModal
          isOpen={isQuickAddDealModalOpen}
          onClose={() => setIsQuickAddDealModalOpen(false)}
          onSave={(deal) => {
            onDealAdd(deal)
            setIsQuickAddDealModalOpen(false)
          }}
          stageId={stage.id}
          currentUserId={{ name: "Current User", avatar: "CU" }}
        />
      )}
    </div>
  )
}
