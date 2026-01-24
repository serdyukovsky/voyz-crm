"use client"

import { useState, useEffect } from 'react'

export type ActivityType =
  | 'deal_created'
  | 'field_updated'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'file_uploaded'
  | 'stage_changed'
  | 'stage_change'
  | 'comment'
  | 'internal_note'
  | 'client_message'

export interface Activity {
  id: string
  type: ActivityType
  user: {
    id: string
    name: string
    avatar?: string
  }
  message?: string
  oldValue?: any
  newValue?: any
  fieldName?: string
  fileName?: string
  fileSize?: string
  taskTitle?: string
  timestamp: string
  date: string
  dateSort: Date
}

interface UseDealActivityOptions {
  dealId: string
}

function transformActivityType(type: string): ActivityType {
  const typeMap: Record<string, ActivityType> = {
    'DEAL_CREATED': 'deal_created',
    'FIELD_UPDATED': 'field_updated',
    'CONTACT_UPDATED': 'field_updated',
    'CONTACT_UPDATED_IN_DEAL': 'field_updated',
    'TASK_CREATED': 'task_created',
    'TASK_UPDATED': 'task_updated',
    'TASK_COMPLETED': 'task_completed',
    'FILE_UPLOADED': 'file_uploaded',
    'STAGE_CHANGED': 'stage_changed',
    'COMMENT': 'comment',
    'INTERNAL_NOTE': 'internal_note',
    'CLIENT_MESSAGE': 'client_message',
  }
  return typeMap[type] || 'field_updated'
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return date.toLocaleDateString()
}

function formatActivityDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (activityDate.getTime() === today.getTime()) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  }
  if (activityDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function useDealActivity({ dealId }: UseDealActivityOptions) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const loadActivity = async () => {
    try {
      setLoading(true)
      const API_BASE_URL = typeof window !== 'undefined' ?
        (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api') :
        'http://localhost:3001/api'

      const response = await fetch(`${API_BASE_URL}/activities?dealId=${dealId}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`)
      }

      const data = await response.json()
      const activities = Array.isArray(data) ? data : data.data || []

      // Transform backend activities to frontend Activity interface
      const transformedActivities: Activity[] = activities
        .map((activity: any) => {
          const baseActivity = {
            id: activity.id,
            type: transformActivityType(activity.type),
            user: {
              id: activity.user.id,
              name: activity.user.name,
              avatar: activity.user.avatar,
            },
            timestamp: formatTimeAgo(new Date(activity.createdAt)),
            date: formatActivityDate(new Date(activity.createdAt)),
            dateSort: new Date(activity.createdAt),
          }

          // Parse payload for field updates
          if (activity.payload && typeof activity.payload === 'object') {
            return {
              ...baseActivity,
              fieldName: activity.payload.field,
              oldValue: activity.payload.oldValue,
              newValue: activity.payload.newValue,
              message: activity.payload.message,
            }
          }

          return baseActivity
        })
        .sort((a, b) => a.dateSort.getTime() - b.dateSort.getTime())

      setActivities(transformedActivities)
    } catch (err) {
      console.error('Failed to load activity:', err)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivity()
  }, [dealId])

  const addActivity = (activity: Omit<Activity, 'id' | 'dateSort'>) => {
    const newActivity: Activity = {
      ...activity,
      id: `activity-${Date.now()}`,
      dateSort: new Date(activity.timestamp)
    }
    setActivities(prev => [...prev, newActivity].sort((a, b) => 
      a.dateSort.getTime() - b.dateSort.getTime()
    ))
  }

  const groupByDate = () => {
    const groups: Record<string, Activity[]> = {}
    activities.forEach(activity => {
      const dateKey = new Date(activity.dateSort).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(activity)
    })
    return groups
  }

  return {
    activities,
    loading,
    addActivity,
    groupByDate,
    refetch: loadActivity
  }
}

