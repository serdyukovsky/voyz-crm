"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from 'lucide-react'

interface AddTaskStageModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, color: string) => void
}

const colorOptions = [
  { name: "Slate", value: "#64748b" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#10b981" },
  { name: "Emerald", value: "#059669" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
]

export function AddTaskStageModal({ isOpen, onClose, onAdd }: AddTaskStageModalProps) {
  const [stageName, setStageName] = useState("")
  const [selectedColor, setSelectedColor] = useState(colorOptions[0].value)

  if (!isOpen) return null

  const handleSubmit = () => {
    if (stageName.trim()) {
      onAdd(stageName.trim(), selectedColor)
      setStageName("")
      setSelectedColor(colorOptions[0].value)
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md border-border bg-card p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Add Custom Stage</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Stage Name Input */}
        <div className="space-y-2">
          <label htmlFor="stage-name" className="text-sm text-muted-foreground">
            Stage Name
          </label>
          <input
            id="stage-name"
            type="text"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            placeholder="Enter stage name"
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Color
          </label>
          <div className="grid grid-cols-9 gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={`h-8 w-8 rounded-md border-2 transition-all ${
                  selectedColor === color.value 
                    ? "border-foreground scale-110" 
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
                aria-label={`Select ${color.name} color`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            className="flex-1"
            disabled={!stageName.trim()}
          >
            Add Stage
          </Button>
        </div>
      </Card>
    </div>
  )
}
