"use client"

import React, { useState, useMemo } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import {
  CheckCircle2,
  MessageSquare,
  FileText,
  Clock,
  UserPlus,
  Edit,
  Tag,
  XCircle,
  UserMinus,
  Building2,
  User,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { Activity, ActivityType } from '@/lib/api/activities'

interface ActivityTimelineProps {
  activities: Activity[]
  className?: string
}

const activityIcons: Record<ActivityType, typeof Clock> = {
  DEAL_CREATED: UserPlus,
  DEAL_UPDATED: Edit,
  DEAL_DELETED: Trash2,
  FIELD_UPDATED: Edit,
  STAGE_CHANGED: Tag,
  CONTACT_LINKED: UserPlus,
  CONTACT_UNLINKED: UserMinus,
  CONTACT_UPDATED_IN_DEAL: Edit,
  TASK_CREATED: CheckCircle2,
  TASK_UPDATED: Edit,
  TASK_COMPLETED: CheckCircle2,
  TASK_DELETED: Trash2,
  COMMENT_ADDED: MessageSquare,
  FILE_UPLOADED: FileText,
  FILE_DELETED: Trash2,
  ASSIGNEE_CHANGED: User,
  TAG_ADDED: Tag,
  TAG_REMOVED: Tag,
  CONTACT_CREATED: UserPlus,
  CONTACT_UPDATED: Edit,
  CONTACT_DELETED: Trash2,
  COMPANY_CREATED: Building2,
  COMPANY_UPDATED: Edit,
  COMPANY_DELETED: Trash2,
  EMAIL_SENT: Mail,
  LOGIN: User,
  LOGOUT: User,
}

const activityColors: Record<ActivityType, string> = {
  DEAL_CREATED: 'bg-blue-500/10 text-blue-600',
  DEAL_UPDATED: 'bg-gray-500/10 text-gray-600',
  DEAL_DELETED: 'bg-red-500/10 text-red-600',
  FIELD_UPDATED: 'bg-purple-500/10 text-purple-600',
  STAGE_CHANGED: 'bg-orange-500/10 text-orange-600',
  CONTACT_LINKED: 'bg-green-500/10 text-green-600',
  CONTACT_UNLINKED: 'bg-red-500/10 text-red-600',
  CONTACT_UPDATED_IN_DEAL: 'bg-blue-500/10 text-blue-600',
  TASK_CREATED: 'bg-green-500/10 text-green-600',
  TASK_UPDATED: 'bg-yellow-500/10 text-yellow-600',
  TASK_COMPLETED: 'bg-green-500/10 text-green-600',
  TASK_DELETED: 'bg-red-500/10 text-red-600',
  COMMENT_ADDED: 'bg-blue-500/10 text-blue-600',
  FILE_UPLOADED: 'bg-indigo-500/10 text-indigo-600',
  FILE_DELETED: 'bg-red-500/10 text-red-600',
  ASSIGNEE_CHANGED: 'bg-purple-500/10 text-purple-600',
  TAG_ADDED: 'bg-pink-500/10 text-pink-600',
  TAG_REMOVED: 'bg-pink-500/10 text-pink-600',
  CONTACT_CREATED: 'bg-green-500/10 text-green-600',
  CONTACT_UPDATED: 'bg-blue-500/10 text-blue-600',
  CONTACT_DELETED: 'bg-red-500/10 text-red-600',
  COMPANY_CREATED: 'bg-green-500/10 text-green-600',
  COMPANY_UPDATED: 'bg-blue-500/10 text-blue-600',
  COMPANY_DELETED: 'bg-red-500/10 text-red-600',
  EMAIL_SENT: 'bg-blue-500/10 text-blue-600',
  LOGIN: 'bg-gray-500/10 text-gray-600',
  LOGOUT: 'bg-gray-500/10 text-gray-600',
}

function formatActivityMessage(activity: Activity): string {
  const payload = activity.payload || {}
  
  switch (activity.type) {
    case 'DEAL_CREATED':
      return 'created this deal'
    case 'DEAL_UPDATED':
      return 'updated this deal'
    case 'DEAL_DELETED':
      return 'deleted this deal'
    case 'FIELD_UPDATED':
      const fieldName = payload.fieldName || 'field'
      const oldValue = payload.oldValue
      const newValue = payload.newValue
      if (oldValue !== undefined && newValue !== undefined) {
        return `updated ${fieldName} from "${oldValue}" to "${newValue}"`
      }
      return `updated ${fieldName}`
    case 'STAGE_CHANGED':
      const fromStage = payload.fromStage || payload.from
      const toStage = payload.toStage || payload.to
      if (fromStage && toStage) {
        return `changed stage from "${fromStage}" → "${toStage}"`
      }
      return 'changed stage'
    case 'CONTACT_LINKED':
      return activity.contact 
        ? `linked contact "${activity.contact.fullName}"`
        : 'linked a contact'
    case 'CONTACT_UNLINKED':
      return activity.contact
        ? `unlinked contact "${activity.contact.fullName}"`
        : 'unlinked a contact'
    case 'COMPANY_CREATED':
      return 'created this company'
    case 'COMPANY_UPDATED':
      return 'updated this company'
    case 'COMPANY_DELETED':
      return 'deleted this company'
    case 'CONTACT_CREATED':
      return 'created this contact'
    case 'CONTACT_UPDATED':
      return 'updated this contact'
    case 'CONTACT_DELETED':
      return 'deleted this contact'
    case 'TASK_CREATED':
      return activity.task
        ? `created task "${activity.task.title}"`
        : 'created a task'
    case 'TASK_UPDATED':
      return activity.task
        ? `updated task "${activity.task.title}"`
        : 'updated a task'
    case 'TASK_COMPLETED':
      return activity.task
        ? `completed task "${activity.task.title}"`
        : 'completed a task'
    case 'TASK_DELETED':
      return activity.task
        ? `deleted task "${activity.task.title}"`
        : 'deleted a task'
    case 'COMMENT_ADDED':
      return 'added a comment'
    case 'FILE_UPLOADED':
      return payload.fileName
        ? `uploaded file "${payload.fileName}"`
        : 'uploaded a file'
    case 'FILE_DELETED':
      return payload.fileName
        ? `deleted file "${payload.fileName}"`
        : 'deleted a file'
    case 'ASSIGNEE_CHANGED':
      const fromUser = payload.fromUser || payload.from
      const toUser = payload.toUser || payload.to
      if (fromUser && toUser) {
        return `reassigned from "${fromUser}" to "${toUser}"`
      }
      return 'changed assignee'
    case 'TAG_ADDED':
      return payload.tag ? `added tag "${payload.tag}"` : 'added a tag'
    case 'TAG_REMOVED':
      return payload.tag ? `removed tag "${payload.tag}"` : 'removed a tag'
    case 'EMAIL_SENT':
      return payload.to
        ? `sent email to ${payload.to}${payload.subject ? `: "${payload.subject}"` : ''}`
        : 'sent an email'
    case 'LOGIN':
      return 'logged in'
    case 'LOGOUT':
      return 'logged out'
    default:
      return 'performed an action'
  }
}

function ActivityItem({ activity, isLast }: { activity: Activity; isLast: boolean }) {
  const Icon = activityIcons[activity.type] || Clock
  const message = formatActivityMessage(activity)
  const date = parseISO(activity.createdAt)
  const timeString = format(date, 'h:mm a')

  return (
    <div className="flex gap-3 relative">
      {!isLast && (
        <div className="absolute left-3 top-8 bottom-0 w-px bg-border/50" />
      )}

      <div className="relative z-10 mt-0.5">
        <div className={cn(
          "rounded-full p-1.5",
          activityColors[activity.type] || "bg-gray-500/10 text-gray-600"
        )}>
          <Icon className="h-3 w-3" />
        </div>
      </div>

      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={activity.user.avatar} />
            <AvatarFallback className="text-xs">
              {activity.user.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-medium">{activity.user.name}</span>
              {' '}
              {activity.type === 'STAGE_CHANGED' && message.includes('→') ? (
                <span className="text-muted-foreground">
                  {message.split('→').map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {i === 0 ? (
                        <>
                          {part.trim()}
                          <span className="mx-1 text-primary">→</span>
                        </>
                      ) : (
                        <span className="font-medium text-primary">{part.trim()}</span>
                      )}
                    </React.Fragment>
                  ))}
                </span>
              ) : activity.type === 'FIELD_UPDATED' && message.includes('from') && message.includes('to') ? (
                <span className="text-muted-foreground">
                  {message.split(' from ').map((part, i) => (
                    <React.Fragment key={i}>
                      {i === 0 ? (
                        <>{part}</>
                      ) : (
                        <>
                          {' from '}
                          <span className="text-muted-foreground/70">{part.split(' to ')[0]}</span>
                          {' to '}
                          <span className="font-medium text-primary">{part.split(' to ')[1]}</span>
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </span>
              ) : (
                <span className="text-muted-foreground">{message}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{timeString}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActivityTimeline({ activities, className }: ActivityTimelineProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {}
    
    activities.forEach(activity => {
      const date = parseISO(activity.createdAt)
      const dateKey = format(date, 'yyyy-MM-dd')
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(activity)
    })

    // Sort activities within each group (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
      )
    })

    return groups
  }, [activities])

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  const toggleDate = (dateKey: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) {
        next.delete(dateKey)
      } else {
        next.add(dateKey)
      }
      return next
    })
  }

  if (activities.length === 0) {
    return (
      <div className={cn("py-12 text-center text-muted-foreground text-sm", className)}>
        No activity yet
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {sortedDates.map((dateKey) => {
        const dateActivities = groupedActivities[dateKey]
        const date = parseISO(dateKey)
        const isTodayDate = isToday(date)
        const isYesterdayDate = isYesterday(date)

        let dateLabel = format(date, 'MMMM d, yyyy')
        if (isTodayDate) dateLabel = 'Today'
        if (isYesterdayDate) dateLabel = 'Yesterday'

        const isExpanded = expandedDates.has(dateKey) || sortedDates.length === 1

        return (
          <Collapsible
            key={dateKey}
            open={isExpanded}
            onOpenChange={() => toggleDate(dateKey)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 -mx-2 transition-colors">
                <h4 className="text-xs font-semibold text-foreground">{dateLabel}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {dateActivities.length}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-4 pt-2">
                {dateActivities.map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    isLast={index === dateActivities.length - 1}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}

