'use client'

import { useEffect, useState } from 'react'

/**
 * Debounce функция для задержки выполнения функции
 * @param func Функция для выполнения
 * @param wait Задержка в миллисекундах
 * @returns Debounced функция
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * useDebouncedValue hook для дебаунса значения в React
 * Полезно для фильтров и поиска
 *
 * @param value - значение для дебаунса
 * @param delay - задержка в миллисекундах
 * @returns дебаунсированное значение
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
