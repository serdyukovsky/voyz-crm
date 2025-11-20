"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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
            margin={{ bottom: 0, top: 0, left: 0, right: 0 }}
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
            <Bar dataKey="active" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-active-${index}`} 
                  fill={hoveredIndex === index ? '#6B8AFF' : '#A1A1AA'}
                  style={{ transition: 'fill 0.2s ease' }}
                />
              ))}
            </Bar>
            <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
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
        
        {/* Custom Legend */}
        <div className="flex justify-center gap-4 pt-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#A1A1AA]" />
            <span className="text-xs text-foreground">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#71717A]" />
            <span className="text-xs text-foreground">Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
