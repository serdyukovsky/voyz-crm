"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Plus, Send, Link as LinkIcon } from "lucide-react"

export interface DealSource {
  id: string
  name: string
  type: "unsorted" | "duplicate_control" | "messenger" | "widget"
  enabled: boolean
  description?: string
}

interface DealSourcesPanelProps {
  sources: DealSource[]
  onUpdateSource: (sourceId: string, updates: Partial<DealSource>) => void
  onAddSource: () => void
}

export function DealSourcesPanel({ sources, onUpdateSource, onAddSource }: DealSourcesPanelProps) {
  return (
    <div className="w-80 flex-shrink-0 border-r border-border/50 pr-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">ИСТОЧНИКИ СДЕЛОК</h3>
      
      <div className="space-y-3">
        {sources.map((source) => (
          <Card key={source.id} className="p-3">
            <div className="space-y-2">
              {source.type === "unsorted" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`source-${source.id}`} className="text-sm font-medium">
                      Неразобранное
                    </Label>
                    <Switch
                      id={`source-${source.id}`}
                      checked={source.enabled}
                      onCheckedChange={(checked) => onUpdateSource(source.id, { enabled: checked })}
                    />
                  </div>
                  {source.description && (
                    <p className="text-xs text-muted-foreground">{source.description}</p>
                  )}
                </>
              )}

              {source.type === "duplicate_control" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`source-${source.id}`} className="text-sm font-medium">
                      Контроль дублей
                    </Label>
                    <Switch
                      id={`source-${source.id}`}
                      checked={source.enabled}
                      onCheckedChange={(checked) => onUpdateSource(source.id, { enabled: checked })}
                    />
                  </div>
                  {source.description && (
                    <p className="text-xs text-muted-foreground">{source.description}</p>
                  )}
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                    Настроить правила
                  </Button>
                </>
              )}

              {(source.type === "messenger" || source.type === "widget") && (
                <div className="flex items-center gap-2">
                  {source.type === "messenger" ? (
                    <Send className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <div className="h-4 w-4 rounded bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">
                      WZ
                    </div>
                  )}
                  <span className="text-sm text-foreground">{source.name}</span>
                </div>
              )}
            </div>
          </Card>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={onAddSource}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>
    </div>
  )
}

