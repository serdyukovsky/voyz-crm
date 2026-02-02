import { format as dateFnsFormat, formatDistanceToNow, type Locale } from 'date-fns'
import { ru } from 'date-fns/locale'

/**
 * Default timezone for the application
 * Set to 'local' to use browser's timezone, or specify like 'Europe/Moscow'
 */
const DEFAULT_TIMEZONE = 'local' // или 'Europe/Moscow' для фиксированного TZ

/**
 * Parse date string from API (ISO format) to Date object
 * Ensures proper timezone handling
 */
export function parseApiDate(dateString: string | Date | null | undefined): Date | null {
  if (!dateString) return null
  if (dateString instanceof Date) return dateString

  try {
    // API returns ISO strings in UTC (e.g., "2024-01-15T10:30:00.000Z")
    // new Date() automatically converts to local timezone
    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return null
    }

    return date
  } catch (error) {
    console.error('Error parsing date:', dateString, error)
    return null
  }
}

/**
 * Format date with automatic timezone handling
 * @param dateString - Date string from API (ISO format)
 * @param formatString - Format string for date-fns (e.g., 'PPP', 'dd.MM.yyyy HH:mm')
 * @param options - Additional options
 */
export function formatDate(
  dateString: string | Date | null | undefined,
  formatString: string = 'PPP',
  options?: {
    locale?: Locale
    timezone?: string
  }
): string {
  const date = parseApiDate(dateString)
  if (!date) return '-'

  try {
    // date-fns format() already works with local timezone when given a Date object
    // The Date object from new Date(isoString) is already in local timezone
    return dateFnsFormat(date, formatString, {
      locale: options?.locale || ru,
    })
  } catch (error) {
    console.error('Error formatting date:', dateString, error)
    return '-'
  }
}

/**
 * Format date and time in standard format (e.g., "15.01.2024 10:30")
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, 'dd.MM.yyyy HH:mm')
}

/**
 * Format date only (e.g., "15.01.2024")
 */
export function formatDateOnly(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, 'dd.MM.yyyy')
}

/**
 * Format time only (e.g., "10:30")
 */
export function formatTimeOnly(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, 'HH:mm')
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(
  dateString: string | Date | null | undefined,
  options?: {
    addSuffix?: boolean
    locale?: Locale
  }
): string {
  const date = parseApiDate(dateString)
  if (!date) return '-'

  try {
    return formatDistanceToNow(date, {
      addSuffix: options?.addSuffix ?? true,
      locale: options?.locale || ru,
    })
  } catch (error) {
    console.error('Error formatting relative time:', dateString, error)
    return '-'
  }
}

/**
 * Format for display in UI (smart formatting)
 * - Today: "10:30"
 * - This week: "Mon 10:30"
 * - This year: "15 Jan"
 * - Older: "15.01.2023"
 */
export function formatSmartDate(dateString: string | Date | null | undefined): string {
  const date = parseApiDate(dateString)
  if (!date) return '-'

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  try {
    // Less than 1 minute
    if (diffInSeconds < 60) return 'только что'

    // Less than 1 hour
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} мин назад`
    }

    // Today (less than 24 hours)
    if (diffInSeconds < 86400 && date.getDate() === now.getDate()) {
      return formatTimeOnly(date)
    }

    // This week (less than 7 days)
    if (diffInSeconds < 604800) {
      return dateFnsFormat(date, 'EEE HH:mm', { locale: ru })
    }

    // This year
    if (date.getFullYear() === now.getFullYear()) {
      return dateFnsFormat(date, 'd MMM', { locale: ru })
    }

    // Older than this year
    return formatDateOnly(date)
  } catch (error) {
    console.error('Error formatting smart date:', dateString, error)
    return '-'
  }
}

/**
 * Check if date string is valid
 */
export function isValidDate(dateString: string | Date | null | undefined): boolean {
  const date = parseApiDate(dateString)
  return date !== null
}

/**
 * Get current date/time as ISO string (for sending to API)
 */
export function getCurrentDateTimeISO(): string {
  return new Date().toISOString()
}
