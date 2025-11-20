'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'

const sources = [
  { name: 'Website', leads: 487, conversion: 24.8, color: '#A1A1AA' },
  { name: 'Referral', leads: 312, conversion: 31.2, color: '#A1A1AA' },
  { name: 'Email Campaign', leads: 256, conversion: 18.5, color: '#A1A1AA' },
  { name: 'Social Media', leads: 189, conversion: 15.3, color: '#A1A1AA' },
  { name: 'Cold Outreach', leads: 145, conversion: 12.1, color: '#A1A1AA' },
]

export function LeadSources() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="rounded-lg border border-border/50 bg-card p-6">
      <h3 className="mb-6 text-sm font-semibold text-foreground">Lead Sources</h3>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table */}
        <div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pb-2 text-left font-medium text-muted-foreground">Source</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Leads</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source, index) => (
                <tr
                  key={source.name}
                  className="border-b border-border/50 transition-colors hover:bg-accent/5"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <td className="py-3 text-foreground">{source.name}</td>
                  <td className="py-3 text-right font-medium text-foreground">{source.leads}</td>
                  <td className="py-3 text-right font-medium text-foreground">
                    {source.conversion}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={sources}
              style={{ outline: 'none' }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
                {sources.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={hoveredIndex === index ? '#6B8AFF' : '#A1A1AA'}
                    style={{ transition: 'fill 0.2s', outline: 'none' }}
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
