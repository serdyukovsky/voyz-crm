import { lazy, Suspense } from 'react'
import { CRMLayout } from '@/components/crm/layout'
import { FiltersPanel } from '@/components/crm/analytics/filters-panel'
import { Download } from 'lucide-react'
import { CardSkeleton } from '@/components/shared/loading-skeleton'
import { useTranslation } from '@/lib/i18n/i18n-context'

// Lazy load heavy analytics components with Recharts
const KeyMetrics = lazy(() => import('@/components/crm/analytics/key-metrics').then(m => ({ default: m.KeyMetrics })))
const FunnelChart = lazy(() => import('@/components/crm/analytics/funnel-chart').then(m => ({ default: m.FunnelChart })))
const LeadSources = lazy(() => import('@/components/crm/analytics/lead-sources').then(m => ({ default: m.LeadSources })))
const TeamActivity = lazy(() => import('@/components/crm/analytics/team-activity').then(m => ({ default: m.TeamActivity })))
const SLAMetrics = lazy(() => import('@/components/crm/analytics/sla-metrics').then(m => ({ default: m.SLAMetrics })))
const EventLogging = lazy(() => import('@/components/crm/analytics/event-logging').then(m => ({ default: m.EventLogging })))

// Skeleton for analytics components
const AnalyticsSkeleton = () => (
  <CardSkeleton className="h-[400px]" />
)

export default function AnalyticsPage() {
  const { t } = useTranslation()
  return (
    <CRMLayout>
      <div className="min-h-screen">
        <FiltersPanel />

        <div className="space-y-6 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('analytics.title')}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('analytics.viewReports')}
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/5">
              <Download className="h-3.5 w-3.5" />
              {t('analytics.export')}
            </button>
          </div>

          <Suspense fallback={<AnalyticsSkeleton />}>
            <KeyMetrics />
          </Suspense>
          <Suspense fallback={<AnalyticsSkeleton />}>
            <FunnelChart />
          </Suspense>
          <Suspense fallback={<AnalyticsSkeleton />}>
            <LeadSources />
          </Suspense>
          <Suspense fallback={<AnalyticsSkeleton />}>
            <TeamActivity />
          </Suspense>
          <Suspense fallback={<AnalyticsSkeleton />}>
            <SLAMetrics />
          </Suspense>
          <Suspense fallback={<AnalyticsSkeleton />}>
            <EventLogging />
          </Suspense>
        </div>
      </div>
    </CRMLayout>
  )
}

