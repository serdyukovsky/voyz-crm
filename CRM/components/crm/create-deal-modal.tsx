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
import { Settings, ChevronDown } from "lucide-react"
import { useTranslation } from "@/lib/i18n/i18n-context"

interface CreateDealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (dealData: {
    title: string
    amount: number
    stageId: string
    contactData?: {
      link?: string
      subscriberCount?: string
      contactMethods?: string[]
      websiteOrTgChannel?: string
      contactInfo?: string
    }
  }) => Promise<void>
  stageId: string
  pipelineId: string
  dealsCount?: number
  totalAmount?: number
}

const CONTACT_METHOD_OPTIONS = ['Whatsapp', 'Telegram', 'Direct']
const CONTACT_METHOD_LABELS: Record<string, string> = {
  'Whatsapp': 'WhatsApp',
  'Telegram': 'Telegram',
  'Direct': 'Напрямую',
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
  const [link, setLink] = useState("")
  const [subscriberCount, setSubscriberCount] = useState("")
  const [contactMethods, setContactMethods] = useState<string[]>([])
  const [websiteOrTgChannel, setWebsiteOrTgChannel] = useState("")
  const [contactInfo, setContactInfo] = useState("")
  const [openMethodsDropdown, setOpenMethodsDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

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
      setLoading(false)
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

  const handleSave = async () => {
    if (!title.trim()) return

    // Debug: Log stageId from props before sending
    console.log('CreateDealModal.handleSave - stageId from props:', {
      stageId,
      type: typeof stageId,
      pipelineId,
      pipelineIdType: typeof pipelineId
    })

    // Validate stageId is a valid UUID
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return typeof str === 'string' && uuidRegex.test(str)
    }

    if (!isValidUUID(stageId)) {
      console.error('CreateDealModal: INVALID STAGE ID!', {
        stageId,
        type: typeof stageId,
        isObjectString: stageId === '[object Object]'
      })
      return
    }

    setLoading(true)
    try {
      const dealData = {
        title: title.trim(),
        amount: 0,
        stageId,
        contactData: {
          link: link.trim() || undefined,
          subscriberCount: subscriberCount.trim() || undefined,
          contactMethods: contactMethods.length > 0 ? contactMethods : undefined,
          websiteOrTgChannel: websiteOrTgChannel.trim() || undefined,
          contactInfo: contactInfo.trim() || undefined,
        }
      }

      console.log('CreateDealModal.handleSave - calling onSave with:', dealData)

      await onSave(dealData)

      onClose()
    } catch (error) {
      console.error('Failed to create deal:', error instanceof Error ? error.message : String(error))
      // Error is already handled by parent component (handleCreateDeal)
    } finally {
      setLoading(false)
    }
  }

  const toggleContactMethod = (method: string) => {
    setContactMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    )
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
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !openMethodsDropdown) {
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

          {/* Ссылка */}
          <div>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={t('contacts.link') || 'Ссылка'}
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !openMethodsDropdown) {
                  e.preventDefault()
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
              placeholder={t('contacts.subscriberCount') || 'Кол-во подписчиков'}
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !openMethodsDropdown) {
                  e.preventDefault()
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
                  : t('contacts.contactMethods') || "Способ связи"
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
                      id={`create-method-${method}`}
                      checked={contactMethods.includes(method)}
                      onChange={() => toggleContactMethod(method)}
                      className="h-4 w-4 rounded border border-border cursor-pointer"
                    />
                    <label htmlFor={`create-method-${method}`} className="text-sm cursor-pointer flex-1">
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
              placeholder={t('contacts.websiteOrTgChannel') || 'Сайт, тг канал'}
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !openMethodsDropdown) {
                  e.preventDefault()
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
              placeholder={t('contacts.contactInfo') || 'Контакт'}
              className="h-12 text-base rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !openMethodsDropdown) {
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
              className="flex-1 h-12 text-base rounded-lg"
              disabled={loading}
            >
              {t('common.cancel') || 'Отмена'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || loading}
              className="flex-1 h-12 text-base rounded-lg"
            >
              {t('common.add') || 'Добавить'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-lg"
              onClick={() => {
                // TODO: Open settings
              }}
              title={t('common.settings') || 'Настройки'}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
