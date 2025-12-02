import { Card, CardContent } from "@/components/ui/card"
import { Target, TrendingUp, TrendingDown, Percent, CheckCircle2, Clock, DollarSign } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/i18n-context'

export function MetricsGrid() {
  const { t } = useTranslation()
  
  const metrics = [
    {
      label: t('dashboard.totalDeals'),
      value: "248",
      change: "+12",
      trend: "up" as const,
      icon: Target,
    },
    {
      label: t('dashboard.wonDeals'),
      value: "156",
      change: "+8",
      trend: "up" as const,
      icon: TrendingUp,
    },
    {
      label: t('dashboard.lostDeals'),
      value: "34",
      change: "-3",
      trend: "down" as const,
      icon: TrendingDown,
    },
    {
      label: t('dashboard.conversionPercent'),
      value: "62.9%",
      change: "+2.1%",
      trend: "up" as const,
      icon: Percent,
    },
    {
      label: t('dashboard.activeTasks'),
      value: "89",
      change: "+15",
      trend: "up" as const,
      icon: CheckCircle2,
    },
    {
      label: t('dashboard.avgTimePerStage'),
      value: "4.2d",
      change: "-0.3d",
      trend: "down" as const,
      icon: Clock,
    },
    {
      label: t('dashboard.revenueThisMonth'),
      value: "$284k",
      change: "+18%",
      trend: "up" as const,
      icon: DollarSign,
    },
  ]
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        const isPositive = metric.trend === "up"
        
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
              <div className="mt-3 flex items-center gap-1 text-xs">
                <span className={isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {metric.change}
                </span>
                <span className="text-muted-foreground">{t('dashboard.vsLastMonth')}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
