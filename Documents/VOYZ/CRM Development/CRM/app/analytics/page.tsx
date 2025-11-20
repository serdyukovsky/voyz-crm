'use client'

import { CRMLayout } from '@/components/crm/layout'
import { FiltersPanel } from '@/components/crm/analytics/filters-panel'
import { KeyMetrics } from '@/components/crm/analytics/key-metrics'
import { FunnelChart } from '@/components/crm/analytics/funnel-chart'
import { LeadSources } from '@/components/crm/analytics/lead-sources'
import { TeamActivity } from '@/components/crm/analytics/team-activity'
import { SLAMetrics } from '@/components/crm/analytics/sla-metrics'
import { EventLogging } from '@/components/crm/analytics/event-logging'
import { Download } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <CRMLayout>
      <div className="min-h-screen">
        {/* Filters Panel */}
        <FiltersPanel />

        {/* Main Content */}
        <div className="space-y-6 px-6 py-6">
          {/* Header with Export */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Analytics</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Comprehensive performance metrics and insights
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/5">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>

          {/* Key Metrics */}
          <KeyMetrics />

          {/* Deal Funnel */}
          <FunnelChart />

          {/* Lead Sources */}
          <LeadSources />

          {/* Team Activity */}
          <TeamActivity />

          {/* SLA Metrics */}
          <SLAMetrics />

          {/* Event Logging */}
          <EventLogging />
        </div>
      </div>
    </CRMLayout>
  )
}
