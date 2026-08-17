import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Helpers (pure logic lifted from dashboard / fee-payments pages) ───────────

const toArray = (res: any): any[] => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
}

const formatCompact = (val: number) => {
  const n = val || 0
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `TZS ${(n / 1_000).toFixed(0)}K`
  return `TZS ${n}`
}

const formatDate = (val?: string) => {
  if (!val) return '—'
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const initials = (m: { first_name?: string; last_name?: string }) =>
  `${(m.first_name || '?')[0]}${(m.last_name || '')[0] || ''}`.toUpperCase()

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return 'TZS 0'
  return `TZS ${Number(val).toLocaleString('en-US')}`
}

const getHistoricalRunningBalance = (
  p: any,
  allPayments: any[],
  fees: any[],
  members: any[]
) => {
  const getMemberExemption = (mId: any) => {
    const m = members.find(m => Number(m.id) === Number(mId))
    return m?.fee_exemption || 'no'
  }

  if (p.member?.fee_exemption === 'yes' || getMemberExemption(p.member_id) === 'yes') return 0

  let feeAmt = Number(p.fee_amount || p.fee?.amount || 0)
  if (!feeAmt) {
    const feeObj = fees.find(f => Number(f.id) === Number(p.fee_id))
    if (feeObj?.amount) feeAmt = Number(feeObj.amount)
  }
  if (feeAmt <= 0) return 0

  const memberFeePayments = allPayments
    .filter(item => Number(item.member_id) === Number(p.member_id) && Number(item.fee_id) === Number(p.fee_id))
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (dateA !== dateB) return dateA - dateB
      return Number(a.id) - Number(b.id)
    })

  let cumulativePaid = 0
  for (const item of memberFeePayments) {
    cumulativePaid += Number(item.amount) || 0
    if (Number(item.id) === Number(p.id)) break
  }

  return Math.max(0, feeAmt - cumulativePaid)
}

// Clean URL helper from openPdfInNewTab
const cleanDownloadUrl = (url: string) =>
  url.replace(/([?&])download=1(&?)/, (match, p1, p2) => p2 ? p1 : '')

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('toArray()', () => {
  it('returns empty array for null/undefined', () => {
    expect(toArray(null)).toEqual([])
    expect(toArray(undefined)).toEqual([])
  })
  it('returns array as-is', () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3])
  })
  it('extracts res.data when it is an array', () => {
    expect(toArray({ data: [4, 5, 6] })).toEqual([4, 5, 6])
  })
  it('extracts res.data.data when nested', () => {
    expect(toArray({ data: { data: [7, 8] } })).toEqual([7, 8])
  })
  it('returns empty array for unrecognised shape', () => {
    expect(toArray({ random: 'thing' })).toEqual([])
  })
})

describe('formatCompact()', () => {
  it('formats millions correctly', () => {
    expect(formatCompact(2_500_000)).toBe('TZS 2.5M')
  })
  it('formats thousands correctly', () => {
    expect(formatCompact(350_000)).toBe('TZS 350K')
    expect(formatCompact(1_000)).toBe('TZS 1K')
  })
  it('formats values under 1000', () => {
    expect(formatCompact(500)).toBe('TZS 500')
    expect(formatCompact(0)).toBe('TZS 0')
  })
  it('handles undefined/null as 0', () => {
    expect(formatCompact(undefined as any)).toBe('TZS 0')
  })
})

describe('formatCurrency()', () => {
  it('returns TZS 0 for null/undefined', () => {
    expect(formatCurrency(undefined)).toBe('TZS 0')
    expect(formatCurrency(null as any)).toBe('TZS 0')
  })
  it('formats numbers with comma separators', () => {
    expect(formatCurrency(50000)).toBe('TZS 50,000')
    expect(formatCurrency(1000000)).toBe('TZS 1,000,000')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('TZS 0')
  })
})

describe('formatDate()', () => {
  it('returns em-dash for undefined/empty', () => {
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
  it('formats a valid ISO date string', () => {
    // Use noon UTC to avoid any timezone shift flipping the date
    const result = formatDate('2026-08-16T12:00:00Z')
    // Accept either 16 Aug (UTC) or adjacent date depending on local TZ — just check year and month
    expect(result).toMatch(/Aug 2026/)
  })
  it('returns raw string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('initials()', () => {
  it('generates initials from first and last name', () => {
    expect(initials({ first_name: 'Aisha', last_name: 'Mohammed' })).toBe('AM')
  })
  it('uses ? when first_name is missing', () => {
    expect(initials({ last_name: 'Ali' })).toBe('?A')
  })
  it('handles only first name', () => {
    expect(initials({ first_name: 'Omar' })).toBe('O')
  })
  it('uppercases result', () => {
    expect(initials({ first_name: 'ali', last_name: 'hassan' })).toBe('AH')
  })
})

describe('getHistoricalRunningBalance()', () => {
  const fees    = [{ id: 1, amount: 50000 }]
  const members = [{ id: 10, fee_exemption: 'no' }, { id: 11, fee_exemption: 'yes' }]

  it('returns 0 for fee-exempted members', () => {
    const p = { id: 1, member_id: 11, fee_id: 1, amount: 20000, date: '2026-01-01', fee_amount: 50000 }
    expect(getHistoricalRunningBalance(p, [p], fees, members)).toBe(0)
  })

  it('returns full fee as balance when it is the first (and only) partial payment', () => {
    const p = { id: 1, member_id: 10, fee_id: 1, amount: 20000, date: '2026-01-01' }
    expect(getHistoricalRunningBalance(p, [p], fees, members)).toBe(30000)
  })

  it('returns 0 balance after second payment that clears the full fee', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 20000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 10, fee_id: 1, amount: 30000, date: '2026-02-01' }
    expect(getHistoricalRunningBalance(p2, [p1, p2], fees, members)).toBe(0)
  })

  it('handles multiple partial payments and preserves balance at each point', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 10000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 10, fee_id: 1, amount: 15000, date: '2026-02-01' }
    const p3 = { id: 3, member_id: 10, fee_id: 1, amount: 25000, date: '2026-03-01' }
    const all = [p1, p2, p3]
    expect(getHistoricalRunningBalance(p1, all, fees, members)).toBe(40000)
    expect(getHistoricalRunningBalance(p2, all, fees, members)).toBe(25000)
    expect(getHistoricalRunningBalance(p3, all, fees, members)).toBe(0)
  })

  it('does not mix up payments from different members', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 20000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 99, fee_id: 1, amount: 50000, date: '2026-01-02' }
    expect(getHistoricalRunningBalance(p1, [p1, p2], fees, members)).toBe(30000)
  })

  it('does not mix up payments from different fee years', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 20000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 10, fee_id: 2, amount: 50000, date: '2026-01-02' }
    expect(getHistoricalRunningBalance(p1, [p1, p2], fees, members)).toBe(30000)
  })

  it('clamps balance to 0 if overpaid', () => {
    const p = { id: 1, member_id: 10, fee_id: 1, amount: 60000, date: '2026-01-01' }
    expect(getHistoricalRunningBalance(p, [p], fees, members)).toBe(0)
  })
})

describe('cleanDownloadUrl()', () => {
  it('removes download=1 when it is the only query param', () => {
    expect(cleanDownloadUrl('/api/report?download=1')).toBe('/api/report')
  })
  it('removes download=1 when there are other params after it', () => {
    expect(cleanDownloadUrl('/api/report?download=1&fee_id=2')).toBe('/api/report?fee_id=2')
  })
  it('removes download=1 when there are other params before it', () => {
    expect(cleanDownloadUrl('/api/report?fee_id=2&download=1')).toBe('/api/report?fee_id=2')
  })
  it('leaves URL untouched when download=1 is absent', () => {
    expect(cleanDownloadUrl('/api/report?fee_id=2')).toBe('/api/report?fee_id=2')
  })
})

// ─── Pagination logic ─────────────────────────────────────────────────────────

const paginateItems = (items: any[], currentPage: number, perPage: number) =>
  items.slice((currentPage - 1) * perPage, currentPage * perPage)

const totalPages = (totalItems: number, perPage: number) =>
  Math.max(1, Math.ceil(totalItems / perPage))

describe('Pagination helpers', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))

  it('returns first page correctly', () => {
    expect(paginateItems(items, 1, 10)).toHaveLength(10)
    expect(paginateItems(items, 1, 10)[0].id).toBe(1)
  })

  it('returns last page with remaining items', () => {
    const page3 = paginateItems(items, 3, 10)
    expect(page3).toHaveLength(5)
    expect(page3[0].id).toBe(21)
  })

  it('totalPages calculates correctly', () => {
    expect(totalPages(25, 10)).toBe(3)
    expect(totalPages(10, 10)).toBe(1)
    expect(totalPages(0, 10)).toBe(1)
    expect(totalPages(11, 10)).toBe(2)
  })
})

// ─── Compliance rate ──────────────────────────────────────────────────────────

const calcComplianceRate = (paidCount: number, activeCount: number) =>
  activeCount === 0 ? 0 : Math.round((paidCount / activeCount) * 100)

describe('calcComplianceRate()', () => {
  it('returns 0 when no active members', () => {
    expect(calcComplianceRate(0, 0)).toBe(0)
  })
  it('returns 100 when all paid', () => {
    expect(calcComplianceRate(10, 10)).toBe(100)
  })
  it('rounds correctly', () => {
    expect(calcComplianceRate(1, 3)).toBe(33)
    expect(calcComplianceRate(2, 3)).toBe(67)
  })
  it('returns 0 when none paid', () => {
    expect(calcComplianceRate(0, 50)).toBe(0)
  })
})

// ─── Remaining suggested amount ───────────────────────────────────────────────

const calcRemainingSuggested = (feeAmount: number, totalPriorPaid: number) =>
  Math.max(0, feeAmount - totalPriorPaid)

describe('calcRemainingSuggested()', () => {
  it('returns full fee when nothing has been paid', () => {
    expect(calcRemainingSuggested(50000, 0)).toBe(50000)
  })
  it('returns remaining when partial payment was made', () => {
    expect(calcRemainingSuggested(50000, 20000)).toBe(30000)
  })
  it('returns 0 when fully paid', () => {
    expect(calcRemainingSuggested(50000, 50000)).toBe(0)
  })
  it('returns 0 when overpaid (clamp)', () => {
    expect(calcRemainingSuggested(50000, 60000)).toBe(0)
  })
})
