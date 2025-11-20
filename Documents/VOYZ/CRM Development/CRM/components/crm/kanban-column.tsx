"use client"

import { useState } from "react"
import { DealCard } from "./deal-card"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import type { Stage, Deal } from "./kanban-board"

interface KanbanColumnProps {
  stage: Stage
  deals: Deal[]
  onAddStageClick?: () => void
  onDragStart?: (deal: Deal) => void
  onDragEnd?: () => void
  onDrop?: (stageId: string) => void
  isDraggedOver?: boolean
}

export function KanbanColumn({ 
  stage, 
  deals, 
  onAddStageClick,
  onDragStart,
  onDragEnd,
  onDrop,
  isDraggedOver = false
}: KanbanColumnProps) {
  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

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

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div 
            className="h-2 w-2 rounded-full" 
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          <h3 className="text-sm font-medium text-foreground">{stage.label}</h3>
          <span className="text-xs text-muted-foreground">({deals.length})</span>
        </div>
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
      </div>

      {/* Droppable Area */}
      <div 
        className={`space-y-2 min-h-[500px] rounded-lg border-2 border-dashed transition-all p-2 ${
          isDraggingOver 
            ? 'border-primary bg-primary/5' 
            : 'border-transparent hover:border-border/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Add Deal Button - at the top for non-closed stages */}
        {!['closed-won', 'closed-lost'].includes(stage.id) && (
          <Button
            variant="ghost"
            className="w-full justify-start border border-dashed border-border/50 bg-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-border transition-colors"
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
        
        {deals.map((deal) => (
          <DealCard 
            key={deal.id}
            deal={deal} 
            stage={stage}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  )
}
