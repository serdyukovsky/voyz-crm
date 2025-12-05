"use client"

import { useState, useEffect } from 'react'
import { CRMLayout } from '@/components/crm/layout'
import { CompaniesListView } from '@/components/crm/companies-list-view'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCompanies, deleteCompany, type Company } from '@/lib/api/companies'
import { FilterBar } from '@/components/shared/filter-bar'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useRealtimeCompany } from '@/hooks/use-realtime-company'
import { useAuthGuard } from '@/hooks/use-auth-guard'

export default function CompaniesPage() {
  useAuthGuard()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showSuccess, showError } = useToastNotification()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Get filters from URL
  const searchQuery = searchParams.get('search') || ''
  const selectedIndustries = searchParams.get('industries')?.split(',').filter(Boolean) || []
  const hasDealsFilter = searchParams.get('hasDeals') || ''

  useEffect(() => {
    loadCompanies()
  }, [searchQuery, selectedIndustries, hasDealsFilter])

  const loadCompanies = async () => {
    setLoading(true)
    try {
      const companiesData = await getCompanies({
        search: searchQuery || undefined,
        industry: selectedIndustries.length === 1 ? selectedIndustries[0] : undefined,
      })
      
      // Filter by hasDeals if selected
      let filteredCompanies = companiesData
      if (hasDealsFilter === 'true') {
        filteredCompanies = companiesData.filter(
          (company) => (company.stats?.totalDeals || 0) > 0
        )
      } else if (hasDealsFilter === 'false') {
        filteredCompanies = companiesData.filter(
          (company) => (company.stats?.totalDeals || 0) === 0
        )
      }
      
      setCompanies(filteredCompanies)
    } catch (error) {
      console.error('Failed to load companies:', error)
      showError('Failed to load companies', 'Please try again later')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedCompanies.length} company(ies)?`)) return

    try {
      await Promise.all(selectedCompanies.map((id) => deleteCompany(id)))
      setSelectedCompanies([])
      showSuccess(`Deleted ${selectedCompanies.length} company(ies)`)
      loadCompanies()
    } catch (error) {
      console.error('Failed to delete companies:', error)
      showError('Failed to delete companies', 'Please try again')
    }
  }

  // Extract unique industries from companies
  const allIndustries = Array.from(
    new Set(companies.map((company) => company.industry).filter(Boolean))
  ).map((industry) => ({
    value: industry!,
    label: industry!,
    count: companies.filter((c) => c.industry === industry).length,
  }))

  // WebSocket updates
  useRealtimeCompany({
    onCompanyUpdated: (data) => {
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === data.companyId ? { ...company, ...data } : company
        )
      )
    },
    onCompanyDeleted: (data) => {
      setCompanies((prev) => prev.filter((company) => company.id !== data.companyId))
      setSelectedCompanies((prev) => prev.filter((id) => id !== data.companyId))
    },
  })

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Companies</h1>
            <p className="text-sm text-muted-foreground">Manage your companies and organizations</p>
          </div>
          <Button size="sm" onClick={() => router.push('/companies/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Company
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FilterBar
            searchPlaceholder="Search name, industry, email..."
            companyOptions={allIndustries.map((ind) => ({
              value: ind.value,
              label: ind.label,
              count: ind.count,
            }))}
          />
          {/* Has Deals Filter */}
          <div className="mt-2">
            <select
              value={hasDealsFilter}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString())
                if (e.target.value) {
                  params.set('hasDeals', e.target.value)
                } else {
                  params.delete('hasDeals')
                }
                router.replace(`?${params.toString()}`)
              }}
              className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Companies</option>
              <option value="true">With Deals</option>
              <option value="false">Without Deals</option>
            </select>
          </div>
        </div>

        {/* Companies List */}
        {loading ? (
          <PageSkeleton />
        ) : (
          <CompaniesListView
            companies={companies}
            selectedCompanies={selectedCompanies}
            onSelectCompanies={setSelectedCompanies}
            onBulkDelete={handleBulkDelete}
          />
        )}
      </div>
    </CRMLayout>
  )
}






