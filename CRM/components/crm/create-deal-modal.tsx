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
import { Settings } from "lucide-react"
import { useTranslation } from "@/lib/i18n/i18n-context"

interface CreateDealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (dealData: {
    title: string
    amount: number
    stageId: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    companyName?: string
    companyAddress?: string
  }) => Promise<void>
  stageId: string
  pipelineId: string
  dealsCount?: number
  totalAmount?: number
}

export function CreateDealModal({ 
  isOpen, 
  onClose, 
  onSave, 
  stageId,
  pipelineId,
  dealsCount = 0,
  totalAmount = 0
}: CreateDealModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("0")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setTitle("")
      setAmount("0")
      setContactName("")
      setContactPhone("")
      setContactEmail("")
      setCompanyName("")
      setCompanyAddress("")
      setLoading(false)
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!title.trim()) return

    setLoading(true)
    try {
      const amountValue = amount ? parseFloat(amount.replace(/[^0-9.,]/g, "").replace(",", ".")) : 0
      
      await onSave({
        title: title.trim(),
        amount: amountValue,
        stageId,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        companyName: companyName.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
      })
      
      onClose()
    } catch (error) {
      console.error('Failed to create deal:', error instanceof Error ? error.message : String(error))
      // Error is already handled by parent component (handleCreateDeal)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (value: string) => {
    // Remove all non-numeric characters except comma and dot
    const cleaned = value.replace(/[^0-9.,]/g, "")
    return cleaned
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-semibold">
            {t('deals.newDeal') || 'Новая сделка'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {dealsCount} {t('deals.deals') || 'сделок'}: {totalAmount.toLocaleString('ru-RU')} ₽
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Название */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('deals.dealName') || 'Название'}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
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
              onChange={(e) => setAmount(formatAmount(e.target.value))}
              placeholder="0 ₽"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
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
              placeholder={t('deals.contactName') || 'Контакт: Имя'}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
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
              placeholder={t('deals.contactPhone') || 'Контакт: Телефон'}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
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
              placeholder={t('deals.contactEmail') || 'Контакт: Email'}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
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
              placeholder={t('deals.companyName') || 'Компания: Название'}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
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
              placeholder={t('deals.companyAddress') || 'Компания: Адрес'}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
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
              disabled={loading}
            >
              {t('common.cancel') || 'Отменить'}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!title.trim() || loading}
              className="flex-1"
            >
              {t('common.add') || 'Добавить'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => {
                // TODO: Open settings
              }}
              title={t('common.settings') || 'Настройки'}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

