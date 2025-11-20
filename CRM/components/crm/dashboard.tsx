"use client"

import { MetricsGrid } from "./metrics-grid"
import { FunnelChartCard } from "./funnel-chart-card"
import { LineChartCard } from "./line-chart-card"
import { BarChartCard } from "./bar-chart-card"
import { RecentActivityCard } from "./recent-activity-card"
import { TaskLoadChartCard } from "./task-load-chart-card"

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <MetricsGrid />

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelChartCard />
        <LineChartCard />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BarChartCard />
        <TaskLoadChartCard />
      </div>

      {/* Recent Activity */}
      <RecentActivityCard />
    </div>
  )
}
