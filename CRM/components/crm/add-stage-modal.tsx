"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface AddStageModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, color: string) => void
}

const predefinedColors = [
  "#6B7280", // Gray
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Green
  "#14B8A6", // Teal
  "#EF4444", // Red
]

export function AddStageModal({ isOpen, onClose, onAdd }: AddStageModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [selectedColor, setSelectedColor] = useState(predefinedColors[0])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAdd(name.trim(), selectedColor)
      setName("")
      setSelectedColor(predefinedColors[0])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">{t('pipeline.addCustomStage')}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Stage Name */}
          <div className="space-y-2">
            <Label htmlFor="stage-name" className="text-sm font-medium text-foreground">
              {t('pipeline.stageName')}
            </Label>
            <Input
              id="stage-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('pipeline.stageNamePlaceholder')}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t('pipeline.stageColor')}
            </Label>
            <div className="flex gap-2 flex-wrap">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="h-8 w-8 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: selectedColor === color ? color : 'transparent',
                    boxShadow: selectedColor === color ? `0 0 0 2px ${color}40` : 'none',
                  }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="flex-1"
            >
              {t('pipeline.addStage')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
