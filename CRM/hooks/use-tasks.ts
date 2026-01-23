'use client'

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, createTask, updateTask, deleteTask, type Task } from '@/lib/api/tasks'

// Query keys для кэширования
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
  infiniteLists: () => [...taskKeys.all, 'infinite'] as const,
  infiniteList: (filters?: Record<string, unknown>) => [...taskKeys.infiniteLists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

// Хук для получения списка задач с кэшированием
export function useTasks(params?: {
  search?: string
  status?: string
  assignedToId?: string
  dealId?: string
  contactId?: string
  companyId?: string
  limit?: number
  cursor?: string
  enabled?: boolean
}) {
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: taskKeys.list(queryParams),
    queryFn: () => getTasks(queryParams),
    // Кэширование на 2 минуты
    staleTime: 2 * 60 * 1000,
    // Можно отключить запрос условно (например, если нет выбранного deal)
    enabled,
  })
}

/**
 * Хук для infinite scroll загрузки задач (incremental loading)
 * Загружает tasks порциями с поддержкой cursor-based pagination
 *
 * Полезно для больших списков (500+ tasks)
 */
export function useInfiniteTasks(params?: Omit<Parameters<typeof useTasks>[0], 'enabled'> & { enabled?: boolean; pageSize?: number }) {
  const { enabled = true, pageSize = 100, ...filterParams } = params || {}

  return useInfiniteQuery({
    queryKey: taskKeys.infiniteList(filterParams),
    queryFn: ({ pageParam = undefined }) =>
      getTasks({
        ...filterParams,
        cursor: pageParam as string | undefined,
        limit: pageSize,
      }),
    getNextPageParam: (lastPage) => (lastPage as any)?.nextCursor,
    initialPageParam: undefined,
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

// Хок для создания задачи
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof createTask>[0]) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

// Хук для обновления задачи
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTask>[1] }) => updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

// Хук для удаления задачи
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}
