import { TrendingUp, TrendingDown, DollarSign, Target, Users, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from '@/lib/i18n/i18n-context'

export function DashboardCards() {
  const { t } = useTranslation()
  
  const stats = [
    {
      label: t('dashboard.totalRevenue'),
      value: "$124,582",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
    },
    {
      label: t('dashboard.activeDeals'),
      value: "38",
      change: "+4",
      trend: "up",
      icon: Target,
    },
    {
      label: t('dashboard.newContacts'),
      value: "142",
      change: "-8",
      trend: "down",
      icon: Users,
    },
    {
      label: t('dashboard.tasksCompleted'),
      value: "89",
      change: "+23",
      trend: "up",
      icon: CheckCircle2,
    },
  ]
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown
        return (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold tracking-tight text-card-foreground">{stat.value}</p>
                </div>
                <div className="rounded-md bg-primary/10 p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <TrendIcon className={`h-3 w-3 ${stat.trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
                <span className={stat.trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {stat.change}
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
