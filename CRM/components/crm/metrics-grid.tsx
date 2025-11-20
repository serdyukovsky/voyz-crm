import { Card, CardContent } from "@/components/ui/card"
import { Target, TrendingUp, TrendingDown, Percent, CheckCircle2, Clock, DollarSign } from 'lucide-react'

const metrics = [
  {
    label: "Total Deals",
    value: "248",
    change: "+12",
    trend: "up" as const,
    icon: Target,
  },
  {
    label: "Won Deals",
    value: "156",
    change: "+8",
    trend: "up" as const,
    icon: TrendingUp,
  },
  {
    label: "Lost Deals",
    value: "34",
    change: "-3",
    trend: "down" as const,
    icon: TrendingDown,
  },
  {
    label: "Conversion %",
    value: "62.9%",
    change: "+2.1%",
    trend: "up" as const,
    icon: Percent,
  },
  {
    label: "Active Tasks",
    value: "89",
    change: "+15",
    trend: "up" as const,
    icon: CheckCircle2,
  },
  {
    label: "Avg Time per Stage",
    value: "4.2d",
    change: "-0.3d",
    trend: "down" as const,
    icon: Clock,
  },
  {
    label: "Revenue This Month",
    value: "$284k",
    change: "+18%",
    trend: "up" as const,
    icon: DollarSign,
  },
]

export function MetricsGrid() {
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
                <span className={isPositive ? "text-green-500" : "text-red-500"}>
                  {metric.change}
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
