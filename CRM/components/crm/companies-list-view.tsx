"use client"

import { Company } from '@/lib/api/companies'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Building2, Globe, Mail, Phone, Briefcase } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CompanyBadge } from '@/components/shared/company-badge'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface CompaniesListViewProps {
  companies: Company[]
  selectedCompanies?: string[]
  onSelectCompanies?: (ids: string[]) => void
  onBulkDelete?: () => void
}

export function CompaniesListView({
  companies,
  selectedCompanies = [],
  onSelectCompanies,
  onBulkDelete,
}: CompaniesListViewProps) {
  const { t } = useTranslation()
  const handleSelectAll = (checked: boolean) => {
    if (onSelectCompanies) {
      onSelectCompanies(checked ? companies.map((c) => c.id) : [])
    }
  }

  const handleSelectCompany = (companyId: string, checked: boolean) => {
    if (onSelectCompanies) {
      onSelectCompanies(
        checked
          ? [...selectedCompanies, companyId]
          : selectedCompanies.filter((id) => id !== companyId)
      )
    }
  }

  const allSelected = companies.length > 0 && selectedCompanies.length === companies.length
  const someSelected = selectedCompanies.length > 0 && selectedCompanies.length < companies.length

  return (
    <div>
      {selectedCompanies.length > 0 && (
        <div className="mb-4 p-3 bg-surface border border-border/40 rounded-lg flex items-center justify-between">
          <span className="text-sm text-foreground">
            {selectedCompanies.length}{' '}
            {selectedCompanies.length === 1 ? t('companies.company') : t('companies.companies')} {t('common.selected')}
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
                  onCheckedChange={handleSelectAll}
                  aria-label={t('companies.selectAllCompanies')}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {t('companies.name')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {t('companies.industry')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {t('companies.website')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {t('companies.email')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {t('companies.phone')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {t('companies.totalDeals')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {t('companies.activeDeals')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {t('companies.closedDeals')}
              </th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('companies.noCompaniesFound')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr
                  key={company.id}
                  className="border-b border-border/40 last:border-0 hover:bg-accent/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedCompanies.includes(company.id)}
                      onCheckedChange={(checked) =>
                        handleSelectCompany(company.id, checked as boolean)
                      }
                      aria-label={`Select ${company.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/companies/${company.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {company.industry ? (
                      <Badge variant="outline" className="text-xs">
                        {company.industry}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {company.website ? (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[150px]">{company.website}</span>
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {company.email ? (
                      <a
                        href={`mailto:${company.email}`}
                        className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary"
                      >
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{company.email}</span>
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {company.phone ? (
                      <a
                        href={`tel:${company.phone}`}
                        className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary"
                      >
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{company.phone}</span>
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {company.stats?.totalDeals || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">
                      {company.stats?.activeDeals || 0}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {company.stats?.closedDeals || 0}
                    </Badge>
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



