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
import type { Deal } from "./kanban-board"

interface QuickAddDealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (deal: Omit<Deal, "id" | "updatedAt">) => void
  stageId: string
  currentUserId?: { name: string; avatar: string }
}

export function QuickAddDealModal({ 
  isOpen, 
  onClose, 
  onSave, 
  stageId,
  currentUserId 
}: QuickAddDealModalProps) {
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setTitle("")
      setAmount("")
      setContactName("")
      setContactPhone("")
      setContactEmail("")
      setCompanyName("")
      setCompanyAddress("")
    }
  }, [isOpen])

  const handleSave = () => {
    if (!title.trim()) return

    const newDeal: Omit<Deal, "id" | "updatedAt"> = {
      title: title.trim(),
      client: contactName.trim() || companyName.trim() || "Unnamed Client",
      amount: amount ? parseFloat(amount.replace(/[^0-9.]/g, "")) : 0,
      stage: stageId,
      assignedTo: currentUserId || { name: "Current User", avatar: "CU" },
    }

    onSave(newDeal)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-semibold">НОВЫЙ ЛИД</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">13 сделок: 0 ₽</p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Название */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название"
              className="h-10"
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

          {/* Сумма */}
          <div>
            <Input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0 ₽"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Контакт: Имя */}
          <div>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Контакт: Имя"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Контакт: Телефон */}
          <div>
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Контакт: Телефон"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Контакт: Email */}
          <div>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Контакт: Email"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Компания: Название */}
          <div>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Компания: Название"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Компания: Адрес */}
          <div>
            <Input
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Компания: Адрес"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Отменить
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!title.trim()}
              className="flex-1"
            >
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

