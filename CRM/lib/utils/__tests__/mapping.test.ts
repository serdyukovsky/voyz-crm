/**
 * Tests for mapping utilities
 */

import { 
  normalizeSelectValue, 
  normalizeMappingObject, 
  toSelectValue, 
  fromSelectValue 
} from '../mapping'

describe('normalizeSelectValue', () => {
  it('should return undefined for empty string', () => {
    expect(normalizeSelectValue('')).toBeUndefined()
  })

  it('should return undefined for whitespace-only string', () => {
    expect(normalizeSelectValue('   ')).toBeUndefined()
    expect(normalizeSelectValue('\t')).toBeUndefined()
    expect(normalizeSelectValue('\n')).toBeUndefined()
  })

  it('should return undefined for null', () => {
    expect(normalizeSelectValue(null)).toBeUndefined()
  })

  it('should return undefined for undefined', () => {
    expect(normalizeSelectValue(undefined)).toBeUndefined()
  })

  it('should return trimmed string for valid value', () => {
    expect(normalizeSelectValue('fullName')).toBe('fullName')
    expect(normalizeSelectValue('  email  ')).toBe('email')
  })

  it('should handle non-string values defensively', () => {
    expect(normalizeSelectValue(123 as any)).toBeUndefined()
    expect(normalizeSelectValue({} as any)).toBeUndefined()
    expect(normalizeSelectValue([] as any)).toBeUndefined()
  })
})

describe('normalizeMappingObject', () => {
  it('should normalize all values in mapping object', () => {
    const input = {
      col1: 'fullName',
      col2: '',
      col3: null,
      col4: '  ',
      col5: '  email  ',
      col6: undefined
    }

    const result = normalizeMappingObject(input)

    expect(result).toEqual({
      col1: 'fullName',
      col2: undefined,
      col3: undefined,
      col4: undefined,
      col5: 'email',
      col6: undefined
    })
  })

  it('should handle empty object', () => {
    expect(normalizeMappingObject({})).toEqual({})
  })
})

describe('toSelectValue', () => {
  const sentinel = '__SKIP__'

  it('should return sentinel for undefined', () => {
    expect(toSelectValue(undefined, sentinel)).toBe(sentinel)
  })

  it('should return sentinel for null', () => {
    expect(toSelectValue(null, sentinel)).toBe(sentinel)
  })

  it('should return sentinel for empty string', () => {
    expect(toSelectValue('', sentinel)).toBe(sentinel)
  })

  it('should return sentinel for whitespace', () => {
    expect(toSelectValue('   ', sentinel)).toBe(sentinel)
  })

  it('should return value for valid string', () => {
    expect(toSelectValue('fullName', sentinel)).toBe('fullName')
  })

  it('should use default sentinel if not provided', () => {
    expect(toSelectValue(undefined)).toBe('__SKIP_COLUMN__')
  })
})

describe('fromSelectValue', () => {
  const sentinel = '__SKIP__'

  it('should return undefined for sentinel', () => {
    expect(fromSelectValue(sentinel, sentinel)).toBeUndefined()
  })

  it('should return value for non-sentinel', () => {
    expect(fromSelectValue('fullName', sentinel)).toBe('fullName')
  })

  it('should use default sentinel if not provided', () => {
    expect(fromSelectValue('__SKIP_COLUMN__')).toBeUndefined()
    expect(fromSelectValue('fullName')).toBe('fullName')
  })
})

describe('Integration: normalizeSelectValue + toSelectValue + fromSelectValue', () => {
  const sentinel = '__SKIP__'

  it('should handle complete flow with empty string', () => {
    const input = ''
    const normalized = normalizeSelectValue(input)
    const forSelect = toSelectValue(normalized, sentinel)
    const fromSelect = fromSelectValue(forSelect, sentinel)
    
    expect(normalized).toBeUndefined()
    expect(forSelect).toBe(sentinel)
    expect(fromSelect).toBeUndefined()
  })

  it('should handle complete flow with valid value', () => {
    const input = '  fullName  '
    const normalized = normalizeSelectValue(input)
    const forSelect = toSelectValue(normalized, sentinel)
    const fromSelect = fromSelectValue(forSelect, sentinel)
    
    expect(normalized).toBe('fullName')
    expect(forSelect).toBe('fullName')
    expect(fromSelect).toBe('fullName')
  })

  it('should handle complete flow with null', () => {
    const input = null
    const normalized = normalizeSelectValue(input)
    const forSelect = toSelectValue(normalized, sentinel)
    const fromSelect = fromSelectValue(forSelect, sentinel)
    
    expect(normalized).toBeUndefined()
    expect(forSelect).toBe(sentinel)
    expect(fromSelect).toBeUndefined()
  })
})

