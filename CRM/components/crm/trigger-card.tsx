"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, X, Edit2, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface Trigger {
  id: string
  type: "on_create" | "on_transition" | "on_field_change"
  condition?: string
  action: "create_task" | "send_email" | "assign_user" | "update_field"
  taskTitle?: string
  taskDescription?: string
  assignedTo?: string
  fieldName?: string
  fieldValue?: string
}

interface TriggerCardProps {
  trigger: Trigger
  isEditMode: boolean
  onUpdate?: (trigger: Trigger) => void
  onDelete?: (triggerId: string) => void
}

export function TriggerCard({ trigger, isEditMode, onUpdate, onDelete }: TriggerCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTrigger, setEditedTrigger] = useState(trigger)

  const handleSave = () => {
    onUpdate?.(editedTrigger)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedTrigger(trigger)
    setIsEditing(false)
  }

  const getTriggerTypeLabel = (type: string) => {
    switch (type) {
      case "on_create":
        return "После создания в этапе"
      case "on_transition":
        return "После перехода в этап"
      case "on_field_change":
        return "После изменения поля"
      default:
        return type
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create_task":
        return "Создать задачу"
      case "send_email":
        return "Отправить email"
      case "assign_user":
        return "Назначить пользователя"
      case "update_field":
        return "Обновить поле"
      default:
        return action
    }
  }

  if (isEditing) {
    return (
      <Card className="p-3 border-green-500/20 bg-green-500/5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 dark:border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Редактирование триггера
            </Badge>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleSave}>
                Сохранить
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип триггера</label>
              <Select
                value={editedTrigger.type}
                onValueChange={(value: any) => setEditedTrigger({ ...editedTrigger, type: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_create">После создания в этапе</SelectItem>
                  <SelectItem value="on_transition">После перехода в этап</SelectItem>
                  <SelectItem value="on_field_change">После изменения поля</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Действие</label>
              <Select
                value={editedTrigger.action}
                onValueChange={(value: any) => setEditedTrigger({ ...editedTrigger, action: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_task">Создать задачу</SelectItem>
                  <SelectItem value="send_email">Отправить email</SelectItem>
                  <SelectItem value="assign_user">Назначить пользователя</SelectItem>
                  <SelectItem value="update_field">Обновить поле</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editedTrigger.action === "create_task" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Название задачи</label>
                  <Input
                    value={editedTrigger.taskTitle || ""}
                    onChange={(e) => setEditedTrigger({ ...editedTrigger, taskTitle: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Связаться"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Описание задачи</label>
                  <Textarea
                    value={editedTrigger.taskDescription || ""}
                    onChange={(e) => setEditedTrigger({ ...editedTrigger, taskDescription: e.target.value })}
                    className="text-xs min-h-[60px] resize-none"
                    placeholder="Связаться с клиентом, квалифицировать..."
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-3 border-green-500/20 bg-green-500/5 group">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-foreground">
                {getTriggerTypeLabel(trigger.type)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground pl-5">
              {getActionLabel(trigger.action)}
            </div>
            {trigger.action === "create_task" && trigger.taskTitle && (
              <div className="text-xs text-foreground pl-5">
                Задача: {trigger.taskTitle}
                {trigger.taskDescription && (
                  <span className="text-muted-foreground">, {trigger.taskDescription}</span>
                )}
              </div>
            )}
          </div>
          {isEditMode && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete?.(trigger.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

