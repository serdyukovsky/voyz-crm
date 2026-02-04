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
import { ChevronDown, Settings } from "lucide-react"
import type { Deal } from "./kanban-board"

interface QuickAddDealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (deal: Omit<Deal, "id" | "updatedAt"> & {
    contactData?: {
      link?: string
      subscriberCount?: string
      contactMethods?: string[]
      websiteOrTgChannel?: string
      contactInfo?: string
    }
  }) => void
  stageId: string
  stageName?: string
  dealsCount?: number
  dealsAmount?: number
  currentUserId?: { name: string; avatar: string }
}

const CONTACT_METHOD_OPTIONS = ['Whatsapp', 'Telegram', 'Direct']
const CONTACT_METHOD_LABELS: Record<string, string> = {
  'Whatsapp': 'WhatsApp',
  'Telegram': 'Telegram',
  'Direct': 'Напрямую',
}

export function QuickAddDealModal({
  isOpen,
  onClose,
  onSave,
  stageId,
  stageName,
  dealsCount = 0,
  dealsAmount = 0,
  currentUserId
}: QuickAddDealModalProps) {
  const [title, setTitle] = useState("")
  const [link, setLink] = useState("")
  const [subscriberCount, setSubscriberCount] = useState("")
  const [contactMethods, setContactMethods] = useState<string[]>([])
  const [websiteOrTgChannel, setWebsiteOrTgChannel] = useState("")
  const [contactInfo, setContactInfo] = useState("")
  const [openMethodsDropdown, setOpenMethodsDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setTitle("")
      setLink("")
      setSubscriberCount("")
      setContactMethods([])
      setWebsiteOrTgChannel("")
      setContactInfo("")
      setOpenMethodsDropdown(false)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.methods-dropdown-container')) {
        setOpenMethodsDropdown(false)
      }
    }

    if (openMethodsDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMethodsDropdown])

  const handleSave = () => {
    if (!title.trim()) return

    const newDeal: Omit<Deal, "id" | "updatedAt"> & {
      contactData?: {
        link?: string
        subscriberCount?: string
        contactMethods?: string[]
        websiteOrTgChannel?: string
        contactInfo?: string
      }
    } = {
      title: title.trim(),
      client: title.trim(),
      amount: 0,
      stage: stageId,
      assignedTo: currentUserId || { name: "Current User", avatar: "CU" },
      contactData: {
        link: link.trim() || undefined,
        subscriberCount: subscriberCount.trim() || undefined,
        contactMethods: contactMethods.length > 0 ? contactMethods : undefined,
        websiteOrTgChannel: websiteOrTgChannel.trim() || undefined,
        contactInfo: contactInfo.trim() || undefined,
      }
    }

    onSave(newDeal)
    onClose()
  }

  const toggleContactMethod = (method: string) => {
    setContactMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    )
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Новая сделка</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {dealsCount} сделок: {formatAmount(dealsAmount)}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Название */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название"
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !openMethodsDropdown) {
                  handleSave()
                }
                if (e.key === "Escape") {
                  onClose()
                }
              }}
              autoFocus
            />
          </div>

          {/* Ссылка */}
          <div>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Ссылка"
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !openMethodsDropdown) {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Кол-во подписчиков */}
          <div>
            <Input
              value={subscriberCount}
              onChange={(e) => setSubscriberCount(e.target.value)}
              placeholder="Кол-во подписчиков"
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !openMethodsDropdown) {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Способ связи - Multi-select Dropdown */}
          <div className="methods-dropdown-container relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpenMethodsDropdown(!openMethodsDropdown)
              }}
              className="w-full h-12 px-3 flex items-center justify-between rounded-lg border border-input bg-background text-base"
            >
              <span className={contactMethods.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                {contactMethods.length > 0
                  ? contactMethods.map(m => CONTACT_METHOD_LABELS[m] || m).join(', ')
                  : "Способ связи"
                }
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openMethodsDropdown ? 'rotate-180' : ''}`} />
            </button>

            {openMethodsDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-input bg-card shadow-lg z-50 p-2 space-y-1">
                {CONTACT_METHOD_OPTIONS.map((method) => (
                  <div key={method} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50">
                    <input
                      type="checkbox"
                      id={`quick-method-${method}`}
                      checked={contactMethods.includes(method)}
                      onChange={() => toggleContactMethod(method)}
                      className="h-4 w-4 rounded border border-border cursor-pointer"
                    />
                    <label htmlFor={`quick-method-${method}`} className="text-sm cursor-pointer flex-1">
                      {CONTACT_METHOD_LABELS[method] || method}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Сайт, тг канал */}
          <div>
            <Input
              value={websiteOrTgChannel}
              onChange={(e) => setWebsiteOrTgChannel(e.target.value)}
              placeholder="Сайт, тг канал"
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !openMethodsDropdown) {
                  handleSave()
                }
              }}
            />
          </div>

          {/* Контакт */}
          <div>
            <Input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Контакт"
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !openMethodsDropdown) {
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
              className="flex-1 h-12 text-base rounded-lg"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 h-12 text-base rounded-lg"
            >
              Добавить
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-lg"
              onClick={() => {
                // TODO: Open settings for customizing fields
              }}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
