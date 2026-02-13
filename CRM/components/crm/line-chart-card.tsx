"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n/i18n-context'
import type { RevenueTrend } from '@/lib/api/stats'

interface LineChartCardProps {
  data: RevenueTrend[]
}

export function LineChartCard({ data }: LineChartCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { t } = useTranslation()

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    revenue: item.revenue,
  }))

  const hasData = chartData.some(item => item.revenue > 0)

  return (
    <Card className="border-border/50 bg-card gap-4">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{t('dashboard.revenueTrend')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('dashboard.revenueTrendDesc')}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!hasData ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            {t('dashboard.noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              style={{ outline: 'none' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toLocaleString('ru-RU')}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, t('dashboard.revenue')]}
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
        )}
      </CardContent>
    </Card>
  )
}
