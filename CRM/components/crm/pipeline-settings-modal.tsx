"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, GripVertical, Trash2, Edit2 } from 'lucide-react'
import { Stage } from "./kanban-board"

interface PipelineSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  stages: Stage[]
  onUpdateStages: (stages: Stage[]) => void
  funnels: Funnel[]
  currentFunnelId: string
  onSelectFunnel: (funnelId: string) => void
  onAddFunnel: (name: string) => Promise<void> | void
  onDeleteFunnel: (funnelId: string) => void
}

export interface Funnel {
  id: string
  name: string
}

export function PipelineSettingsModal({
  isOpen,
  onClose,
  stages,
  onUpdateStages,
  funnels,
  currentFunnelId,
  onSelectFunnel,
  onAddFunnel,
  onDeleteFunnel,
}: PipelineSettingsModalProps) {
  const [localStages, setLocalStages] = useState<Stage[]>(stages)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingColor, setEditingColor] = useState("")
  const [newFunnelName, setNewFunnelName] = useState("")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false)

  // Update localStages when stages prop changes
  useEffect(() => {
    setLocalStages(stages)
  }, [stages])

  if (!isOpen) return null

  const handleSave = () => {
    onUpdateStages(localStages)
    onClose()
  }

  const handleAddStage = () => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      label: "New Stage",
      color: "#6B7280",
      isCustom: true,
    }
    setLocalStages([...localStages, newStage])
  }

  const handleDeleteStage = (stageId: string) => {
    setLocalStages(localStages.filter(s => s.id !== stageId))
  }

  const handleEditStage = (stage: Stage) => {
    setEditingStageId(stage.id)
    setEditingName(stage.label)
    setEditingColor(stage.color)
  }

  const handleSaveEdit = () => {
    if (editingStageId) {
      setLocalStages(localStages.map(s =>
        s.id === editingStageId ? { ...s, label: editingName, color: editingColor } : s
      ))
      setEditingStageId(null)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const newStages = [...localStages]
    const [removed] = newStages.splice(draggedIndex, 1)
    newStages.splice(index, 0, removed)
    
    setLocalStages(newStages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleAddFunnel = async () => {
    const name = newFunnelName.trim()
    if (!name) {
      return
    }

    try {
      setIsCreatingPipeline(true)
      console.log('Modal: Calling onAddFunnel with name:', name)
      const result = onAddFunnel(name)
      // Handle both async and sync functions
      if (result instanceof Promise) {
        await result
      }
      console.log('Modal: onAddFunnel completed')
      setNewFunnelName("")
    } catch (error) {
      console.error('Modal: Error in handleAddFunnel:', error)
      // Error is already handled in parent component
    } finally {
      setIsCreatingPipeline(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border/40 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h2 className="text-lg font-semibold text-foreground">Pipeline Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Funnels Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Funnels</h3>
            <div className="space-y-2 mb-3">
              {funnels.map((funnel) => (
                <div
                  key={funnel.id}
                  className={`flex items-center justify-between px-3 py-2 rounded border ${
                    funnel.id === currentFunnelId
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/40 hover:bg-surface/50"
                  } transition-colors cursor-pointer`}
                  onClick={() => onSelectFunnel(funnel.id)}
                >
                  <span className="text-sm text-foreground">{funnel.name}</span>
                  {funnel.id !== "default" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteFunnel(funnel.id)
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New funnel name..."
                value={newFunnelName}
                onChange={(e) => setNewFunnelName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreatingPipeline) {
                    handleAddFunnel()
                  }
                }}
                disabled={isCreatingPipeline}
              />
              <Button 
                onClick={handleAddFunnel} 
                size="sm"
                disabled={isCreatingPipeline || !newFunnelName.trim()}
              >
                {isCreatingPipeline ? (
                  <span className="text-xs">Creating...</span>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Stages Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Stages</h3>
            <div className="space-y-2 mb-3">
              {localStages.map((stage, index) => (
                <div
                  key={stage.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-3 py-2 rounded border border-border/40 bg-surface hover:bg-surface/70 transition-colors ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  
                  {editingStageId === stage.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                      />
                      <input
                        type="color"
                        value={editingColor}
                        onChange={(e) => setEditingColor(e.target.value)}
                        className="w-10 h-8 rounded border border-border/40 cursor-pointer"
                      />
                      <Button onClick={handleSaveEdit} size="sm" variant="ghost">
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="flex-1 text-sm text-foreground">{stage.label}</span>
                      <button
                        onClick={() => handleEditStage(stage)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={handleAddStage} variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
