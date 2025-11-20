"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'

const data = [
  { month: 'Jan', revenue: 42000 },
  { month: 'Feb', revenue: 58000 },
  { month: 'Mar', revenue: 71000 },
  { month: 'Apr', revenue: 89000 },
  { month: 'May', revenue: 124000 },
  { month: 'Jun', revenue: 156000 },
  { month: 'Jul', revenue: 189000 },
  { month: 'Aug', revenue: 213000 },
  { month: 'Sep', revenue: 245000 },
  { month: 'Oct', revenue: 268000 },
  { month: 'Nov', revenue: 284000 },
]

export function LineChartCard() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Revenue Over Time</CardTitle>
        <p className="text-xs text-muted-foreground">Monthly revenue trend for current year</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart 
            data={data}
            style={{ outline: 'none' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="month" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`$${value.toLocaleString('en-US')}`, 'Revenue']}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke={isHovered ? '#6B8AFF' : '#71717A'}
              strokeWidth={2.5}
              dot={{ fill: isHovered ? '#6B8AFF' : '#71717A', r: 4 }}
              activeDot={{ r: 6, fill: '#6B8AFF' }}
              style={{ transition: 'stroke 0.2s ease' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
