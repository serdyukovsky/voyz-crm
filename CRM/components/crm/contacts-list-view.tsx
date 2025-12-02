"use client"

import { Contact } from '@/types/contact'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Instagram, MessageCircle, Phone, Users } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface ContactsListViewProps {
  contacts: Contact[]
  selectedContacts?: string[]
  onSelectContacts?: (ids: string[]) => void
  onBulkDelete?: () => void
}

export function ContactsListView({
  contacts,
  selectedContacts = [],
  onSelectContacts,
  onBulkDelete,
}: ContactsListViewProps) {
  const { t } = useTranslation()
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  const handleSelectAll = (checked: boolean) => {
    if (onSelectContacts) {
      onSelectContacts(checked ? contacts.map((c) => c.id) : [])
    }
  }

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (onSelectContacts) {
      onSelectContacts(
        checked
          ? [...selectedContacts, contactId]
          : selectedContacts.filter((id) => id !== contactId)
      )
    }
  }

  const allSelected = contacts.length > 0 && selectedContacts.length === contacts.length
  const someSelected = selectedContacts.length > 0 && selectedContacts.length < contacts.length

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-3.5 w-3.5" />
      case 'telegram':
        return <MessageCircle className="h-3.5 w-3.5" />
      case 'whatsapp':
        return <Phone className="h-3.5 w-3.5" />
      case 'vk':
        return <Users className="h-3.5 w-3.5" />
      default:
        return null
    }
  }

  const getSocialLink = (contact: Contact, platform: string) => {
    const social = contact.social?.[platform as keyof typeof contact.social]
    if (!social) return null

    let url = social
    if (platform === 'telegram' && !url.startsWith('http')) {
      url = `https://t.me/${url.replace('@', '')}`
    }
    if (platform === 'whatsapp' && !url.startsWith('http')) {
      const phone = url.replace(/[^0-9]/g, '')
      url = `https://wa.me/${phone}`
    }

    return url
  }

  return (
    <div>
      {selectedContacts.length > 0 && (
        <div className="mb-4 p-3 bg-surface border border-border/40 rounded-lg flex items-center justify-between">
          <span className="text-sm text-foreground">
            {selectedContacts.length}{' '}
            {selectedContacts.length === 1 ? t('contacts.contact') : t('contacts.contacts')} {t('common.selected')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onBulkDelete}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors border border-red-500/20"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      )}

      <div className="border border-border/40 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 bg-surface/30">
              <th className="px-4 py-3 w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                  aria-label={t('contacts.selectAllContacts')}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.name')}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.email')}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.phone')}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.company')}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.social')}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.totalDeals')}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.active')}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.closed')}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {t('contacts.created')}
              </th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('contacts.noContactsFound')}
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-border/40 hover:bg-surface/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={(checked) =>
                        handleSelectContact(contact.id, checked === true)
                      }
                      aria-label={`${t('common.select')} ${contact.fullName}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {contact.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.phone || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.companyName || contact.company?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {['instagram', 'telegram', 'whatsapp', 'vk'].map((platform) => {
                        const link = getSocialLink(contact, platform)
                        if (!link) return null
                        return (
                          <a
                            key={platform}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            aria-label={`${platform} link`}
                          >
                            {getSocialIcon(platform)}
                          </a>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.stats.totalDeals}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.stats.activeDeals}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.stats.closedDeals}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(contact.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

