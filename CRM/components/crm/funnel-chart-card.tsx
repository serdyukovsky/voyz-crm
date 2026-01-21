"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'

const data = [
  { stage: 'New', count: 248, value: 248 },
  { stage: 'Qualified', count: 198, value: 198 },
  { stage: 'In Progress', count: 145, value: 145 },
  { stage: 'Negotiation', count: 89, value: 89 },
  { stage: 'Closed Won', count: 156, value: 156 },
]

export function FunnelChartCard() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <Card className="border-border/50 bg-card gap-4">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Sales Funnel</CardTitle>
        <p className="text-xs text-muted-foreground">Deal progression through pipeline stages</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart 
            data={data} 
            layout="vertical"
            style={{ outline: 'none' }}
            onMouseMove={(state) => {
              if (state.isTooltipActive) {
                setHoveredIndex(state.activeTooltipIndex ?? null)
              }
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              type="number" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis 
              dataKey="stage" 
              type="category" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              width={80} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={hoveredIndex === index ? '#6B8AFF' : '#A1A1AA'}
                  style={{ transition: 'fill 0.2s ease' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
