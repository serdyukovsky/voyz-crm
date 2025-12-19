"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2 } from "lucide-react"
import { getPipelines } from "@/lib/api/pipelines"

interface Pipeline {
  id: string
  name: string
  stages?: Array<{
    id: string
    name: string
    position: number
  }>
}

interface PipelineSelectorProps {
  selectedPipelineId?: string
  onPipelineChange: (pipelineId: string) => void
}

export function PipelineSelector({ selectedPipelineId, onPipelineChange }: PipelineSelectorProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getPipelines()
        setPipelines(data)
        
        // Автоматически выбираем первый pipeline если еще ничего не выбрано
        if (!selectedPipelineId && data.length > 0) {
          onPipelineChange(data[0].id)
        }
      } catch (err) {
        console.error('Failed to load pipelines:', err)
        setError(err instanceof Error ? err.message : 'Failed to load pipelines')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPipelines()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Pipeline *</Label>
        <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading pipelines...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Pipeline *</Label>
        <div className="flex items-center gap-2 p-3 border border-destructive/20 rounded-lg bg-destructive/5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      </div>
    )
  }

  if (pipelines.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Pipeline *</Label>
        <div className="flex items-center gap-2 p-3 border border-yellow-500/20 rounded-lg bg-yellow-500/5">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-600">No pipelines found. Please create a pipeline first.</span>
        </div>
      </div>
    )
  }

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
      <div className="space-y-2">
        <Label htmlFor="pipeline-select">
          Select Pipeline *
        </Label>
        <Select value={selectedPipelineId ?? undefined} onValueChange={onPipelineChange}>
          <SelectTrigger id="pipeline-select" className="bg-background">
            <SelectValue placeholder="Select a pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Deal stages from your CSV will be matched against stages in this pipeline.
        </p>
      </div>

      {selectedPipeline && selectedPipeline.stages && selectedPipeline.stages.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border">
          <Label className="text-xs text-muted-foreground">Available Stages:</Label>
          <div className="flex flex-wrap gap-2">
            {selectedPipeline.stages
              .sort((a, b) => a.position - b.position)
              .map((stage) => (
                <span
                  key={stage.id}
                  className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
                >
                  {stage.name}
                </span>
              ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Stages in your CSV will be matched by name (case-insensitive) to these stages.
          </p>
        </div>
      )}
    </div>
  )
}

