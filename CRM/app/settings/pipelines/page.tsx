"use client"

import { useState, useEffect } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChevronLeft, Plus, Edit, Trash2, GripVertical, X } from 'lucide-react'
import Link from "next/link"
import { getPipelines, createPipeline, updatePipeline, createStage, updateStage, deleteStage, type Pipeline, type Stage, type CreatePipelineDto, type CreateStageDto } from "@/lib/api/pipelines"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { PageSkeleton } from "@/components/shared/loading-skeleton"

export default function PipelinesPage() {
  const { showSuccess, showError } = useToastNotification()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [isPipelineDialogOpen, setIsPipelineDialogOpen] = useState(false)
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [editingStage, setEditingStage] = useState<{ stage: Stage | null; pipelineId: string } | null>(null)
  const [deletingStage, setDeletingStage] = useState<Stage | null>(null)
  const [pipelineForm, setPipelineForm] = useState<CreatePipelineDto>({ name: '', description: '' })
  const [stageForm, setStageForm] = useState<CreateStageDto>({ name: '', order: 0, color: '#6B7280' })

  useEffect(() => {
    loadPipelines()
  }, [])

  const loadPipelines = async () => {
    try {
      setLoading(true)
      const data = await getPipelines()
      setPipelines(data)
    } catch (error) {
      showError('Failed to load pipelines', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePipeline = async () => {
    try {
      await createPipeline(pipelineForm)
      showSuccess('Pipeline created successfully')
      setIsPipelineDialogOpen(false)
      setPipelineForm({ name: '', description: '' })
      loadPipelines()
    } catch (error) {
      showError('Failed to create pipeline', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleUpdatePipeline = async () => {
    if (!editingPipeline) return

    try {
      await updatePipeline(editingPipeline.id, pipelineForm)
      showSuccess('Pipeline updated successfully')
      setIsPipelineDialogOpen(false)
      setEditingPipeline(null)
      setPipelineForm({ name: '', description: '' })
      loadPipelines()
    } catch (error) {
      showError('Failed to update pipeline', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleCreateStage = async () => {
    if (!editingStage) return

    try {
      // Calculate order if not provided
      const pipeline = pipelines.find(p => p.id === editingStage.pipelineId)
      const maxOrder = pipeline?.stages.length ? Math.max(...pipeline.stages.map(s => s.order)) : -1
      const order = stageForm.order || maxOrder + 1

      await createStage(editingStage.pipelineId, { ...stageForm, order })
      showSuccess('Stage created successfully')
      setIsStageDialogOpen(false)
      setEditingStage(null)
      setStageForm({ name: '', order: 0, color: '#6B7280' })
      loadPipelines()
    } catch (error) {
      showError('Failed to create stage', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleUpdateStage = async () => {
    if (!editingStage?.stage) return

    try {
      await updateStage(editingStage.stage.id, stageForm)
      showSuccess('Stage updated successfully')
      setIsStageDialogOpen(false)
      setEditingStage(null)
      setStageForm({ name: '', order: 0, color: '#6B7280' })
      loadPipelines()
    } catch (error) {
      showError('Failed to update stage', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleDeleteStage = async () => {
    if (!deletingStage) return

    try {
      await deleteStage(deletingStage.id)
      showSuccess('Stage deleted successfully')
      setDeletingStage(null)
      loadPipelines()
    } catch (error) {
      showError('Failed to delete stage', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const openPipelineDialog = (pipeline?: Pipeline) => {
    if (pipeline) {
      setEditingPipeline(pipeline)
      setPipelineForm({ name: pipeline.name, description: pipeline.description || '' })
    } else {
      setEditingPipeline(null)
      setPipelineForm({ name: '', description: '' })
    }
    setIsPipelineDialogOpen(true)
  }

  const openStageDialog = (pipelineId: string, stage?: Stage) => {
    if (stage) {
      setEditingStage({ stage, pipelineId })
      setStageForm({ name: stage.name, order: stage.order, color: stage.color })
    } else {
      const pipeline = pipelines.find(p => p.id === pipelineId)
      const maxOrder = pipeline?.stages.length ? Math.max(...pipeline.stages.map(s => s.order)) : -1
      setEditingStage({ stage: null, pipelineId })
      setStageForm({ name: '', order: maxOrder + 1, color: '#6B7280' })
    }
    setIsStageDialogOpen(true)
  }

  if (loading) {
    return (
      <CRMLayout>
        <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
          <PageSkeleton />
        </div>
      </CRMLayout>
    )
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pipelines & Stages</h1>
            <p className="text-sm text-muted-foreground">Manage your sales pipelines and stages</p>
          </div>
          <Button onClick={() => openPipelineDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Pipeline
          </Button>
        </div>

        <div className="space-y-6">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>{pipeline.name}</CardTitle>
                    {pipeline.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    {!pipeline.isActive && (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPipelineDialog(pipeline)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openStageDialog(pipeline.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stage
                    </Button>
                  </div>
                </div>
                {pipeline.description && (
                  <CardDescription>{pipeline.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pipeline.stages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stages yet. Add your first stage to get started.</p>
                  ) : (
                    pipeline.stages
                      .sort((a, b) => a.order - b.order)
                      .map((stage) => (
                        <div
                          key={stage.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="font-medium">{stage.name}</span>
                            {stage.isDefault && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                            {stage.isClosed && (
                              <Badge variant="outline" className="text-xs">Closed</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openStageDialog(pipeline.id, stage)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingStage(stage)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {pipelines.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No pipelines yet</p>
                <Button onClick={() => openPipelineDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Pipeline
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pipeline Dialog */}
        <Dialog open={isPipelineDialogOpen} onOpenChange={setIsPipelineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPipeline ? 'Edit Pipeline' : 'Create Pipeline'}
              </DialogTitle>
              <DialogDescription>
                {editingPipeline ? 'Update pipeline details' : 'Create a new sales pipeline'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={pipelineForm.name}
                  onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                  placeholder="Sales Pipeline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={pipelineForm.description}
                  onChange={(e) => setPipelineForm({ ...pipelineForm, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={pipelineForm.isDefault || false}
                  onCheckedChange={(checked) => setPipelineForm({ ...pipelineForm, isDefault: checked })}
                />
                <Label htmlFor="isDefault">Set as default pipeline</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPipelineDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingPipeline ? handleUpdatePipeline : handleCreatePipeline}>
                {editingPipeline ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stage Dialog */}
        <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStage?.stage ? 'Edit Stage' : 'Create Stage'}
              </DialogTitle>
              <DialogDescription>
                {editingStage?.stage ? 'Update stage details' : 'Add a new stage to the pipeline'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stageName">Name</Label>
                <Input
                  id="stageName"
                  value={stageForm.name}
                  onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                  placeholder="New Stage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={stageForm.order}
                  onChange={(e) => setStageForm({ ...stageForm, order: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={stageForm.color}
                    onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={stageForm.color}
                    onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                    placeholder="#6B7280"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={stageForm.isDefault || false}
                  onCheckedChange={(checked) => setStageForm({ ...stageForm, isDefault: checked })}
                />
                <Label htmlFor="isDefault">Set as default stage</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isClosed"
                  checked={stageForm.isClosed || false}
                  onCheckedChange={(checked) => setStageForm({ ...stageForm, isClosed: checked })}
                />
                <Label htmlFor="isClosed">Closed stage (won/lost)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingStage?.stage ? handleUpdateStage : handleCreateStage}>
                {editingStage?.stage ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Stage Confirmation */}
        <AlertDialog open={!!deletingStage} onOpenChange={(open) => !open && setDeletingStage(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Stage</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingStage?.name}"? This action cannot be undone.
                Make sure there are no deals in this stage before deleting.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteStage} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CRMLayout>
  )
}

