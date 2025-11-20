'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const sparklineData = [
  { value: 20 },
  { value: 35 },
  { value: 28 },
  { value: 42 },
  { value: 38 },
  { value: 45 },
  { value: 52 },
]

const metrics = [
  { label: 'Leads Generated', value: '1,247', change: '+12.5%', trend: 'up' },
  { label: 'Active Deals', value: '89', change: '+8.2%', trend: 'up' },
  { label: 'Avg First Response', value: '2.4h', change: '-15.3%', trend: 'down' },
  { label: 'Avg Deal Cycle Time', value: '12.8d', change: '-5.1%', trend: 'down' },
  { label: 'Overdue Tasks', value: '4.2%', change: '+1.2%', trend: 'up' },
  { label: 'Team Activity', value: '2,849', change: '+18.7%', trend: 'up' },
]

export function KeyMetrics() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-border/50 bg-card p-4 transition-colors"
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">{metric.label}</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {metric.value}
              </div>
            </div>
            <div
              className={`flex items-center gap-1 text-xs font-medium ${
                metric.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {metric.trend === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {metric.change}
            </div>
          </div>
          <div className="h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={sparklineData}
                style={{ outline: 'none' }}
              >
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  )
}
