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
      showError('Invalid Instagram URL', 'Please enter a valid Instagram URL')
      return
    }
    if (telegram && !validateUrl(telegram, 'telegram')) {
      showError('Invalid Telegram URL or username', 'Please enter a valid Telegram username or URL')
      return
    }
    if (whatsapp && !validateUrl(whatsapp, 'whatsapp')) {
      showError('Invalid WhatsApp URL or phone number', 'Please enter a valid WhatsApp phone number or URL')
      return
    }
    if (vk && !validateUrl(vk, 'vk')) {
      showError('Invalid VK URL', 'Please enter a valid VK URL')
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
        'Failed to save contact',
        error?.message || 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contactId ? 'Edit Contact' : 'Create Contact'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="contact-name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contact-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-position">Position</Label>
                <Input
                  id="contact-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., CEO, CTO"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-company">Company</Label>
                <Select value={companyId || "none"} onValueChange={(value) => setCompanyId(value === "none" ? "" : value)}>
                  <SelectTrigger id="contact-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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
              <Label htmlFor="contact-tags">Tags (comma-separated)</Label>
              <Input
                id="contact-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="VIP, Enterprise, Technical"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this contact..."
                rows={3}
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h3 className="text-sm font-semibold text-foreground">Social Links</h3>

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
                  placeholder="https://instagram.com/username"
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
                  placeholder="@username or URL"
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
                  placeholder="+1234567890 or URL"
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
                  placeholder="https://vk.com/username"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!fullName.trim() || loading}>
              {loading ? 'Saving...' : contactId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

