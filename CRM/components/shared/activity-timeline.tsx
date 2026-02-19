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
  StickyNote,
  Pin,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/i18n-context'
import type { Activity, ActivityType } from '@/lib/api/activities'

interface ActivityTimelineProps {
  activities: Activity[]
  className?: string
  pipelineStages?: Array<{ id: string; name: string }>
  onUnpinNote?: (commentId: string) => Promise<void>
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
  DEAL_CREATED: 'bg-slate-100 dark:bg-blue-500/10 text-slate-600 dark:text-blue-400',
  DEAL_UPDATED: 'bg-slate-100 dark:bg-gray-500/10 text-slate-600 dark:text-gray-300',
  DEAL_DELETED: 'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  FIELD_UPDATED: 'bg-purple-500/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  STAGE_CHANGED: 'bg-orange-500/10 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
  CONTACT_LINKED: 'bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  CONTACT_UNLINKED: 'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  CONTACT_UPDATED_IN_DEAL: 'bg-slate-100 dark:bg-blue-500/10 text-slate-600 dark:text-blue-400',
  TASK_CREATED: 'bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  TASK_UPDATED: 'bg-yellow-500/10 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  TASK_COMPLETED: 'bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  TASK_DELETED: 'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  COMMENT_ADDED: 'bg-slate-100 dark:bg-blue-500/10 text-slate-600 dark:text-blue-400',
  FILE_UPLOADED: 'bg-indigo-500/10 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  FILE_DELETED: 'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  ASSIGNEE_CHANGED: 'bg-purple-500/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  TAG_ADDED: 'bg-pink-500/10 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400',
  TAG_REMOVED: 'bg-pink-500/10 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400',
  CONTACT_CREATED: 'bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  CONTACT_UPDATED: 'bg-slate-100 dark:bg-blue-500/10 text-slate-600 dark:text-blue-400',
  CONTACT_DELETED: 'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  COMPANY_CREATED: 'bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  COMPANY_UPDATED: 'bg-slate-100 dark:bg-blue-500/10 text-slate-600 dark:text-blue-400',
  COMPANY_DELETED: 'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  EMAIL_SENT: 'bg-slate-100 dark:bg-blue-500/10 text-slate-600 dark:text-blue-400',
  LOGIN: 'bg-slate-100 dark:bg-gray-500/10 text-slate-600 dark:text-gray-300',
  LOGOUT: 'bg-slate-100 dark:bg-gray-500/10 text-slate-600 dark:text-gray-300',
}

function formatActivityMessage(activity: Activity, pipelineStages?: Array<{ id: string; name: string }>, t?: (key: string) => string): string | null {
  const payload = activity.payload || {}
  const translate = t || ((key: string) => key)
  
  switch (activity.type) {
    case 'DEAL_CREATED':
      return translate('deals.createdThisDeal')
    case 'DEAL_UPDATED':
      // Show detailed changes if available
      const changes = payload.changes
      if (Array.isArray(changes) && changes.length > 0) {
        // Filter out changes that are already covered by specific events
        const significantChanges = changes.filter(change => 
          change !== 'stage' && change !== 'contact' && change !== 'assignee'
        )
        
        if (significantChanges.length > 0) {
          const changeLabels: Record<string, string> = {
            amount: translate('deals.amount').toLowerCase(),
            title: translate('deals.dealName').toLowerCase(),
            company: translate('deals.company').toLowerCase(),
            description: translate('tasks.taskDescription').toLowerCase(),
            expectedCloseDate: translate('deals.expectedCloseDate').toLowerCase(),
            probability: translate('deals.probability').toLowerCase(),
          }
          
          const labels = significantChanges
            .map(change => changeLabels[change] || change)
            .join(', ')
          
          return `${translate('deals.updatedThisDeal')} ${labels}`
        }
      }
      // If no significant changes or changes are already covered by other events, return null to hide
      return null
    case 'DEAL_DELETED':
      return translate('deals.deletedThisDeal')
    case 'FIELD_UPDATED':
      // Use parsed fields from activity if available, otherwise fallback to payload
      const fieldName = (activity as any).fieldName || payload.fieldName || translate('deals.fields')
      const oldValue = (activity as any).oldValue !== undefined ? (activity as any).oldValue : payload.oldValue
      const newValue = (activity as any).newValue !== undefined ? (activity as any).newValue : payload.newValue
      if (oldValue !== undefined && newValue !== undefined) {
        return `${translate('deals.updatedThisDeal')} ${fieldName} ${translate('common.from')} "${oldValue}" ${translate('common.to')} "${newValue}"`
      }
      return `${translate('deals.updatedThisDeal')} ${fieldName}`
    case 'STAGE_CHANGED':
      let fromStage = payload.fromStage || payload.from
      let toStage = payload.toStage || payload.to
      
      // If we have stage IDs but not names, try to get names from pipeline stages
      if (pipelineStages && (!fromStage || fromStage.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
        const fromStageId = payload.fromStageId || fromStage
        const foundFromStage = pipelineStages.find(s => s.id === fromStageId)
        if (foundFromStage) {
          fromStage = foundFromStage.name
        }
      }
      
      if (pipelineStages && (!toStage || toStage.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
        const toStageId = payload.toStageId || toStage
        const foundToStage = pipelineStages.find(s => s.id === toStageId)
        if (foundToStage) {
          toStage = foundToStage.name
        }
      }
      
      if (fromStage && toStage) {
        return `${translate('deals.changedStage')} ${translate('common.from')} "${fromStage}" → "${toStage}"`
      }
      return translate('deals.changedStage')
    case 'CONTACT_LINKED':
      return activity.contact 
        ? `${translate('deals.linkedContact')} "${activity.contact.fullName}"`
        : translate('deals.linkedContact')
    case 'CONTACT_UNLINKED':
      return activity.contact
        ? `${translate('deals.unlinkedContact')} "${activity.contact.fullName}"`
        : translate('deals.unlinkedContact')
    case 'CONTACT_UPDATED_IN_DEAL':
      // Updated contact field in deal - show field change details
      const contactFieldName = (activity as any).fieldName || payload.fieldName || translate('deals.fields')
      const contactOldValue = (activity as any).oldValue !== undefined ? (activity as any).oldValue : payload.oldValue
      const contactNewValue = (activity as any).newValue !== undefined ? (activity as any).newValue : payload.newValue
      if (contactOldValue !== undefined && contactNewValue !== undefined) {
        return `${translate('deals.updatedThisDeal')} ${contactFieldName} ${translate('common.from')} "${contactOldValue}" ${translate('common.to')} "${contactNewValue}"`
      }
      return `${translate('deals.updatedThisDeal')} ${contactFieldName}`
    case 'COMPANY_CREATED':
      return translate('companies.createdThisCompany')
    case 'COMPANY_UPDATED':
      return translate('companies.updatedThisCompany')
    case 'COMPANY_DELETED':
      return translate('companies.deletedThisCompany')
    case 'CONTACT_CREATED':
      return translate('contacts.createdThisContact')
    case 'CONTACT_UPDATED':
      return translate('contacts.updatedThisContact')
    case 'CONTACT_DELETED':
      return translate('contacts.deletedThisContact')
    case 'TASK_CREATED':
      return activity.task
        ? `${translate('deals.createdTask')} "${activity.task.title}"`
        : translate('deals.createdTask')
    case 'TASK_UPDATED':
      return activity.task
        ? `${translate('deals.updatedTask')} "${activity.task.title}"`
        : translate('deals.updatedTask')
    case 'TASK_COMPLETED':
      return activity.task
        ? `${translate('deals.completedTask')} "${activity.task.title}"`
        : translate('deals.completedTask')
    case 'TASK_DELETED':
      return activity.task
        ? `${translate('deals.deletedTask')} "${activity.task.title}"`
        : translate('deals.deletedTask')
    case 'COMMENT_ADDED':
      // Return simple message, content will be displayed separately
      return translate('deals.commented')
    case 'FILE_UPLOADED':
      return payload.fileName
        ? `${translate('deals.uploadedFile')} "${payload.fileName}"`
        : translate('deals.uploadedFile')
    case 'FILE_DELETED':
      return payload.fileName
        ? `${translate('deals.deletedFile')} "${payload.fileName}"`
        : translate('deals.deletedFile')
    case 'ASSIGNEE_CHANGED':
      const fromUser = payload.fromUser || payload.from
      const toUser = payload.toUser || payload.to
      if (fromUser && toUser) {
        return `${translate('deals.reassigned')} ${translate('common.from')} "${fromUser}" ${translate('common.to')} "${toUser}"`
      }
      return translate('deals.reassigned')
    case 'TAG_ADDED':
      return payload.tag ? `${translate('deals.addedTag')} "${payload.tag}"` : translate('deals.addedTag')
    case 'TAG_REMOVED':
      return payload.tag ? `${translate('deals.removedTag')} "${payload.tag}"` : translate('deals.removedTag')
    case 'EMAIL_SENT':
      return payload.to
        ? `${translate('deals.sentEmail')} ${payload.to}${payload.subject ? `: "${payload.subject}"` : ''}`
        : translate('deals.sentEmail')
    case 'LOGIN':
      return translate('auth.loggedIn')
    case 'LOGOUT':
      return translate('auth.loggedOut')
    default:
      return translate('deals.performedAction')
  }
}

// Check if activity is an internal note
function isInternalNote(activity: Activity): boolean {
  return activity.type === 'COMMENT_ADDED' && activity.payload?.commentType === 'INTERNAL_NOTE'
}

// Pinned note item component
function PinnedNoteItem({ activity, onUnpin }: { activity: Activity; onUnpin?: (commentId: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [isUnpinning, setIsUnpinning] = useState(false)
  const date = parseISO(activity.createdAt)
  const dateString = format(date, 'dd.MM.yyyy HH:mm')

  const handleUnpin = async () => {
    if (!onUnpin || !activity.payload?.commentId) return
    setIsUnpinning(true)
    try {
      await onUnpin(activity.payload.commentId)
    } catch (error) {
      console.error('Failed to unpin note:', error)
    } finally {
      setIsUnpinning(false)
    }
  }

  return (
    <div className="flex gap-3 p-3 bg-card border border-primary/30 rounded-lg group shadow-sm">
      <div className="shrink-0 mt-0.5">
        <div className="rounded-full p-1.5 bg-primary/10 text-primary">
          <StickyNote className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{dateString}</span>
            <span>{activity.user.name}</span>
          </div>
          {onUnpin && activity.payload?.commentId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleUnpin}
              disabled={isUnpinning}
              title={t('deals.unpinNote') || 'Открепить'}
            >
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {activity.payload?.content || ''}
        </p>
      </div>
    </div>
  )
}

function ActivityItem({ activity, isLast, pipelineStages }: { activity: Activity; isLast: boolean; pipelineStages?: Array<{ id: string; name: string }> }) {
  const { t } = useTranslation()
  const Icon = activityIcons[activity.type] || Clock
  const message = formatActivityMessage(activity, pipelineStages, t)
  const date = parseISO(activity.createdAt)
  const timeString = format(date, 'h:mm a')

  // Hide DEAL_UPDATED events that don't have meaningful information
  if (!message) {
    return null
  }

  return (
    <div className="flex gap-3 relative">
      {!isLast && (
        <div className="absolute left-3 top-8 bottom-0 w-px bg-border/50" />
      )}

      <div className="relative z-10 mt-0.5">
        <div className={cn(
          "rounded-full p-1.5",
          activityColors[activity.type] || "bg-gray-500/10 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300"
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
                  {activity.type === 'COMMENT_ADDED' ? (
                <>
                  <span className="text-muted-foreground">{message}</span>
                  {activity.payload?.content && (
                    <div className="mt-2 text-sm text-foreground bg-muted/50 rounded-md p-2 whitespace-pre-wrap break-words">
                      {activity.payload.content}
                    </div>
                  )}
                </>
              ) : activity.type === 'STAGE_CHANGED' && message.includes('→') ? (
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

export function ActivityTimeline({ activities, className, pipelineStages, onUnpinNote }: ActivityTimelineProps) {
  const { t } = useTranslation()

  // Separate pinned notes from regular activities
  const { pinnedNotes, regularActivities } = useMemo(() => {
    const pinned: Activity[] = []
    const regular: Activity[] = []

    activities.forEach(activity => {
      if (isInternalNote(activity)) {
        pinned.push(activity)
      } else {
        regular.push(activity)
      }
    })

    // Sort pinned notes by date (newest first)
    pinned.sort((a, b) =>
      parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
    )

    return { pinnedNotes: pinned, regularActivities: regular }
  }, [activities])

  // Group regular activities by date, pre-filtering out activities with no message
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {}

    regularActivities.forEach(activity => {
      // Pre-filter: skip activities that formatActivityMessage would return null for
      const message = formatActivityMessage(activity, pipelineStages, t)
      if (message === null) return

      const date = parseISO(activity.createdAt)
      const dateKey = format(date, 'yyyy-MM-dd')

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(activity)
    })

    // Sort activities within each group (oldest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) =>
        parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime()
      )
    })

    return groups
  }, [regularActivities, pipelineStages, t])

  const sortedDates = useMemo(() => 
    Object.keys(groupedActivities).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    ), [groupedActivities])

  // Initialize expandedDates with all dates - all sections should be expanded by default
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Update expandedDates when sortedDates changes - always expand all sections
  React.useEffect(() => {
    setExpandedDates(new Set(sortedDates))
  }, [sortedDates.join(',')])

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
        {t('deals.noActivity')}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Pinned Notes Section - Sticky at top */}
      {pinnedNotes.length > 0 && (
        <div className="sticky top-[-24px] z-20 space-y-2 pb-4 -mx-6 px-6 pt-6 bg-background">
          {pinnedNotes.map((note) => (
            <PinnedNoteItem key={note.id} activity={note} onUnpin={onUnpinNote} />
          ))}
        </div>
      )}

      {/* Regular Activity Timeline */}
      {sortedDates.map((dateKey) => {
        const dateActivities = groupedActivities[dateKey]
        const date = parseISO(dateKey)
        const isTodayDate = isToday(date)
        const isYesterdayDate = isYesterday(date)

        let dateLabel = format(date, 'MMMM d, yyyy')
        if (isTodayDate) dateLabel = t('deals.today')
        if (isYesterdayDate) dateLabel = t('deals.yesterday')

        // All sections should be expanded by default
        const isExpanded = expandedDates.has(dateKey)

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
                      pipelineStages={pipelineStages}
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

