"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createContact, updateContact, CreateContactDto, Company } from '@/lib/api/contacts'
import { Instagram, MessageCircle, Phone, Users } from 'lucide-react'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface CreateContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (contactData?: CreateContactDto) => void | Promise<void>
  companies: Company[]
  contactId?: string
  initialData?: Partial<CreateContactDto>
}

export function CreateContactModal({
  isOpen,
  onClose,
  onSave,
  companies,
  contactId,
  initialData,
}: CreateContactModalProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [instagram, setInstagram] = useState('')
  const [telegram, setTelegram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [vk, setVk] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFullName(initialData.fullName || '')
        setEmail(initialData.email || '')
        setPhone(initialData.phone || '')
        setPosition(initialData.position || '')
        setCompanyId(initialData.companyId || '')
        setTags(initialData.tags?.join(', ') || '')
        setNotes(initialData.notes || '')
        setInstagram(initialData.social?.instagram || '')
        setTelegram(initialData.social?.telegram || '')
        setWhatsapp(initialData.social?.whatsapp || '')
        setVk(initialData.social?.vk || '')
      } else {
        // Reset form
        setFullName('')
        setEmail('')
        setPhone('')
        setPosition('')
        setCompanyId('')
        setTags('')
        setNotes('')
        setInstagram('')
        setTelegram('')
        setWhatsapp('')
        setVk('')
      }
    }
  }, [isOpen, initialData])

  const validateUrl = (url: string, platform: string): boolean => {
    if (!url) return true
    if (platform === 'telegram' && !url.startsWith('http') && !url.startsWith('@')) {
      return true // Telegram can be @username or URL
    }
    if (platform === 'whatsapp' && !url.startsWith('http')) {
      return true // WhatsApp can be phone number or URL
    }
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  const handleSave = async () => {
    if (!fullName.trim()) return

    // Validate URLs
    if (instagram && !validateUrl(instagram, 'instagram')) {
      showError(t('contacts.invalidInstagramUrl'), t('contacts.pleaseEnterValidInstagramUrl'))
      return
    }
    if (telegram && !validateUrl(telegram, 'telegram')) {
      showError(t('contacts.invalidTelegramUrl'), t('contacts.pleaseEnterValidTelegramUrl'))
      return
    }
    if (whatsapp && !validateUrl(whatsapp, 'whatsapp')) {
      showError(t('contacts.invalidWhatsAppUrl'), t('contacts.pleaseEnterValidWhatsAppUrl'))
      return
    }
    if (vk && !validateUrl(vk, 'vk')) {
      showError(t('contacts.invalidVkUrl'), t('contacts.pleaseEnterValidVkUrl'))
      return
    }

    setLoading(true)
    try {
      const data: CreateContactDto = {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        position: position.trim() || undefined,
        companyId: companyId || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        notes: notes.trim() || undefined,
        social: {
          instagram: instagram.trim() || undefined,
          telegram: telegram.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          vk: vk.trim() || undefined,
        },
      }

      if (contactId) {
        // Update existing contact
        const { updateContact } = await import('@/lib/api/contacts')
        await updateContact(contactId, data)
        await onSave()
      } else {
        // Create new contact - передаем данные в onSave
        await onSave(data)
      }

      onClose()
    } catch (error: any) {
      console.error('Failed to save contact:', error)
      showError(
        t('contacts.failedToSaveContact'),
        error?.message || t('messages.pleaseTryAgain')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contactId ? t('contacts.editContact') : t('contacts.createContact')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">{t('contacts.basicInformation')}</h3>

            <div className="space-y-2">
              <Label htmlFor="contact-name">
                {t('contacts.fullName')} <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Input
                id="contact-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('contacts.enterFullName')}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">{t('contacts.email')}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('contacts.emailPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">{t('contacts.phone')}</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('contacts.phonePlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-position">{t('contacts.position')}</Label>
                <Input
                  id="contact-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder={t('contacts.positionPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-company">{t('contacts.company')}</Label>
                <Select value={companyId || "none"} onValueChange={(value) => setCompanyId(value === "none" ? "" : value)}>
                  <SelectTrigger id="contact-company">
                    <SelectValue placeholder={t('contacts.selectCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('tasks.none')}</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-tags">{t('contacts.tags')}</Label>
              <Input
                id="contact-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t('contacts.tagsPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-notes">{t('contacts.notes')}</Label>
              <Textarea
                id="contact-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('contacts.notesPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h3 className="text-sm font-semibold text-foreground">{t('contacts.socialLinks')}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  id="contact-instagram"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder={t('contacts.instagramPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-telegram" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Telegram
                </Label>
                <Input
                  id="contact-telegram"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder={t('contacts.telegramPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-whatsapp" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </Label>
                <Input
                  id="contact-whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder={t('contacts.whatsappPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-vk" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  VK
                </Label>
                <Input
                  id="contact-vk"
                  value={vk}
                  onChange={(e) => setVk(e.target.value)}
                  placeholder={t('contacts.vkPlaceholder')}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!fullName.trim() || loading}>
              {loading ? t('contacts.saving') : contactId ? t('common.edit') : t('common.create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

