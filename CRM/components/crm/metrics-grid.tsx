import { Card, CardContent } from "@/components/ui/card"
import { Target, DollarSign, CheckCircle2, UserPlus } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/i18n-context'
import type { GlobalStats } from '@/lib/api/stats'

interface MetricsGridProps {
  stats: GlobalStats
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}M ₽`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}K ₽`
  }
  return `${amount.toLocaleString('ru-RU')} ₽`
}

export function MetricsGrid({ stats }: MetricsGridProps) {
  const { t } = useTranslation()

  const metrics = [
    {
      label: t('dashboard.totalDeals'),
      value: stats.totalDeals.toLocaleString('ru-RU'),
      icon: Target,
    },
    {
      label: t('dashboard.totalRevenue'),
      value: formatRevenue(stats.totalRevenue),
      icon: DollarSign,
    },
    {
      label: t('dashboard.tasksToday'),
      value: stats.tasksToday.toLocaleString('ru-RU'),
      icon: CheckCircle2,
    },
    {
      label: t('dashboard.newContacts'),
      value: stats.newContacts.toLocaleString('ru-RU'),
      icon: UserPlus,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon

        return (
          <Card key={metric.label} className="border-border/50 bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {metric.value}
                  </p>
                </div>
                <div className="rounded-md bg-primary/10 p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
