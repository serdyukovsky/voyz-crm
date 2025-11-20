import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, MessageSquare, CheckCircle2, FileText, UserPlus } from 'lucide-react'

const activities = [
  {
    type: "deal_closed",
    user: "Sarah Lee",
    action: "closed deal",
    target: "Enterprise License - Acme Corp",
    amount: "$124,500",
    time: "2 hours ago",
    icon: TrendingUp,
    color: "text-green-500",
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
    color: "text-blue-500",
  },
  {
    type: "comment",
    user: "Emily Davis",
    action: "commented on",
    target: "Marketing Platform - BrandX",
    time: "6 hours ago",
    icon: MessageSquare,
    color: "text-purple-500",
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
    color: "text-orange-500",
  },
]

export function RecentActivityCard() {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Recent Activity</CardTitle>
        <p className="text-xs text-muted-foreground">Latest updates from your team</p>
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
