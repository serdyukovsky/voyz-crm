import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompanies, getCompany, createCompany, updateCompany, deleteCompany, type Company } from '@/lib/api/companies'

// Query keys для кэширования
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...companyKeys.lists(), filters] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
}

// Хук для получения списка компаний
export function useCompanies(params?: {
  search?: string
  industry?: string
}) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => getCompanies(params),
    staleTime: 5 * 60 * 1000, // 5 минут - компании редко меняются
  })
}

// Хук для получения одной компании
export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => getCompany(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 минут для детальной информации
  })
}

// Хук для создания компании
export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof createCompany>[0]) => createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
    },
  })
}

// Хук для обновления компании
export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCompany>[1] }) => updateCompany(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
    },
  })
}

// Хук для удаления компании
export function useDeleteCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
    },
  })
}

