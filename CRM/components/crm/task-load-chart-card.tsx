"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n/i18n-context'
import type { TopCompany } from '@/lib/api/stats'

interface TaskLoadChartCardProps {
  data: TopCompany[]
}

export function TaskLoadChartCard({ data }: TaskLoadChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { t } = useTranslation()

  const chartData = data.map(item => ({
    name: item.companyName,
    deals: item.dealCount,
  }))

  return (
    <Card className="border-border/50 bg-card gap-4">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{t('dashboard.topCompanies')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('dashboard.topCompaniesDesc')}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            {t('dashboard.noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
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
                dataKey="name"
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
                formatter={(value: number) => [value, t('dashboard.deals')]}
              />
              <Bar dataKey="deals" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={hoveredIndex === index ? '#6B8AFF' : '#A1A1AA'}
                    style={{ transition: 'fill 0.2s ease' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
