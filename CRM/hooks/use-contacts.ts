import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getContacts, getContact, createContact, updateContact, deleteContact, getCompanies, type Contact, type CreateContactDto, type UpdateContactDto, type Company } from '@/lib/api/contacts'

// Query keys для кэширования
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...contactKeys.lists(), filters] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  companies: () => [...contactKeys.all, 'companies'] as const,
}

// Хук для получения списка контактов
export function useContacts(params?: {
  search?: string
  companyName?: string
  companyId?: string
  hasActiveDeals?: boolean
  hasClosedDeals?: boolean
}) {
  return useQuery({
    queryKey: contactKeys.list(params),
    queryFn: () => getContacts(params),
    staleTime: 2 * 60 * 1000, // 2 минуты для списков
  })
}

// Хук для получения одного контакта
export function useContact(id: string) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => getContact(id),
    enabled: !!id, // Запрос выполняется только если есть id
    staleTime: 5 * 60 * 1000, // 5 минут для детальной информации
  })
}

// Хук для получения компаний
export function useCompanies() {
  return useQuery({
    queryKey: contactKeys.companies(),
    queryFn: () => getCompanies(),
    staleTime: 10 * 60 * 1000, // 10 минут - компании редко меняются
  })
}

// Хук для создания контакта
export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateContactDto) => createContact(data),
    onSuccess: () => {
      // Инвалидируем кэш списков контактов
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}

// Хук для обновления контакта
export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactDto }) => updateContact(id, data),
    onSuccess: (_, variables) => {
      // Инвалидируем кэш конкретного контакта и списков
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}

// Хук для удаления контакта
export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      // Инвалидируем кэш списков контактов
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}

