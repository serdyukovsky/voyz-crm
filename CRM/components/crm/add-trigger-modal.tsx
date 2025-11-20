"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Trigger } from "./trigger-card"

interface AddTriggerModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (trigger: Trigger) => void
}

export function AddTriggerModal({ isOpen, onClose, onAdd }: AddTriggerModalProps) {
  const [type, setType] = useState<"on_create" | "on_transition" | "on_field_change">("on_create")
  const [action, setAction] = useState<"create_task" | "send_email" | "assign_user" | "update_field">("create_task")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")

  const handleAdd = () => {
    const trigger: Trigger = {
      id: `trigger-${Date.now()}`,
      type,
      action,
      taskTitle: action === "create_task" ? taskTitle : undefined,
      taskDescription: action === "create_task" ? taskDescription : undefined,
    }
    onAdd(trigger)
    // Reset form
    setType("on_create")
    setAction("create_task")
    setTaskTitle("")
    setTaskDescription("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить триггер</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Тип триггера</label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger>
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
            <label className="text-sm font-medium mb-2 block">Действие</label>
            <Select value={action} onValueChange={(value: any) => setAction(value)}>
              <SelectTrigger>
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

          {action === "create_task" && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Название задачи</label>
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Связаться"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Описание задачи</label>
                <Textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Связаться с клиентом, квалифицировать..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleAdd} disabled={action === "create_task" && !taskTitle.trim()}>
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

