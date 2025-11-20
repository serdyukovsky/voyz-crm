"use client"

import { CheckCircle2, MessageSquare, FileText, Clock, UserPlus, Edit, Tag } from 'lucide-react'
import { format } from "date-fns"
import type { Activity, ActivityType } from '@/hooks/use-deal-activity'

interface DealActivityTimelineProps {
  activities: Activity[]
  groupByDate?: boolean
}

const activityIcons: Record<ActivityType, typeof CheckCircle2> = {
  deal_created: UserPlus,
  field_updated: Edit,
  task_created: CheckCircle2,
  task_updated: CheckCircle2,
  task_completed: CheckCircle2,
  file_uploaded: FileText,
  stage_changed: Tag,
  comment: MessageSquare,
  internal_note: MessageSquare,
  client_message: MessageSquare
}

export function DealActivityTimeline({
  activities,
  groupByDate = true
}: DealActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No activity yet
      </div>
    )
  }

  if (!groupByDate) {
    return (
      <div className="space-y-6">
        {activities.map((activity, index) => (
          <ActivityItem key={activity.id} activity={activity} isLast={index === activities.length - 1} />
        ))}
      </div>
    )
  }

  // Group by date
  const grouped = activities.reduce((acc, activity) => {
    const dateKey = format(new Date(activity.dateSort), 'yyyy-MM-dd')
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(activity)
    return acc
  }, {} as Record<string, Activity[]>)

  const sortedDates = Object.keys(grouped).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const dateActivities = grouped[dateKey]
        const date = new Date(dateKey)
        const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey
        const isYesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === dateKey

        let dateLabel = format(date, 'MMMM d, yyyy')
        if (isToday) dateLabel = 'Today'
        if (isYesterday) dateLabel = 'Yesterday'

        return (
          <div key={dateKey} className="space-y-4">
            <div className="sticky top-0 z-10 bg-card py-2">
              <h4 className="text-xs font-semibold text-foreground">{dateLabel}</h4>
            </div>
            {dateActivities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLast={index === dateActivities.length - 1}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ActivityItem({ activity, isLast }: { activity: Activity; isLast: boolean }) {
  const Icon = activityIcons[activity.type] || Clock

  return (
    <div className="flex gap-3 relative">
      {!isLast && (
        <div className="absolute left-3 top-8 bottom-0 w-px bg-border/50" />
      )}

      <div className="relative z-10 mt-0.5">
        <div className="rounded-full bg-primary/10 p-1.5">
          <Icon className="h-3 w-3 text-primary" />
        </div>
      </div>

      <div className="flex-1 pb-2">
        <p className="text-sm text-foreground leading-relaxed">
          <span className="font-medium">{activity.user.name}</span>
          {' '}
          {activity.type === 'field_updated' && activity.fieldName && (
            <>
              updated <span className="font-medium">{activity.fieldName}</span>
              {activity.oldValue !== undefined && activity.newValue !== undefined && (
                <>
                  {' '}from <span className="text-muted-foreground">{String(activity.oldValue)}</span>
                  {' '}to <span className="text-muted-foreground">{String(activity.newValue)}</span>
                </>
              )}
            </>
          )}
          {activity.type === 'stage_changed' && activity.message && (
            <span className="text-muted-foreground">{activity.message}</span>
          )}
          {activity.type === 'comment' && activity.message && (
            <span className="text-muted-foreground">{activity.message}</span>
          )}
          {activity.type === 'file_uploaded' && activity.fileName && (
            <>
              uploaded <span className="font-medium">{activity.fileName}</span>
              {activity.fileSize && (
                <span className="text-muted-foreground"> ({activity.fileSize})</span>
              )}
            </>
          )}
          {activity.type === 'task_created' && activity.taskTitle && (
            <>
              created task <span className="font-medium">{activity.taskTitle}</span>
            </>
          )}
          {activity.type === 'task_completed' && activity.taskTitle && (
            <>
              completed task <span className="font-medium">{activity.taskTitle}</span>
            </>
          )}
          {activity.type === 'deal_created' && (
            <span className="text-muted-foreground">created this deal</span>
          )}
          {!activity.message && !activity.fieldName && !activity.fileName && !activity.taskTitle && activity.type === 'comment' && (
            <span className="text-muted-foreground">added a comment</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
      </div>
    </div>
  )
}

