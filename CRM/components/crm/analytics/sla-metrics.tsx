'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'

const responseTimeData = [
  { range: '0-1h', count: 145 },
  { range: '1-2h', count: 89 },
  { range: '2-4h', count: 67 },
  { range: '4-8h', count: 34 },
  { range: '8h+', count: 18 },
]

const slaMetrics = [
  { label: 'Avg First Response', value: '2.4h', change: '-15.3%' },
  { label: 'Avg Stage Transition', value: '4.2h', change: '-8.7%' },
  { label: 'Avg Task Completion', value: '1.8d', change: '+3.2%' },
  { label: 'Overdue Tasks', value: '4.2%', change: '+1.2%' },
  { label: 'Inactive Days', value: '2.1d', change: '-12.5%' },
]

export function SLAMetrics() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="rounded-lg border border-border/50 bg-card p-6">
      <h3 className="mb-6 text-sm font-semibold text-foreground">SLA / Processing Speed</h3>

      {/* Metric Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        {slaMetrics.map((metric) => (
          <div key={metric.label} className="rounded-md border border-border/50 bg-background p-3">
            <div className="text-xs text-muted-foreground">{metric.label}</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{metric.value}</div>
            <div className="mt-1 text-xs text-emerald-500">{metric.change}</div>
          </div>
        ))}
      </div>

      {/* Response Time Distribution */}
      <div>
        <div className="mb-3 text-xs font-medium text-muted-foreground">
          Response Time Distribution
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={responseTimeData}
              style={{ outline: 'none' }}
            >
              <XAxis
                dataKey="range"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {responseTimeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={hoveredIndex === index ? '#6B8AFF' : '#A1A1AA'}
                    style={{ transition: 'fill 0.2s', outline: 'none' }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
