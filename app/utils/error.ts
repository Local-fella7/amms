/**
 * Type-safe error message extractor for unknown error types (industry standard catch handling).
 * Supports standard Error, Nuxt ofetch FetchError, Laravel/Adonis validation errors, and strings.
 */
export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err

  if (typeof err === 'object' && err !== null) {
    const errorRecord = err as Record<string, unknown>

    // Check ofetch / Nuxt response data (err.data) first to show specific API validation messages
    if (errorRecord.data && typeof errorRecord.data === 'object') {
      const dataRecord = errorRecord.data as Record<string, unknown>

      // Laravel/API-style validation errors: { errors: { field: ["..."] } }
      if (dataRecord.errors && typeof dataRecord.errors === 'object') {
        const errorValues = Object.values(dataRecord.errors as Record<string, unknown>).flat()
        if (errorValues.length > 0) {
          return errorValues.map(v => String(v)).join(', ')
        }
      }

      if (typeof dataRecord.message === 'string' && dataRecord.message.trim()) {
        return dataRecord.message
      }
    }

    if (err instanceof Error && err.message) {
      return err.message
    }

    if (typeof errorRecord.message === 'string' && errorRecord.message.trim()) {
      return errorRecord.message
    }
  }

  return fallback
}
