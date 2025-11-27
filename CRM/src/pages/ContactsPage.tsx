import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CRMLayout } from '@/components/crm/layout'
import { ContactsListView } from '@/components/crm/contacts-list-view'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateContactModal } from '@/components/crm/create-contact-modal'
import { FilterBar } from '@/components/shared/filter-bar'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useContacts, useCompanies, useDeleteContact, useCreateContact } from '@/hooks/use-contacts'
import { useTranslation } from '@/lib/i18n/i18n-context'

export default function ContactsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const searchQuery = searchParams.get('search') || ''
  const selectedCompanies = searchParams.get('companies')?.split(',').filter(Boolean) || []
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || []

  // Используем React Query хуки
  const { data: contactsData = [], isLoading: contactsLoading, error: contactsError } = useContacts({
    search: searchQuery || undefined,
    companyId: selectedCompanies.length === 1 ? selectedCompanies[0] : undefined,
  })

  const { data: companies = [], isLoading: companiesLoading } = useCompanies()
  const deleteContactMutation = useDeleteContact()
  const createContactMutation = useCreateContact()

  // Фильтрация по тегам на клиенте (если нужно)
  const contacts = useMemo(() => {
    if (selectedTags.length === 0) return contactsData
    return contactsData.filter((contact) =>
      selectedTags.some((tag) => contact.tags.includes(tag))
    )
  }, [contactsData, selectedTags])

  const loading = contactsLoading || companiesLoading

  // Обработка ошибок
  if (contactsError) {
    showError(t('contacts.loadError'), t('messages.pleaseTryAgainLater'))
  }

  const handleBulkDelete = async () => {
    if (!confirm(t('contacts.deleteConfirm', { count: selectedContacts.length }))) return

    try {
      await Promise.all(selectedContacts.map((id) => deleteContactMutation.mutateAsync(id)))
      setSelectedContacts([])
      showSuccess(t('contacts.deletedSuccess', { count: selectedContacts.length }))
    } catch (error) {
      console.error('Failed to delete contacts:', error)
      showError(t('contacts.deleteError'), t('messages.pleaseTryAgain'))
    }
  }

  const handleCreateContact = () => {
    setIsCreateModalOpen(true)
  }

  const handleContactCreated = async () => {
    setIsCreateModalOpen(false)
    showSuccess(t('contacts.createdSuccess'))
  }

  const allTags = Array.from(
    new Set(contacts.flatMap((contact) => contact.tags))
  ).map((tag) => ({
    value: tag,
    label: tag,
    count: contacts.filter((c) => c.tags.includes(tag)).length,
  }))

  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
    count: contacts.filter((c) => c.companyId === company.id).length,
  }))

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('contacts.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('contacts.manageContacts')}</p>
          </div>
          <Button size="sm" onClick={handleCreateContact}>
            <Plus className="mr-2 h-4 w-4" />
            {t('contacts.createContact')}
          </Button>
        </div>

        <div className="mb-6">
          <FilterBar
            searchPlaceholder="Search name, email, phone..."
            tagOptions={allTags}
            companyOptions={companyOptions}
          />
        </div>

        {loading ? (
          <PageSkeleton />
        ) : (
          <ContactsListView
            contacts={contacts}
            selectedContacts={selectedContacts}
            onSelectContacts={setSelectedContacts}
            onBulkDelete={handleBulkDelete}
          />
        )}

        <CreateContactModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async (data) => {
            try {
              await createContactMutation.mutateAsync(data)
              handleContactCreated()
            } catch (error) {
              showError(t('contacts.createError'), t('messages.pleaseTryAgain'))
            }
          }}
          companies={companies}
        />
      </div>
    </CRMLayout>
  )
}

