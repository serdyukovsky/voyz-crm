"use client"

import { useState, useEffect, useCallback } from 'react'
import { getActivities, type Activity, type ActivityFilters } from '@/lib/api/activities'

interface UseActivityOptions {
  entityType: 'deal' | 'contact' | 'company' | 'task'
  entityId: string
  filters?: Omit<ActivityFilters, 'entityType' | 'entityId'>
}

export function useActivity({ entityType, entityId, filters }: UseActivityOptions) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadActivities = useCallback(async () => {
    if (!entityId) {
      setActivities([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getActivities({
        entityType,
        entityId,
        ...filters,
      })
      setActivities(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load activities'))
      console.error('Failed to load activities:', err)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, filters])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  return {
    activities,
    loading,
    error,
    refetch: loadActivities,
  }
}






