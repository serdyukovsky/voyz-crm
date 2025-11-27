import { QueryClient } from '@tanstack/react-query'

// Настройка QueryClient с оптимизированным кэшированием
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Время, в течение которого данные считаются свежими (5 минут)
      staleTime: 5 * 60 * 1000,
      // Время хранения неиспользуемых данных в кэше (10 минут)
      gcTime: 10 * 60 * 1000, // ранее cacheTime
      // Автоматический рефетч при фокусе окна
      refetchOnWindowFocus: true,
      // Автоматический рефетч при переподключении
      refetchOnReconnect: true,
      // Не делать рефетч при монтировании, если данные свежие
      refetchOnMount: true,
      // Повторные попытки при ошибке
      retry: 1,
      // Задержка между повторными попытками
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Повторные попытки для мутаций
      retry: 1,
    },
  },
})

