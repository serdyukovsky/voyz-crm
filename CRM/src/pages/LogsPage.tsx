import { useState } from 'react'
import { CRMLayout } from "@/components/crm/layout"
import { LogsTable } from "@/components/crm/logs-table"
import { LogsFilters } from "@/components/crm/logs-filters"
import { Button } from "@/components/ui/button"
import { Download } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/i18n-context'

export default function LogsPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('logs.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('logs.viewActivity')}</p>
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="mr-2 h-4 w-4" />
            {t('logs.export')}
          </Button>
        </div>

        <LogsFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          actionFilter={actionFilter}
          onActionFilterChange={setActionFilter}
          userFilter={userFilter}
          onUserFilterChange={setUserFilter}
          entityFilter={entityFilter}
          onEntityFilterChange={setEntityFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        <LogsTable
          searchQuery={searchQuery}
          actionFilter={actionFilter}
          userFilter={userFilter}
          entityFilter={entityFilter}
        />
      </div>
    </CRMLayout>
  )
}

