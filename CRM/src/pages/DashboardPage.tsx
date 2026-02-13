import { useState, useEffect } from 'react'
import { CRMLayout } from "@/components/crm/layout"
import { Dashboard } from "@/components/crm/dashboard"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { getGlobalStats, type GlobalStats } from '@/lib/api/stats'
import { StatsSkeleton, CardSkeleton } from '@/components/shared/loading-skeleton'

export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getGlobalStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()

    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
          </div>
        </div>

        {/* Dashboard Content */}
        {loading && !stats ? (
          <div className="space-y-6">
            <StatsSkeleton />
            <div className="grid gap-6 lg:grid-cols-2">
              <CardSkeleton className="h-[380px]" />
              <CardSkeleton className="h-[380px]" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <CardSkeleton className="h-[380px]" />
              <CardSkeleton className="h-[380px]" />
            </div>
          </div>
        ) : stats ? (
          <Dashboard stats={stats} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Не удалось загрузить данные дашборда</p>
          </div>
        )}
      </div>
    </CRMLayout>
  )
}
