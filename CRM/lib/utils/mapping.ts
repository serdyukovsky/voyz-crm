/**
 * Mapping utilities for CSV import
 * 
 * These utilities provide runtime safety for mapping values,
 * normalizing various "empty" states to undefined.
 */

/**
 * Normalize a mapping value to ensure it's either a valid string or undefined.
 * This provides runtime safety against:
 * - Empty strings
 * - Null values
 * - Whitespace-only strings
 * - Values from external sources or legacy data
 * 
 * @param value - The value to normalize (can be string, null, undefined, or any)
 * @returns undefined if value is empty/null/whitespace, otherwise the trimmed string
 * 
 * @example
 * normalizeSelectValue("")          // → undefined
 * normalizeSelectValue(null)        // → undefined
 * normalizeSelectValue(undefined)   // → undefined
 * normalizeSelectValue("  ")        // → undefined
 * normalizeSelectValue("fullName")  // → "fullName"
 * normalizeSelectValue(" email ")   // → "email"
 */
export function normalizeSelectValue(value: string | null | undefined): string | undefined {
  // Handle null/undefined
  if (value == null) {
    return undefined
  }
  
  // Handle non-string values (defensive)
  if (typeof value !== 'string') {
    console.warn('normalizeSelectValue: received non-string value', value)
    return undefined
  }
  
  // Trim and check if empty
  const trimmed = value.trim()
  
  if (trimmed === '') {
    return undefined
  }
  
  return trimmed
}

/**
 * Normalize an entire mapping object, ensuring all values are either valid strings or undefined.
 * This is useful for processing mapping objects from external sources or API responses.
 * 
 * @param mapping - The mapping object to normalize
 * @returns A new mapping object with all values normalized
 * 
 * @example
 * normalizeMappingObject({
 *   col1: "fullName",
 *   col2: "",
 *   col3: null,
 *   col4: "  ",
 *   col5: "email"
 * })
 * // Returns: { col1: "fullName", col2: undefined, col3: undefined, col4: undefined, col5: "email" }
 */
export function normalizeMappingObject(
  mapping: Record<string, string | null | undefined>
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {}
  
  for (const [key, value] of Object.entries(mapping)) {
    normalized[key] = normalizeSelectValue(value)
  }
  
  return normalized
}

/**
 * Convert a mapping value to a Select-compatible value using a sentinel.
 * This ensures the Select component always receives a valid string.
 * 
 * @param value - The mapping value (can be undefined)
 * @param sentinel - The sentinel value to use for undefined (default: '__SKIP_COLUMN__')
 * @returns Either the value or the sentinel
 * 
 * @example
 * toSelectValue(undefined)           // → '__SKIP_COLUMN__'
 * toSelectValue("fullName")          // → 'fullName'
 * toSelectValue("")                  // → '__SKIP_COLUMN__' (normalized first)
 * toSelectValue(null)                // → '__SKIP_COLUMN__' (normalized first)
 */
export function toSelectValue(
  value: string | null | undefined,
  sentinel: string = '__SKIP_COLUMN__'
): string {
  const normalized = normalizeSelectValue(value)
  return normalized ?? sentinel
}

/**
 * Convert a Select value back to a mapping value.
 * This converts the sentinel back to undefined.
 * 
 * @param value - The Select value (always a string)
 * @param sentinel - The sentinel value to check for (default: '__SKIP_COLUMN__')
 * @returns undefined if value is sentinel, otherwise the value
 * 
 * @example
 * fromSelectValue('__SKIP_COLUMN__')  // → undefined
 * fromSelectValue('fullName')         // → 'fullName'
 */
export function fromSelectValue(
  value: string,
  sentinel: string = '__SKIP_COLUMN__'
): string | undefined {
  return value === sentinel ? undefined : value
}

