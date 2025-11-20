"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Deal } from "./kanban-board"

interface NewDealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (deal: Omit<Deal, "id" | "updatedAt">) => void
  currentUserId?: { name: string; avatar: string }
}

export function NewDealModal({ isOpen, onClose, onSave, currentUserId }: NewDealModalProps) {
  const [title, setTitle] = useState("")
  const [client, setClient] = useState("")
  const [amount, setAmount] = useState("")
  const [assignedTo, setAssignedTo] = useState(currentUserId || { name: "Current User", avatar: "CU" })

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setTitle("")
      setClient("")
      setAmount("")
      setAssignedTo(currentUserId || { name: "Current User", avatar: "CU" })
    }
  }, [isOpen, currentUserId])

  const handleSave = () => {
    if (!title.trim()) return

    const newDeal: Omit<Deal, "id" | "updatedAt"> = {
      title: title.trim(),
      client: client.trim() || "Unnamed Client",
      amount: amount ? parseFloat(amount.replace(/[^0-9.]/g, "")) : 0,
      stage: "new",
      assignedTo,
    }

    onSave(newDeal)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новая сделка</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Название сделки *</Label>
            <Input
              id="deal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название сделки"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
                if (e.key === "Escape") {
                  onClose()
                }
              }}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-client">Клиент</Label>
            <Input
              id="deal-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Введите название клиента"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-amount">Сумма</Label>
            <Input
              id="deal-amount"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Ответственный</Label>
            <div className="flex items-center gap-2 px-3 h-9 rounded-md bg-background/50 border border-border/50">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary"
              >
                {assignedTo.avatar}
              </div>
              <span className="text-sm font-medium">{assignedTo.name}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

