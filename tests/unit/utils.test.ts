import { describe, it, expect } from 'vitest'
import { extractErrorMessage } from '../../app/utils/error'
import { formatDateToYMD } from '../../app/utils/formatters'

describe('extractErrorMessage', () => {
  it('returns fallback for falsy or nullish errors', () => {
    expect(extractErrorMessage(null)).toBe('An unexpected error occurred')
    expect(extractErrorMessage(undefined)).toBe('An unexpected error occurred')
    expect(extractErrorMessage('')).toBe('An unexpected error occurred')
    expect(extractErrorMessage(null, 'Custom fallback')).toBe('Custom fallback')
  })

  it('returns raw string when error is a string', () => {
    expect(extractErrorMessage('Invalid credentials')).toBe('Invalid credentials')
    expect(extractErrorMessage('Network timeout', 'Default')).toBe('Network timeout')
  })

  it('extracts message from native Error instance', () => {
    const error = new Error('Database connection failed')
    expect(extractErrorMessage(error)).toBe('Database connection failed')
  })

  it('extracts flat message from Laravel/Adonis validation errors object', () => {
    const error = {
      data: {
        errors: {
          email: ['The email field is required.', 'The email must be valid.'],
          phone: ['Phone must start with 255.']
        }
      }
    }
    const result = extractErrorMessage(error)
    expect(result).toBe('The email field is required., The email must be valid., Phone must start with 255.')
  })

  it('extracts message from response data.message', () => {
    const error = {
      data: {
        message: 'Unauthorized access to resource'
      }
    }
    expect(extractErrorMessage(error)).toBe('Unauthorized access to resource')
  })

  it('extracts message from root error object message', () => {
    const error = {
      message: 'Failed to dispatch notification'
    }
    expect(extractErrorMessage(error)).toBe('Failed to dispatch notification')
  })

  it('falls back to custom fallback if object message is empty', () => {
    const error = {
      data: {
        message: '   '
      }
    }
    expect(extractErrorMessage(error, 'Operation failed')).toBe('Operation failed')
  })

  it('falls back when error is an unexpected object or type', () => {
    expect(extractErrorMessage(12345, 'Bad type')).toBe('Bad type')
    expect(extractErrorMessage({}, 'Empty obj')).toBe('Empty obj')
  })
})

describe('formatDateToYMD', () => {
  it('formats Date instance to YYYY-MM-DD', () => {
    const date = new Date(2026, 8, 12) // Sept 12, 2026
    expect(formatDateToYMD(date)).toBe('2026-09-12')
  })

  it('formats Date instance with single digit month and day', () => {
    const date = new Date(2026, 0, 5) // Jan 5, 2026
    expect(formatDateToYMD(date)).toBe('2026-01-05')
  })

  it('truncates ISO date string to first 10 chars (YYYY-MM-DD)', () => {
    expect(formatDateToYMD('2026-09-12T14:30:00.000Z')).toBe('2026-09-12')
    expect(formatDateToYMD('2025-12-31 23:59:59')).toBe('2025-12-31')
  })

  it('returns today date in YYYY-MM-DD if input is null or undefined', () => {
    const todayYmd = new Date().toISOString().substring(0, 10)
    expect(formatDateToYMD(null)).toBe(todayYmd)
    expect(formatDateToYMD(undefined)).toBe(todayYmd)
    expect(formatDateToYMD('')).toBe(todayYmd)
  })
})
