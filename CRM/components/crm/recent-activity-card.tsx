import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, MessageSquare, CheckCircle2, FileText, UserPlus } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/i18n-context'

const activities = [
  {
    type: "deal_closed",
    user: "Sarah Lee",
    action: "closed deal",
    target: "Enterprise License - Acme Corp",
    amount: "$124,500",
    time: "2 hours ago",
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-400",
  },
  {
    type: "deal_created",
    user: "Mike Johnson",
    action: "created new deal",
    target: "Cloud Platform - TechStart Inc",
    amount: "$48,000",
    time: "4 hours ago",
    icon: FileText,
    color: "text-primary",
  },
  {
    type: "task_assigned",
    user: "Alex Chen",
    action: "assigned task to Emily Davis",
    target: "Follow-up call with CloudFlow",
    time: "5 hours ago",
    icon: CheckCircle2,
    color: "text-slate-600 dark:text-blue-400",
  },
  {
    type: "comment",
    user: "Emily Davis",
    action: "commented on",
    target: "Marketing Platform - BrandX",
    time: "6 hours ago",
    icon: MessageSquare,
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    type: "deal_created",
    user: "Tom Wilson",
    action: "created new deal",
    target: "Analytics Suite - DataHub",
    amount: "$89,500",
    time: "8 hours ago",
    icon: FileText,
    color: "text-primary",
  },
  {
    type: "user_added",
    user: "Sarah Lee",
    action: "added contact",
    target: "John Smith - MegaTech Solutions",
    time: "1 day ago",
    icon: UserPlus,
    color: "text-orange-600 dark:text-orange-400",
  },
]

export function RecentActivityCard() {
  const { t } = useTranslation()
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">{t('dashboard.recentActivity')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('dashboard.latestUpdates')}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon
            return (
              <div 
                key={index} 
                className="flex items-start gap-3 pb-4 border-b border-border/50 last:border-0 last:pb-0"
              >
                <div className={`mt-0.5 h-8 w-8 rounded-md bg-card-foreground/5 flex items-center justify-center ${activity.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.user}</span>
                    {' '}
                    <span className="text-muted-foreground">{activity.action}</span>
                    {' '}
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                    {activity.amount && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-xs font-medium text-foreground">{activity.amount}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
