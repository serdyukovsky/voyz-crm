import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPipelines, getPipeline, createPipeline, updatePipeline, deletePipeline } from '@/lib/api/pipelines'

// Query keys для кэширования
export const pipelineKeys = {
  all: ['pipelines'] as const,
  lists: () => [...pipelineKeys.all, 'list'] as const,
  list: () => [...pipelineKeys.lists()] as const,
  details: () => [...pipelineKeys.all, 'detail'] as const,
  detail: (id: string) => [...pipelineKeys.details(), id] as const,
}

// Хук для получения списка пайплайнов
export function usePipelines() {
  return useQuery({
    queryKey: pipelineKeys.list(),
    queryFn: () => getPipelines(),
    staleTime: 10 * 60 * 1000, // 10 минут - пайплайны редко меняются
  })
}

// Хук для получения одного пайплайна
export function usePipeline(id: string) {
  return useQuery({
    queryKey: pipelineKeys.detail(id),
    queryFn: () => getPipeline(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

// Хук для создания пайплайна
export function useCreatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof createPipeline>[0]) => createPipeline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() })
    },
  })
}

// Хук для обновления пайплайна
export function useUpdatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updatePipeline>[1] }) => updatePipeline(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() })
    },
  })
}

// Хук для удаления пайплайна
export function useDeletePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletePipeline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() })
    },
  })
}

