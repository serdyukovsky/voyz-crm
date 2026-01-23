"use client"

import { useState, useEffect } from 'react'
import { CRMLayout } from '@/components/crm/layout'
import { ContactsListView } from '@/components/crm/contacts-list-view'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
// Custom hooks to replace next/navigation
const useSearchParams = () => {
  const [params, setParams] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search)
    }
    return new URLSearchParams()
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handlePopState = () => {
      setParams(new URLSearchParams(window.location.search))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  
  return params
}

const useRouter = () => {
  return {
    push: (url: string) => {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', url)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
  }
}
import { deleteContact } from '@/lib/api/contacts'
import { Contact, Company } from '@/types/contact'
import { CreateContactModal } from '@/components/crm/create-contact-modal'
import { FilterBar } from '@/components/shared/filter-bar'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { useContacts } from '@/hooks/use-contacts'
import { useCompanies } from '@/hooks/use-companies'
import { useQueryClient } from '@tanstack/react-query'
import { contactKeys } from '@/hooks/use-contacts'

export default function ContactsPage() {
  useAuthGuard()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToastNotification()
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Get filters from URL
  const searchQuery = searchParams.get('search') || ''
  const selectedCompanies = searchParams.get('companies')?.split(',').filter(Boolean) || []
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || []

  // React Query hooks for data fetching
  // Contacts are fetched with debounced search (from FilterBar component)
  const { data: contactsData, isLoading: contactsLoading, error: contactsError } = useContacts({
    search: searchQuery || undefined,
    companyId: selectedCompanies.length === 1 ? selectedCompanies[0] : undefined,
  })

  // Companies list is cached for 5 minutes (reused across pages)
  const { data: companiesData, isLoading: companiesLoading } = useCompanies()

  // Filter contacts by tags if selected (client-side filter after API returns data)
  const contacts = (contactsData || []).filter((contact) =>
    selectedTags.length === 0 || selectedTags.some((tag) => contact.tags?.includes(tag))
  )

  const companies = companiesData || []
  const loading = contactsLoading || companiesLoading

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedContacts.length} contact(s)?`)) return

    try {
      await Promise.all(selectedContacts.map((id) => deleteContact(id)))
      setSelectedContacts([])
      showSuccess(`Deleted ${selectedContacts.length} contact(s)`)
      // Invalidate contacts cache to refresh list
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    } catch (error) {
      console.error('Failed to delete contacts:', error)
      showError('Failed to delete contacts', 'Please try again')
    }
  }

  const handleCreateContact = () => {
    setIsCreateModalOpen(true)
  }

  const handleContactCreated = async () => {
    setIsCreateModalOpen(false)
    showSuccess('Contact created successfully')
    // Invalidate contacts cache to refresh list
    queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
  }

  // Extract unique tags from contacts
  const allTags = Array.from(
    new Set(contacts.flatMap((contact) => contact.tags))
  ).map((tag) => ({
    value: tag,
    label: tag,
    count: contacts.filter((c) => c.tags.includes(tag)).length,
  }))

  // Prepare company options
  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
    count: contacts.filter((c) => c.companyId === company.id).length,
  }))

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground">Manage your contacts and relationships</p>
          </div>
          <Button size="sm" onClick={handleCreateContact}>
            <Plus className="mr-2 h-4 w-4" />
            Create Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FilterBar
            searchPlaceholder="Search name, email, phone..."
            tagOptions={allTags}
            companyOptions={companyOptions}
          />
        </div>

        {/* Contacts List */}
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

        {/* Create Contact Modal */}
        <CreateContactModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async () => {
            await handleContactCreated()
          }}
          companies={companies}
        />
      </div>
    </CRMLayout>
  )
}

