"use client"

import { useState, memo, useCallback } from "react"
import { Link } from 'react-router-dom'
import { GripVertical } from 'lucide-react'
import type { Deal, Stage } from "./kanban-board"
import { TaskIndicator } from "./task-indicator"
import { formatSmartDate } from "@/lib/utils/date-formatter"

interface DealCardProps {
  deal: Deal
  stage: Stage
  onDragStart?: (deal: Deal) => void
  onDragEnd?: () => void
}

export const DealCard = memo(function DealCard({ deal, stage, onDragStart, onDragEnd }: DealCardProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    onDragStart?.(deal)
  }, [deal, onDragStart])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.stopPropagation()
    setIsDragging(false)
    onDragEnd?.()
  }, [onDragEnd])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Prevent navigation when clicking on drag handle
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      e.preventDefault()
    }
  }, [])

  return (
    <Link to={`/deals/${deal.id}`} onClick={handleClick}>
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`group cursor-pointer rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm ${
          isDragging ? 'opacity-50 scale-95' : ''
        }`}
      >
        {/* Drag Handle + Title */}
        <div className="flex items-start gap-2 mb-2">
          <div 
            data-drag-handle
            className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing"
            title="Drag to move deal"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <h4 className="flex-1 text-sm font-medium text-card-foreground line-clamp-2 leading-tight">
            {deal.title}
          </h4>
        </div>

        {/* Client Name */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
          {deal.client}
        </p>

        {/* Amount */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm font-semibold text-foreground">
            ${deal.amount.toLocaleString('en-US')}
          </span>
        </div>

        {/* Stage Pill */}
        <div className="mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${stage.color}20`,
              color: stage.color,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: stage.color }}
              aria-hidden="true"
            />
            {stage.label}
          </span>
        </div>

        {/* Footer: Avatar + Updated Time + Task Indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary"
              title={deal.assignedTo.name}
            >
              {deal.assignedTo.avatar}
            </div>
            <span className="text-xs text-muted-foreground">
              {deal.assignedTo.name.split(' ')[0]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatSmartDate(deal.updatedAt)}
            </span>
            <TaskIndicator tasks={deal.tasks} />
          </div>
        </div>
      </div>
    </Link>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  const tasksEqual =
    (prevProps.deal.tasks?.length || 0) === (nextProps.deal.tasks?.length || 0) &&
    (prevProps.deal.tasks?.every((t, i) =>
      t.id === nextProps.deal.tasks?.[i]?.id &&
      t.status === nextProps.deal.tasks?.[i]?.status &&
      t.deadline === nextProps.deal.tasks?.[i]?.deadline
    ) ?? true)

  return (
    prevProps.deal.id === nextProps.deal.id &&
    prevProps.deal.amount === nextProps.deal.amount &&
    prevProps.deal.updatedAt === nextProps.deal.updatedAt &&
    prevProps.stage.id === nextProps.stage.id &&
    prevProps.stage.color === nextProps.stage.color &&
    tasksEqual
  )
})
