import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDeals, getDeal, createDeal, updateDeal, deleteDeal, type Deal } from '@/lib/api/deals'

// Query keys для кэширования
export const dealKeys = {
  all: ['deals'] as const,
  lists: () => [...dealKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...dealKeys.lists(), filters] as const,
  infiniteLists: () => [...dealKeys.all, 'infinite'] as const,
  infiniteList: (filters?: Record<string, unknown>) => [...dealKeys.infiniteLists(), filters] as const,
  details: () => [...dealKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
}

// Хук для получения списка сделок
export function useDeals(params?: {
  search?: string
  pipelineId?: string
  stageId?: string
  stageIds?: string[]
  assignedToId?: string
  contactId?: string
  companyId?: string
  createdById?: string
  title?: string
  number?: string
  description?: string
  amountMin?: number
  amountMax?: number
  budgetMin?: number
  budgetMax?: number
  dateFrom?: string
  dateTo?: string
  dateType?: 'created' | 'closed' | 'expectedClose'
  expectedCloseFrom?: string
  expectedCloseTo?: string
  tags?: string[]
  rejectionReasons?: string[]
  activeStagesOnly?: boolean
  contactSubscriberCountMin?: number
  contactSubscriberCountMax?: number
  contactDirections?: string[]
  taskStatuses?: string[]
  limit?: number
  cursor?: string
  enabled?: boolean
}) {
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: dealKeys.list(queryParams),
    queryFn: () => getDeals(queryParams),
    // Кэширование на 5 минут (как в query-client default)
    staleTime: 5 * 60 * 1000,
    // Можно отключить запрос условно (например, если нет выбранного pipeline)
    enabled,
  })
}

/**
 * Хук для infinite scroll загрузки сделок (incremental loading)
 * Загружает deals порциями с поддержкой cursor-based pagination
 *
 * Полезно для больших списков (500+ deals)
 */
export function useInfiniteDeals(params?: Omit<Parameters<typeof useDeals>[0], 'enabled'> & { enabled?: boolean; pageSize?: number }) {
  const { enabled = true, pageSize = 100, ...filterParams } = params || {}

  return useInfiniteQuery({
    queryKey: dealKeys.infiniteList(filterParams),
    queryFn: ({ pageParam = undefined }) =>
      getDeals({
        ...filterParams,
        cursor: pageParam as string | undefined,
        limit: pageSize,
      }),
    getNextPageParam: (lastPage) => (lastPage as any)?.nextCursor,
    initialPageParam: undefined,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

// Хук для получения одной сделки
export function useDeal(id: string) {
  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: () => getDeal(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 минуты для детальной информации
  })
}

// Хук для создания сделки
export function useCreateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof createDeal>[0]) => createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() })
    },
  })
}

// Хук для обновления сделки
export function useUpdateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateDeal>[1] }) => updateDeal(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() })
    },
  })
}

// Хук для удаления сделки
export function useDeleteDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() })
    },
  })
}

