/**
 * Safely format a date input into YYYY-MM-DD string.
 * Supports Date objects, ISO strings, string dates, or null/undefined.
 */
export function formatDateToYMD(val: string | Date | null | undefined): string {
  if (!val) return new Date().toISOString().substring(0, 10)
  if (val instanceof Date) {
    const yyyy = val.getFullYear()
    const mm = String(val.getMonth() + 1).padStart(2, '0')
    const dd = String(val.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return String(val).substring(0, 10)
}
