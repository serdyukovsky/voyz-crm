"use client"

import { useState } from 'react'
import { User, Phone, Mail, MessageCircle, Edit2, X, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SocialLinks } from '../social-links'
import { CreateContactModal } from '../create-contact-modal'
import { Contact, Company, CreateContactDto } from '@/types/contact'
import { createContact, getContacts, getCompanies } from '@/lib/api/contacts'
import { useToast } from '@/hooks/use-toast'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface ContactPersonProps {
  contact: Contact | null
  contacts: Contact[]
  onContactChange: (contactId: string | null) => void
  onContactsUpdate?: (contacts: Contact[]) => void
  isRequired?: boolean
}

export function ContactPerson({
  contact,
  contacts,
  onContactChange,
  onContactsUpdate,
  isRequired = false,
}: ContactPersonProps) {
  const { t } = useTranslation()
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const { toast } = useToast()

  const getSocialLink = (platform: 'whatsapp' | 'telegram') => {
    if (!contact?.social) return null

    const link = contact.social[platform]
    if (!link) return null

    if (platform === 'telegram') {
      return link.startsWith('http') ? link : `https://t.me/${link.replace('@', '')}`
    }

    if (platform === 'whatsapp') {
      if (link.startsWith('http')) return link
      const phone = link.replace(/[^0-9]/g, '')
      return `https://wa.me/${phone}`
    }

    return null
  }

  const handleWhatsAppClick = () => {
    const link = getSocialLink('whatsapp')
    if (link) {
      window.open(link, '_blank')
    }
  }

  const handleTelegramClick = () => {
    const link = getSocialLink('telegram')
    if (link) {
      window.open(link, '_blank')
    }
  }

  const handleCreateContact = async (contactData?: CreateContactDto) => {
    if (!contactData) return
    
    try {
      const newContact = await createContact(contactData)
      
      // Обновить список контактов
      const updatedContacts = await getContacts()
      onContactsUpdate?.(updatedContacts)
      
      // Автоматически выбрать новый контакт
      onContactChange(newContact.id)
      setIsCreateModalOpen(false)
      setIsSelectOpen(false)
      
      toast({
        title: t('common.success'),
        description: t('contacts.createdSuccess'),
      })
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('contacts.createError'),
        variant: 'destructive',
      })
    }
  }

  const handleOpenCreateModal = async () => {
    // Загрузить компании если еще не загружены
    if (companies.length === 0) {
      try {
        const companiesData = await getCompanies()
        setCompanies(companiesData)
      } catch (error) {
        console.error('Failed to load companies:', error)
      }
    }
    setIsSelectOpen(false)
    setIsCreateModalOpen(true)
  }

  const renderContactSelector = (placeholder: string, required: boolean = false) => {
    return (
      <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isSelectOpen}
            className="w-full justify-between h-9 text-sm font-normal"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('contacts.searchPlaceholder')} />
            <CommandList>
              <CommandEmpty>{t('contacts.noContactsFound')}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__create_new__"
                  onSelect={handleOpenCreateModal}
                  className="text-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>{t('contacts.createContact')}</span>
                </CommandItem>
                {!required && (
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onContactChange(null)
                      setIsSelectOpen(false)
                    }}
                  >
                    <span>{t('tasks.none')}</span>
                  </CommandItem>
                )}
                {contacts.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.fullName} ${c.email || ''} ${c.phone || ''}`}
                    onSelect={() => {
                      onContactChange(c.id)
                      setIsSelectOpen(false)
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{c.fullName}</span>
                      {c.email && (
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  if (!contact && isRequired) {
    return (
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground mb-2 block">
          {t('deals.contactPerson')} <span className="text-red-600 dark:text-red-400">*</span>
        </label>
        {renderContactSelector(t('deals.selectContactRequired'), true)}
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground mb-2 block">
          {t('deals.contactPerson')}
        </label>
        {renderContactSelector(t('deals.selectContact'), false)}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{t('deals.contactPerson')}</label>
        <div className="flex items-center gap-1">
          <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                {t('common.edit')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="end">
              <Command>
                <CommandInput placeholder={t('contacts.searchPlaceholder')} />
                <CommandList>
                  <CommandEmpty>{t('contacts.noContactsFound')}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__create_new__"
                      onSelect={handleOpenCreateModal}
                      className="text-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span>{t('contacts.createContact')}</span>
                    </CommandItem>
                    {!isRequired && (
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          onContactChange(null)
                          setIsSelectOpen(false)
                        }}
                      >
                        <span>{t('tasks.none')}</span>
                      </CommandItem>
                    )}
                    {contacts.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.email || ''} ${c.phone || ''}`}
                        onSelect={() => {
                          onContactChange(c.id)
                          setIsSelectOpen(false)
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{c.name}</span>
                          {c.email && (
                            <span className="text-xs text-muted-foreground">{c.email}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {!isRequired && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
              onClick={() => onContactChange(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5 rounded-md bg-background/50 border border-border/50 space-y-2">
        {/* Contact Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{contact.fullName}</span>
          </div>
          {contact.position && (
            <p className="text-xs text-muted-foreground">{contact.position}</p>
          )}

          {/* Phone */}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <a
                href={`tel:${contact.phone}`}
                className="text-xs text-foreground hover:text-primary transition-colors"
              >
                {contact.phone}
              </a>
            </div>
          )}

          {/* Email */}
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <a
                href={`mailto:${contact.email}`}
                className="text-xs text-foreground hover:text-primary transition-colors break-all"
              >
                {contact.email}
              </a>
            </div>
          )}

          {/* Social Links */}
          {(contact.social?.whatsapp || contact.social?.telegram) && (
            <div className="flex items-center gap-2 pt-1">
              {contact.social.whatsapp && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleWhatsAppClick}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  WhatsApp
                </Button>
              )}
              {contact.social.telegram && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleTelegramClick}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  Telegram
                </Button>
              )}
            </div>
          )}

          {/* All Social Links */}
          {contact.social && Object.keys(contact.social).length > 0 && (
            <div className="pt-2 border-t border-border/40">
              <SocialLinks 
                contact={{
                  ...contact,
                  tags: contact.tags || [],
                  createdAt: contact.createdAt || '',
                  updatedAt: contact.updatedAt || '',
                  deals: [],
                  stats: {
                    activeDeals: 0,
                    closedDeals: 0,
                    totalDeals: 0,
                  },
                }} 
                size="sm" 
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Contact Modal */}
      <CreateContactModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateContact}
        companies={companies}
      />
    </div>
  )
}

