import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDeals, getDeal, createDeal, updateDeal, deleteDeal, type Deal } from '@/lib/api/deals'

// Query keys для кэширования
export const dealKeys = {
  all: ['deals'] as const,
  lists: () => [...dealKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...dealKeys.lists(), filters] as const,
  details: () => [...dealKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
}

// Хук для получения списка сделок
export function useDeals(params?: {
  search?: string
  pipelineId?: string
  stageId?: string
  assignedToId?: string
  contactId?: string
  companyId?: string
}) {
  return useQuery({
    queryKey: dealKeys.list(params),
    queryFn: () => getDeals(params),
    staleTime: 1 * 60 * 1000, // 1 минута - сделки часто обновляются
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

