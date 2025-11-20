"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { useState } from 'react'

const data = [
  { user: 'Sarah Lee', active: 24, completed: 56 },
  { user: 'Mike Johnson', active: 18, completed: 42 },
  { user: 'Alex Chen', active: 31, completed: 68 },
  { user: 'Emily Davis', active: 15, completed: 38 },
  { user: 'Tom Wilson', active: 22, completed: 51 },
]

export function TaskLoadChartCard() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Task Load Per User</CardTitle>
        <p className="text-xs text-muted-foreground">Active vs completed tasks by team member</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart 
            data={data}
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
              dataKey="user" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
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
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
            <Bar dataKey="active" radius={[4, 4, 0, 0]} name="Active">
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-active-${index}`} 
                  fill={hoveredIndex === index ? '#6B8AFF' : '#A1A1AA'}
                  style={{ transition: 'fill 0.2s ease' }}
                />
              ))}
            </Bar>
            <Bar dataKey="completed" radius={[4, 4, 0, 0]} name="Completed">
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-completed-${index}`} 
                  fill={hoveredIndex === index ? '#A8B5FF' : '#71717A'}
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
