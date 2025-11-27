import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CRMLayout } from '@/components/crm/layout'
import { CompaniesListView } from '@/components/crm/companies-list-view'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { FilterBar } from '@/components/shared/filter-bar'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { useRealtimeCompany } from '@/hooks/use-realtime-company'
import { useCompanies, useDeleteCompany } from '@/hooks/use-companies'
import { useQueryClient } from '@tanstack/react-query'
import { companyKeys } from '@/hooks/use-companies'
import { useTranslation } from '@/lib/i18n/i18n-context'

export default function CompaniesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { showSuccess, showError } = useToastNotification()
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const queryClient = useQueryClient()

  const searchQuery = searchParams.get('search') || ''
  const selectedIndustries = searchParams.get('industries')?.split(',').filter(Boolean) || []
  const hasDealsFilter = searchParams.get('hasDeals') || ''

  // Используем React Query хуки
  const { data: companiesData = [], isLoading, error } = useCompanies({
    search: searchQuery || undefined,
    industry: selectedIndustries.length === 1 ? selectedIndustries[0] : undefined,
  })

  const deleteCompanyMutation = useDeleteCompany()

  // Фильтрация по наличию сделок на клиенте
  const companies = useMemo(() => {
    if (hasDealsFilter === 'true') {
      return companiesData.filter((company) => (company.stats?.totalDeals || 0) > 0)
    } else if (hasDealsFilter === 'false') {
      return companiesData.filter((company) => (company.stats?.totalDeals || 0) === 0)
    }
    return companiesData
  }, [companiesData, hasDealsFilter])

  // Обработка ошибок через useEffect, чтобы не блокировать рендер
  useEffect(() => {
    if (error) {
      console.error('Error loading companies:', error)
      showError('Failed to load companies', 'Please try again later')
    }
  }, [error, showError])

  const handleBulkDelete = async () => {
    if (!confirm(t('companies.deleteConfirm', { count: selectedCompanies.length }))) return

    try {
      await Promise.all(selectedCompanies.map((id) => deleteCompanyMutation.mutateAsync(id)))
      setSelectedCompanies([])
      showSuccess(`Deleted ${selectedCompanies.length} company(ies)`)
    } catch (error) {
      console.error('Failed to delete companies:', error)
      showError('Failed to delete companies', 'Please try again')
    }
  }

  const allIndustries = Array.from(
    new Set(companies.map((company) => company.industry).filter(Boolean))
  ).map((industry) => ({
    value: industry!,
    label: industry!,
    count: companies.filter((c) => c.industry === industry).length,
  }))

  useRealtimeCompany({
    onCompanyUpdated: (data) => {
      // Инвалидируем кэш при обновлении через WebSocket
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(data.companyId) })
    },
    onCompanyDeleted: (data) => {
      // Инвалидируем кэш при удалении через WebSocket
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
      setSelectedCompanies((prev) => prev.filter((id) => id !== data.companyId))
    },
  })

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('companies.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('companies.manageCompanies')}</p>
          </div>
          <Button size="sm" onClick={() => navigate('/companies/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('companies.createCompany')}
          </Button>
        </div>

        <div className="mb-6">
          <FilterBar
            searchPlaceholder={t('companies.searchPlaceholder')}
            companyOptions={allIndustries.map((ind) => ({
              value: ind.value,
              label: ind.label,
              count: ind.count,
            }))}
          />
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
                navigate(`?${params.toString()}`)
              }}
              className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t('companies.allCompanies')}</option>
              <option value="true">{t('companies.withDeals')}</option>
              <option value="false">{t('companies.withoutDeals')}</option>
            </select>
          </div>
        </div>

        {isLoading ? (
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

