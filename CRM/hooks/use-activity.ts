"use client"

import { useQuery } from '@tanstack/react-query'
import { getActivities, type Activity, type ActivityFilters } from '@/lib/api/activities'

export const activityKeys = {
  all: ['activities'] as const,
  list: (entityType: string, entityId: string) => [...activityKeys.all, entityType, entityId] as const,
}

interface UseActivityOptions {
  entityType: 'deal' | 'contact' | 'company' | 'task'
  entityId: string
  filters?: Omit<ActivityFilters, 'entityType' | 'entityId'>
}

export function useActivity({ entityType, entityId, filters }: UseActivityOptions) {
  const { data: activities = [], isLoading: loading, error } = useQuery({
    queryKey: activityKeys.list(entityType, entityId),
    queryFn: () => getActivities({
      entityType,
      entityId,
      ...filters,
    }),
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000,
  })

  return {
    activities,
    loading,
    error,
  }
}
