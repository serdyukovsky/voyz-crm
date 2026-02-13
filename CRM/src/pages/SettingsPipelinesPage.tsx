import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
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
import { ChevronLeft, Plus, Edit, Trash2, GripVertical } from 'lucide-react'
import { getPipelines, createPipeline, updatePipeline, createStage, updateStage, deleteStage, reorderStages, type Pipeline, type Stage, type CreatePipelineDto, type CreateStageDto } from "@/lib/api/pipelines"
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
  const [dragState, setDragState] = useState<{ pipelineId: string; dragIndex: number } | null>(null)
  const [pipelineForm, setPipelineForm] = useState<CreatePipelineDto>({ name: '', description: '' })
  const [stageForm, setStageForm] = useState<CreateStageDto>({ name: '', order: 0, color: '#6B7280', type: 'OPEN' as const })

  useEffect(() => {
    loadPipelines()
  }, [])

  const loadPipelines = async () => {
    try {
      setLoading(true)
      const data = await getPipelines()
      setPipelines(data)
    } catch (error) {
      // Don't show error if unauthorized - redirect will happen
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        return // Let the redirect happen
      }
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
      const pipeline = pipelines.find(p => p.id === editingStage.pipelineId)
      const maxOrder = pipeline?.stages.length ? Math.max(...pipeline.stages.map(s => s.order)) : -1
      const order = stageForm.order || maxOrder + 1

      await createStage(editingStage.pipelineId, { ...stageForm, order })
      showSuccess('Stage created successfully')
      setIsStageDialogOpen(false)
      setEditingStage(null)
      setStageForm({ name: '', order: 0, color: '#6B7280', type: 'OPEN' as const })
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
      setStageForm({ name: '', order: 0, color: '#6B7280', type: 'OPEN' as const })
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
      setStageForm({ name: stage.name, order: stage.order, color: stage.color, type: stage.type || 'OPEN' })
    } else {
      const pipeline = pipelines.find(p => p.id === pipelineId)
      const maxOrder = pipeline?.stages.length ? Math.max(...pipeline.stages.map(s => s.order)) : -1
      setEditingStage({ stage: null, pipelineId })
      setStageForm({ name: '', order: maxOrder + 1, color: '#6B7280', type: 'OPEN' as const })
    }
    setIsStageDialogOpen(true)
  }

  const handleDragStart = (pipelineId: string, index: number) => {
    setDragState({ pipelineId, dragIndex: index })
  }

  const handleDragOver = (e: React.DragEvent, pipelineId: string, index: number) => {
    e.preventDefault()
    if (!dragState || dragState.pipelineId !== pipelineId || dragState.dragIndex === index) return

    const pipeline = pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return

    const newStages = [...pipeline.stages].sort((a, b) => a.order - b.order)
    const [removed] = newStages.splice(dragState.dragIndex, 1)
    newStages.splice(index, 0, removed)

    // Update local state immediately for smooth UX
    setPipelines(pipelines.map(p => {
      if (p.id !== pipelineId) return p
      return { ...p, stages: newStages.map((s, i) => ({ ...s, order: i })) }
    }))
    setDragState({ pipelineId, dragIndex: index })
  }

  const handleDragEnd = async () => {
    if (!dragState) return
    const pipeline = pipelines.find(p => p.id === dragState.pipelineId)
    if (!pipeline) { setDragState(null); return }

    try {
      const stageOrders = pipeline.stages
        .sort((a, b) => a.order - b.order)
        .map((s, i) => ({ id: s.id, order: i }))
      await reorderStages(dragState.pipelineId, stageOrders)
    } catch (error) {
      showError('Не удалось сохранить порядок', error instanceof Error ? error.message : 'Ошибка')
      loadPipelines() // Revert on error
    }
    setDragState(null)
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
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Воронки и этапы</h1>
            <p className="text-sm text-muted-foreground">Управление воронками продаж и этапами</p>
          </div>
          <Button onClick={() => openPipelineDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Новая воронка
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
                      Добавить этап
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
                    <p className="text-sm text-muted-foreground">Этапов пока нет. Добавьте первый этап.</p>
                  ) : (
                    pipeline.stages
                      .sort((a, b) => a.order - b.order)
                      .map((stage, idx) => (
                        <div
                          key={stage.id}
                          draggable
                          onDragStart={() => handleDragStart(pipeline.id, idx)}
                          onDragOver={(e) => handleDragOver(e, pipeline.id, idx)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing ${
                            dragState?.pipelineId === pipeline.id && dragState?.dragIndex === idx ? 'opacity-50' : ''
                          }`}
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
                            {stage.type === 'WON' && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">Выиграна</Badge>
                            )}
                            {stage.type === 'LOST' && (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-600">Проиграна</Badge>
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
                <p className="text-muted-foreground mb-4">Воронок пока нет</p>
                <Button onClick={() => openPipelineDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первую воронку
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={isPipelineDialogOpen} onOpenChange={setIsPipelineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPipeline ? 'Редактировать воронку' : 'Создать воронку'}
              </DialogTitle>
              <DialogDescription>
                {editingPipeline ? 'Обновление воронки' : 'Создание новой воронки продаж'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={pipelineForm.name}
                  onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                  placeholder="Воронка продаж"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={pipelineForm.description}
                  onChange={(e) => setPipelineForm({ ...pipelineForm, description: e.target.value })}
                  placeholder="Описание (необязательно)"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={pipelineForm.isDefault || false}
                  onCheckedChange={(checked) => setPipelineForm({ ...pipelineForm, isDefault: checked })}
                />
                <Label htmlFor="isDefault">Воронка по умолчанию</Label>
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

        <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStage?.stage ? 'Редактировать этап' : 'Создать этап'}
              </DialogTitle>
              <DialogDescription>
                {editingStage?.stage ? 'Обновление этапа' : 'Добавление нового этапа в воронку'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stageName">Name</Label>
                <Input
                  id="stageName"
                  value={stageForm.name}
                  onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                  placeholder="Новый этап"
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
                <Label htmlFor="isDefault">Этап по умолчанию</Label>
              </div>
              <div className="space-y-2">
                <Label>Тип этапа</Label>
                <div className="flex gap-2">
                  {(['OPEN', 'WON', 'LOST'] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={stageForm.type === t ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStageForm({ ...stageForm, type: t })}
                      className={
                        stageForm.type === t
                          ? t === 'WON' ? 'bg-green-600 hover:bg-green-700' : t === 'LOST' ? 'bg-red-600 hover:bg-red-700' : ''
                          : ''
                      }
                    >
                      {t === 'OPEN' ? 'Открытый' : t === 'WON' ? 'Выиграна' : 'Проиграна'}
                    </Button>
                  ))}
                </div>
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

        <AlertDialog open={!!deletingStage} onOpenChange={(open) => !open && setDeletingStage(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить этап</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить "{deletingStage?.name}"? Это действие нельзя отменить.
                Убедитесь, что в этом этапе нет сделок.
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

