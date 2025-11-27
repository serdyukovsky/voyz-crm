import { CRMLayout } from "@/components/crm/layout"
import { Dashboard } from "@/components/crm/dashboard"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/i18n-context'

export default function DashboardPage() {
  const { t } = useTranslation()
  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('dashboard.welcomeBack', { name: 'Alex' })}</p>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.newDeal')}
          </Button>
        </div>

        {/* Dashboard Content */}
        <Dashboard />
      </div>
    </CRMLayout>
  )
}

