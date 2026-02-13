"use client"

import { lazy, Suspense } from "react"
import { MetricsGrid } from "./metrics-grid"
import { RecentActivityCard } from "./recent-activity-card"
import { CardSkeleton } from "@/components/shared/loading-skeleton"
import type { GlobalStats } from "@/lib/api/stats"

// Lazy load heavy chart components (Recharts ~200KB)
const FunnelChartCard = lazy(() => import("./funnel-chart-card").then(m => ({ default: m.FunnelChartCard })))
const LineChartCard = lazy(() => import("./line-chart-card").then(m => ({ default: m.LineChartCard })))
const BarChartCard = lazy(() => import("./bar-chart-card").then(m => ({ default: m.BarChartCard })))
const TaskLoadChartCard = lazy(() => import("./task-load-chart-card").then(m => ({ default: m.TaskLoadChartCard })))

// Skeleton for chart cards
const ChartSkeleton = () => (
  <CardSkeleton className="h-[380px]" />
)

interface DashboardProps {
  stats: GlobalStats
}

export function Dashboard({ stats }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <MetricsGrid stats={stats} />

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <FunnelChartCard data={stats.dealsByStage} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <LineChartCard data={stats.revenueTrend} />
        </Suspense>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <BarChartCard data={stats.topManagers} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <TaskLoadChartCard data={stats.topCompanies} />
        </Suspense>
      </div>

      {/* Recent Activity */}
      <RecentActivityCard />
    </div>
  )
}
