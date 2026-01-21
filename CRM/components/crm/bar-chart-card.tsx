"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { week: 'Week 1', deals: 12 },
  { week: 'Week 2', deals: 18 },
  { week: 'Week 3', deals: 24 },
  { week: 'Week 4', deals: 15 },
  { week: 'Week 5', deals: 28 },
  { week: 'Week 6', deals: 22 },
  { week: 'Week 7', deals: 31 },
  { week: 'Week 8', deals: 26 },
]

export function BarChartCard() {

  return (
    <Card className="border-border/50 bg-card gap-4">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Deals Per Week</CardTitle>
        <p className="text-xs text-muted-foreground">Weekly deal creation trend</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart 
            data={data}
            style={{ outline: 'none' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="week" 
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
            <Bar dataKey="deals" radius={[4, 4, 0, 0]} fill="#A1A1AA">
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
