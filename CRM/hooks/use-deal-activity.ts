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

export function useDealActivity({ dealId }: UseDealActivityOptions) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const loadActivity = async () => {
    try {
      setLoading(true)
      // TODO: Fetch from API
      // const response = await fetch(`/api/deals/${dealId}/activity`)
      // const data = await response.json()
      
      // For new deals, return empty array
      const isNew = typeof window !== 'undefined' && 
        sessionStorage.getItem(`deal-${dealId}-isNew`) === 'true'
      
      if (isNew) {
        setActivities([])
        return
      }

      // Mock data for existing deals
      const mockActivities: Activity[] = [
        {
          id: "1",
          type: "stage_change",
          user: { id: "1", name: "Alex Chen" },
          message: "moved deal from Lead to Qualified",
          timestamp: "2 hours ago",
          date: "Today at 2:30 PM",
          dateSort: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: "2",
          type: "comment",
          user: { id: "2", name: "Sarah Lee" },
          message: "Had a great call with the client. They're interested in the enterprise package.",
          timestamp: "5 hours ago",
          date: "Today at 11:15 AM",
          dateSort: new Date(Date.now() - 5 * 60 * 60 * 1000)
        }
      ].sort((a, b) => a.dateSort.getTime() - b.dateSort.getTime())

      setActivities(mockActivities)
    } catch (err) {
      console.error('Failed to load activity:', err)
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

