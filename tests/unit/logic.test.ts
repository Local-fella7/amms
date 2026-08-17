/**
 * COMPREHENSIVE TEST SUITE — ASA (Arusha Somali Association) AMMS Frontend
 * Covers all pure logic extracted from:
 *   - app/pages/fee-payments.vue
 *   - app/pages/members/index.vue
 *   - app/pages/index.vue (dashboard)
 *   - app/composables/useReportPdf.ts (URL helpers)
 */

import { describe, it, expect } from 'vitest'

// ─── 1. DATA NORMALISATION ────────────────────────────────────────────────────

const toArray = (res: any): any[] => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
}

describe('[toArray] API response normalisation', () => {
  it('handles null', () => expect(toArray(null)).toEqual([]))
  it('handles undefined', () => expect(toArray(undefined)).toEqual([]))
  it('passes through an array unchanged', () => expect(toArray([1, 2])).toEqual([1, 2]))
  it('unwraps res.data array', () => expect(toArray({ data: [3, 4] })).toEqual([3, 4]))
  it('unwraps res.data.data array (Laravel paginated)', () => expect(toArray({ data: { data: [5, 6] } })).toEqual([5, 6]))
  it('returns [] for unexpected object shape', () => expect(toArray({ meta: {} })).toEqual([]))
  it('handles empty array', () => expect(toArray([])).toEqual([]))
  it('handles empty data array', () => expect(toArray({ data: [] })).toEqual([]))
})

// ─── 2. CURRENCY FORMATTING ───────────────────────────────────────────────────

const formatCurrency = (val?: number | null) => {
  if (val === undefined || val === null) return 'TZS 0'
  return `TZS ${Number(val).toLocaleString('en-US')}`
}

describe('[formatCurrency]', () => {
  it('formats undefined as TZS 0', () => expect(formatCurrency(undefined)).toBe('TZS 0'))
  it('formats null as TZS 0', () => expect(formatCurrency(null)).toBe('TZS 0'))
  it('formats 0', () => expect(formatCurrency(0)).toBe('TZS 0'))
  it('formats thousands with commas', () => expect(formatCurrency(50000)).toBe('TZS 50,000'))
  it('formats millions', () => expect(formatCurrency(1000000)).toBe('TZS 1,000,000'))
  it('formats small amounts', () => expect(formatCurrency(500)).toBe('TZS 500'))
  it('formats decimals', () => expect(formatCurrency(1234.5)).toContain('TZS'))
})

// ─── 3. COMPACT AMOUNT FORMATTING (dashboard) ─────────────────────────────────

const formatCompact = (val: number) => {
  const n = val || 0
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}K`
  return `TZS ${n}`
}

describe('[formatCompact]', () => {
  it('formats 0', () => expect(formatCompact(0)).toBe('TZS 0'))
  it('formats 999 as-is', () => expect(formatCompact(999)).toBe('TZS 999'))
  it('formats 1000 as 1K', () => expect(formatCompact(1000)).toBe('TZS 1K'))
  it('formats 350000 as 350K', () => expect(formatCompact(350000)).toBe('TZS 350K'))
  it('formats 1000000 as 1.0M', () => expect(formatCompact(1000000)).toBe('TZS 1.0M'))
  it('formats 2500000 as 2.5M', () => expect(formatCompact(2500000)).toBe('TZS 2.5M'))
  it('falls back to 0 for undefined/falsy', () => expect(formatCompact(undefined as any)).toBe('TZS 0'))
})

// ─── 4. DATE DISPLAY FORMATTING ───────────────────────────────────────────────

// From fee-payments.vue — formats YYYY-MM-DD → DD-MM-YYYY
const formatDateDisplay = (val?: string) => {
  if (!val) return '—'
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-')
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return str
}

describe('[formatDateDisplay] fee-payments date reformatter', () => {
  it('returns em-dash for falsy', () => expect(formatDateDisplay('')).toBe('—'))
  it('returns em-dash for undefined', () => expect(formatDateDisplay(undefined)).toBe('—'))
  it('converts YYYY-MM-DD to DD-MM-YYYY', () => expect(formatDateDisplay('2026-08-17')).toBe('17-08-2026'))
  it('handles date with time suffix', () => expect(formatDateDisplay('2026-01-05T10:00:00')).toBe('05-01-2026'))
  it('passes through non-matching strings', () => expect(formatDateDisplay('August 17 2026')).toBe('August 17 2026'))
})

// From fee-payments.vue — formats Date object / string to YYYY-MM-DD
const formatDateToYMD = (val: any) => {
  if (!val) return new Date().toISOString().substring(0, 10)
  if (val instanceof Date) {
    const yyyy = val.getFullYear()
    const mm = String(val.getMonth() + 1).padStart(2, '0')
    const dd = String(val.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return String(val).substring(0, 10)
}

describe('[formatDateToYMD]', () => {
  it('returns today when val is falsy', () => {
    const today = new Date().toISOString().substring(0, 10)
    expect(formatDateToYMD(null)).toBe(today)
    expect(formatDateToYMD('')).toBe(today)
  })
  it('converts a Date object correctly', () => {
    const d = new Date(2026, 7, 17) // Aug 17, 2026
    expect(formatDateToYMD(d)).toBe('2026-08-17')
  })
  it('pads month and day with zeros', () => {
    const d = new Date(2026, 0, 5) // Jan 5
    expect(formatDateToYMD(d)).toBe('2026-01-05')
  })
  it('slices a string ISO date to YYYY-MM-DD', () => {
    expect(formatDateToYMD('2026-08-17T12:30:00Z')).toBe('2026-08-17')
  })
  it('passes through a plain YYYY-MM-DD string', () => {
    expect(formatDateToYMD('2026-03-21')).toBe('2026-03-21')
  })
})

// ─── 5. MEMBER DISPLAY HELPERS ────────────────────────────────────────────────

const initials = (m: { first_name?: string; last_name?: string }) =>
  `${(m.first_name || '?')[0]}${(m.last_name || '')[0] || ''}`.toUpperCase()

describe('[initials]', () => {
  it('generates initials from both names', () => expect(initials({ first_name: 'Aisha', last_name: 'Mohammed' })).toBe('AM'))
  it('uses ? for missing first_name', () => expect(initials({ last_name: 'Ali' })).toBe('?A'))
  it('handles only first_name', () => expect(initials({ first_name: 'Omar' })).toBe('O'))
  it('uppercases result', () => expect(initials({ first_name: 'ali', last_name: 'hassan' })).toBe('AH'))
  it('handles empty object', () => expect(initials({})).toBe('?'))
})

const getMemberName = (mId: number | string, members: any[]) => {
  const found = members.find(m => Number(m.id) === Number(mId))
  return found ? `${found.first_name} ${found.last_name}` : `Member #${mId}`
}

describe('[getMemberName]', () => {
  const members = [
    { id: 1, first_name: 'Aisha', last_name: 'Mohammed' },
    { id: 2, first_name: 'Omar', last_name: 'Hassan' }
  ]
  it('returns full name when found', () => expect(getMemberName(1, members)).toBe('Aisha Mohammed'))
  it('returns fallback when not found', () => expect(getMemberName(99, members)).toBe('Member #99'))
  it('handles string id matching number id', () => expect(getMemberName('2', members)).toBe('Omar Hassan'))
  it('handles empty members array', () => expect(getMemberName(1, [])).toBe('Member #1'))
})

const getMemberPhone = (mId: number | string, members: any[]) => {
  const found = members.find(m => Number(m.id) === Number(mId))
  return found?.phone || ''
}

describe('[getMemberPhone]', () => {
  const members = [
    { id: 1, phone: '255712345678' },
    { id: 2 }
  ]
  it('returns phone when found', () => expect(getMemberPhone(1, members)).toBe('255712345678'))
  it('returns empty string when phone not set', () => expect(getMemberPhone(2, members)).toBe(''))
  it('returns empty string when member not found', () => expect(getMemberPhone(99, members)).toBe(''))
})

const getPaymentModeName = (pmId: number | string, paymentModes: any[]) => {
  const found = paymentModes.find(pm => Number(pm.id) === Number(pmId))
  return found ? found.name : `Mode #${pmId}`
}

describe('[getPaymentModeName]', () => {
  const modes = [{ id: 1, name: 'Cash' }, { id: 2, name: 'Mobile Money' }]
  it('returns mode name', () => expect(getPaymentModeName(1, modes)).toBe('Cash'))
  it('returns fallback for unknown id', () => expect(getPaymentModeName(99, modes)).toBe('Mode #99'))
  it('handles string id', () => expect(getPaymentModeName('2', modes)).toBe('Mobile Money'))
})

const getLocationName = (locId: number | string, locations: any[]) => {
  const found = locations.find(l => Number(l.id) === Number(locId))
  return found ? found.name : `Branch #${locId}`
}

describe('[getLocationName]', () => {
  const locations = [{ id: 1, name: 'Arusha Central' }, { id: 2, name: 'Moshi' }]
  it('returns location name', () => expect(getLocationName(1, locations)).toBe('Arusha Central'))
  it('returns fallback for unknown id', () => expect(getLocationName(5, locations)).toBe('Branch #5'))
  it('handles string id', () => expect(getLocationName('2', locations)).toBe('Moshi'))
  it('handles empty locations list', () => expect(getLocationName(1, [])).toBe('Branch #1'))
})

const getAgeGroupName = (groupId: number | string, ageGroups: any[]) => {
  const found = ageGroups.find(g => Number(g.id) === Number(groupId))
  return found ? found.name : `Bracket #${groupId}`
}

describe('[getAgeGroupName]', () => {
  const groups = [{ id: 1, name: 'Youth (18-30)' }, { id: 2, name: 'Senior (60+)' }]
  it('returns group name', () => expect(getAgeGroupName(1, groups)).toBe('Youth (18-30)'))
  it('returns fallback for unknown id', () => expect(getAgeGroupName(9, groups)).toBe('Bracket #9'))
  it('handles string id', () => expect(getAgeGroupName('2', groups)).toBe('Senior (60+)'))
})

const getFeeYear = (fItem: any, fees: any[]) => {
  if (typeof fItem === 'object' && fItem !== null) {
    return fItem.year || fItem.fee_year || '—'
  }
  const found = fees.find(f => Number(f.id) === Number(fItem))
  return found ? (found.year || found.fee_year || '—') : `Fee #${fItem}`
}

describe('[getFeeYear]', () => {
  const fees = [
    { id: 1, year: 2026, amount: 50000 },
    { id: 2, fee_year: 2025, amount: 40000 }
  ]
  it('returns year from object with .year', () => expect(getFeeYear({ year: 2026 }, fees)).toBe(2026))
  it('returns fee_year from object with .fee_year', () => expect(getFeeYear({ fee_year: 2025 }, fees)).toBe(2025))
  it('returns — for object with neither', () => expect(getFeeYear({}, fees)).toBe('—'))
  it('looks up fee by id', () => expect(getFeeYear(1, fees)).toBe(2026))
  it('looks up fee_year fallback', () => expect(getFeeYear(2, fees)).toBe(2025))
  it('returns fallback for unknown id', () => expect(getFeeYear(99, fees)).toBe('Fee #99'))
})

// ─── 6. FEE PAYMENT BALANCE LOGIC ─────────────────────────────────────────────

const getHistoricalRunningBalance = (p: any, allPayments: any[], fees: any[], members: any[]) => {
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
    .filter(i => Number(i.member_id) === Number(p.member_id) && Number(i.fee_id) === Number(p.fee_id))
    .sort((a, b) => {
      const da = new Date(a.date).getTime(), db = new Date(b.date).getTime()
      return da !== db ? da - db : Number(a.id) - Number(b.id)
    })

  let cumulative = 0
  for (const item of memberFeePayments) {
    cumulative += Number(item.amount) || 0
    if (Number(item.id) === Number(p.id)) break
  }
  return Math.max(0, feeAmt - cumulative)
}

describe('[getHistoricalRunningBalance]', () => {
  const fees = [{ id: 1, amount: 50000 }]
  const members = [{ id: 10, fee_exemption: 'no' }, { id: 11, fee_exemption: 'yes' }]

  it('returns 0 for fee-exempted member', () => {
    const p = { id: 1, member_id: 11, fee_id: 1, amount: 20000, date: '2026-01-01' }
    expect(getHistoricalRunningBalance(p, [p], fees, members)).toBe(0)
  })
  it('returns 0 when member.fee_exemption is yes (inline)', () => {
    const p = { id: 1, member_id: 11, fee_id: 1, amount: 20000, date: '2026-01-01', member: { fee_exemption: 'yes' } }
    expect(getHistoricalRunningBalance(p, [p], fees, members)).toBe(0)
  })
  it('returns correct balance after single partial payment', () => {
    const p = { id: 1, member_id: 10, fee_id: 1, amount: 20000, date: '2026-01-01' }
    expect(getHistoricalRunningBalance(p, [p], fees, members)).toBe(30000)
  })
  it('returns 0 after full payment clears balance', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 20000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 10, fee_id: 1, amount: 30000, date: '2026-02-01' }
    expect(getHistoricalRunningBalance(p2, [p1, p2], fees, members)).toBe(0)
  })
  it('tracks cumulative balance at each payment point', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 10000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 10, fee_id: 1, amount: 15000, date: '2026-02-01' }
    const p3 = { id: 3, member_id: 10, fee_id: 1, amount: 25000, date: '2026-03-01' }
    const all = [p1, p2, p3]
    expect(getHistoricalRunningBalance(p1, all, fees, members)).toBe(40000)
    expect(getHistoricalRunningBalance(p2, all, fees, members)).toBe(25000)
    expect(getHistoricalRunningBalance(p3, all, fees, members)).toBe(0)
  })
  it('does not cross-contaminate different members', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 20000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 99, fee_id: 1, amount: 50000, date: '2026-01-02' }
    expect(getHistoricalRunningBalance(p1, [p1, p2], fees, members)).toBe(30000)
  })
  it('does not cross-contaminate different fee schedules', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 20000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 10, fee_id: 2, amount: 50000, date: '2026-01-02' }
    expect(getHistoricalRunningBalance(p1, [p1, p2], fees, members)).toBe(30000)
  })
  it('clamps to 0 if overpaid', () => {
    const p = { id: 1, member_id: 10, fee_id: 1, amount: 60000, date: '2026-01-01' }
    expect(getHistoricalRunningBalance(p, [p], fees, members)).toBe(0)
  })
  it('returns 0 when fee amount is 0', () => {
    const p = { id: 1, member_id: 10, fee_id: 99, amount: 1000, date: '2026-01-01' }
    expect(getHistoricalRunningBalance(p, [p], [], members)).toBe(0)
  })
  it('picks up fee amount from p.fee_amount', () => {
    const p = { id: 1, member_id: 10, fee_id: 99, amount: 20000, date: '2026-01-01', fee_amount: 50000 }
    expect(getHistoricalRunningBalance(p, [p], [], members)).toBe(30000)
  })
  it('picks up fee amount from p.fee.amount', () => {
    const p = { id: 1, member_id: 10, fee_id: 99, amount: 20000, date: '2026-01-01', fee: { amount: 50000 } }
    expect(getHistoricalRunningBalance(p, [p], [], members)).toBe(30000)
  })
  it('sorts by id when dates are equal', () => {
    const p1 = { id: 1, member_id: 10, fee_id: 1, amount: 10000, date: '2026-01-01' }
    const p2 = { id: 2, member_id: 10, fee_id: 1, amount: 40000, date: '2026-01-01' }
    const all = [p2, p1] // intentionally reversed
    expect(getHistoricalRunningBalance(p1, all, fees, members)).toBe(40000) // 50000 - 10000
    expect(getHistoricalRunningBalance(p2, all, fees, members)).toBe(0)    // 50000 - 50000
  })
})

// ─── 7. PAYMENT STATUS BADGE ──────────────────────────────────────────────────

const paymentStatusBadge = (paid: number, prior: number, fullReq: number) => {
  const totalCovered = prior + paid
  if (fullReq <= 0) return { label: 'Custom Amount', class: 'bg-info bg-opacity-10 text-info border-info' }
  if (totalCovered >= fullReq) return { label: 'Paid in Full', class: 'bg-success bg-opacity-10 text-success border-success' }
  if (totalCovered > 0 && totalCovered < fullReq) return { label: 'Partial Payment', class: 'bg-warning bg-opacity-15 text-warning border-warning' }
  return { label: 'Unpaid', class: 'bg-danger bg-opacity-10 text-danger border-danger' }
}

describe('[paymentStatusBadge]', () => {
  it('returns Custom Amount when fullReq is 0', () => expect(paymentStatusBadge(100, 0, 0).label).toBe('Custom Amount'))
  it('returns Paid in Full when exactly covered', () => expect(paymentStatusBadge(50000, 0, 50000).label).toBe('Paid in Full'))
  it('returns Paid in Full when over-covered', () => expect(paymentStatusBadge(60000, 0, 50000).label).toBe('Paid in Full'))
  it('returns Paid in Full when prior + paid covers fee', () => expect(paymentStatusBadge(30000, 20000, 50000).label).toBe('Paid in Full'))
  it('returns Partial Payment when partially covered', () => expect(paymentStatusBadge(20000, 0, 50000).label).toBe('Partial Payment'))
  it('returns Partial Payment when prior + paid is still partial', () => expect(paymentStatusBadge(5000, 10000, 50000).label).toBe('Partial Payment'))
  it('returns Unpaid when nothing entered', () => expect(paymentStatusBadge(0, 0, 50000).label).toBe('Unpaid'))
})

// ─── 8. REMAINING SUGGESTED AMOUNT ────────────────────────────────────────────

const remainingSuggestedAmount = (fullFee: number, priorPaid: number) =>
  Math.max(0, fullFee - priorPaid)

describe('[remainingSuggestedAmount]', () => {
  it('returns full fee when nothing paid', () => expect(remainingSuggestedAmount(50000, 0)).toBe(50000))
  it('returns remaining after partial payment', () => expect(remainingSuggestedAmount(50000, 20000)).toBe(30000))
  it('returns 0 when fully paid', () => expect(remainingSuggestedAmount(50000, 50000)).toBe(0))
  it('clamps to 0 when overpaid', () => expect(remainingSuggestedAmount(50000, 60000)).toBe(0))
  it('handles 0 fee', () => expect(remainingSuggestedAmount(0, 0)).toBe(0))
})

// ─── 9. PAYMENT LIVE BALANCE (while filling the form) ─────────────────────────

const paymentBalance = (amountEntered: number, prior: number, requiredAmt: number) =>
  Math.max(0, requiredAmt - (prior + amountEntered))

describe('[paymentBalance] (real-time form balance)', () => {
  it('shows full fee as balance with 0 entry', () => expect(paymentBalance(0, 0, 50000)).toBe(50000))
  it('shows remaining after entry', () => expect(paymentBalance(20000, 0, 50000)).toBe(30000))
  it('shows 0 when entry + prior = fee', () => expect(paymentBalance(30000, 20000, 50000)).toBe(0))
  it('clamps to 0 on over-entry', () => expect(paymentBalance(70000, 0, 50000)).toBe(0))
})

// ─── 10. MEMBER SEARCH FILTER ─────────────────────────────────────────────────

const filterMembers = (members: any[], query: string, locationId: string, status: string, gender: string) => {
  let result = [...members]
  if (query.trim()) {
    const q = query.toLowerCase()
    result = result.filter(m =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.fathers_name && m.fathers_name.toLowerCase().includes(q))
    )
  }
  if (locationId) result = result.filter(m => Number(m.location_id) === Number(locationId))
  if (status) result = result.filter(m => m.member_status === status)
  if (gender) result = result.filter(m => (m.gender || 'male') === gender)
  return result.sort((a, b) => b.id - a.id)
}

describe('[filterMembers]', () => {
  const members = [
    { id: 1, first_name: 'Aisha', last_name: 'Mohammed', phone: '255712345678', fathers_name: 'Ahmed', location_id: 1, member_status: 'active', gender: 'female' },
    { id: 2, first_name: 'Omar', last_name: 'Hassan', phone: '255787654321', fathers_name: 'Hassan', location_id: 2, member_status: 'inactive', gender: 'male' },
    { id: 3, first_name: 'Fatuma', last_name: 'Ali', phone: '255700000000', fathers_name: 'Ali', location_id: 1, member_status: 'active', gender: 'female' }
  ]

  it('returns all members sorted by id desc when no filters', () => {
    const res = filterMembers(members, '', '', '', '')
    expect(res.map(m => m.id)).toEqual([3, 2, 1])
  })
  it('filters by first name', () => {
    expect(filterMembers(members, 'aisha', '', '', '')).toHaveLength(1)
  })
  it('filters by last name', () => {
    expect(filterMembers(members, 'hassan', '', '', '')).toHaveLength(1)
  })
  it('filters by phone', () => {
    expect(filterMembers(members, '255787654321', '', '', '')).toHaveLength(1)
  })
  it('filters by fathers_name', () => {
    expect(filterMembers(members, 'ahmed', '', '', '')).toHaveLength(1)
  })
  it('filters by location', () => {
    expect(filterMembers(members, '', '1', '', '')).toHaveLength(2)
  })
  it('filters by status', () => {
    expect(filterMembers(members, '', '', 'active', '')).toHaveLength(2)
    expect(filterMembers(members, '', '', 'inactive', '')).toHaveLength(1)
  })
  it('filters by gender', () => {
    expect(filterMembers(members, '', '', '', 'female')).toHaveLength(2)
    expect(filterMembers(members, '', '', '', 'male')).toHaveLength(1)
  })
  it('combines search + status filters', () => {
    const res = filterMembers(members, 'ali', '', 'active', '')
    expect(res).toHaveLength(1)
    expect(res[0].first_name).toBe('Fatuma')
  })
  it('returns empty for no matches', () => {
    expect(filterMembers(members, 'nonexistent', '', '', '')).toHaveLength(0)
  })
})

// ─── 11. PAYMENT SEARCH FILTER ────────────────────────────────────────────────

const filterPayments = (payments: any[], query: string, paymentModeId: string, feeId: string) => {
  let result = [...payments]
  if (query.trim()) {
    const q = query.toLowerCase()
    result = result.filter(p => {
      const mName = p.member ? `${p.member.first_name} ${p.member.last_name}` : `Member #${p.member_id}`
      return mName.toLowerCase().includes(q) || String(p.id).includes(q)
    })
  }
  if (paymentModeId) result = result.filter(p => Number(p.payment_mode_id) === Number(paymentModeId))
  if (feeId) result = result.filter(p => Number(p.fee_id) === Number(feeId))
  return result.sort((a, b) => b.id - a.id)
}

describe('[filterPayments]', () => {
  const payments = [
    { id: 1, member_id: 10, payment_mode_id: 1, fee_id: 1, amount: 20000, member: { first_name: 'Aisha', last_name: 'Mohammed' } },
    { id: 2, member_id: 11, payment_mode_id: 2, fee_id: 1, amount: 50000, member: { first_name: 'Omar', last_name: 'Hassan' } },
    { id: 3, member_id: 12, payment_mode_id: 1, fee_id: 2, amount: 30000, member: { first_name: 'Fatuma', last_name: 'Ali' } }
  ]

  it('returns all sorted desc when no filter', () => {
    expect(filterPayments(payments, '', '', '').map(p => p.id)).toEqual([3, 2, 1])
  })
  it('filters by member name', () => {
    expect(filterPayments(payments, 'aisha', '', '')).toHaveLength(1)
  })
  it('filters by payment id', () => {
    expect(filterPayments(payments, '2', '', '')).toHaveLength(1)
    expect(filterPayments(payments, '2', '', '')[0].id).toBe(2)
  })
  it('filters by payment mode', () => {
    expect(filterPayments(payments, '', '1', '')).toHaveLength(2)
  })
  it('filters by fee schedule', () => {
    expect(filterPayments(payments, '', '', '1')).toHaveLength(2)
    expect(filterPayments(payments, '', '', '2')).toHaveLength(1)
  })
  it('combines filters', () => {
    const res = filterPayments(payments, 'omar', '', '1')
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe(2)
  })
})

// ─── 12. MEMBER FILTER IN PAYMENT FORM ───────────────────────────────────────

const filteredMemberOptions = (members: any[], query: string) => {
  if (!query.trim()) return members
  const q = query.toLowerCase()
  return members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
    (m.phone && m.phone.includes(q))
  )
}

describe('[filteredMemberOptions]', () => {
  const members = [
    { id: 1, first_name: 'Aisha', last_name: 'Mohammed', phone: '255712345678' },
    { id: 2, first_name: 'Omar', last_name: 'Hassan', phone: '255787654321' }
  ]
  it('returns all when query is empty', () => expect(filteredMemberOptions(members, '')).toHaveLength(2))
  it('returns all when query is spaces', () => expect(filteredMemberOptions(members, '   ')).toHaveLength(2))
  it('matches by name', () => expect(filteredMemberOptions(members, 'omar')).toHaveLength(1))
  it('matches by phone', () => expect(filteredMemberOptions(members, '255712')).toHaveLength(1))
  it('is case-insensitive', () => expect(filteredMemberOptions(members, 'AISHA')).toHaveLength(1))
  it('returns empty for no match', () => expect(filteredMemberOptions(members, 'zzz')).toHaveLength(0))
})

// ─── 13. PAGINATION ───────────────────────────────────────────────────────────

const paginateItems = (items: any[], page: number, perPage: number) =>
  items.slice((page - 1) * perPage, page * perPage)

const getTotalPages = (total: number, perPage: number) =>
  Math.max(1, Math.ceil(total / perPage))

describe('[paginateItems] + [getTotalPages]', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))

  it('returns first page correctly', () => {
    const page = paginateItems(items, 1, 10)
    expect(page).toHaveLength(10)
    expect(page[0].id).toBe(1)
    expect(page[9].id).toBe(10)
  })
  it('returns second page correctly', () => {
    const page = paginateItems(items, 2, 10)
    expect(page[0].id).toBe(11)
  })
  it('returns partial last page', () => {
    const page = paginateItems(items, 3, 10)
    expect(page).toHaveLength(5)
    expect(page[0].id).toBe(21)
  })
  it('returns empty array beyond last page', () => {
    expect(paginateItems(items, 10, 10)).toHaveLength(0)
  })
  it('calculates totalPages = 3 for 25 items / 10', () => expect(getTotalPages(25, 10)).toBe(3))
  it('calculates totalPages = 1 for 0 items', () => expect(getTotalPages(0, 10)).toBe(1))
  it('calculates totalPages = 1 for exactly 1 page', () => expect(getTotalPages(10, 10)).toBe(1))
  it('calculates totalPages = 2 for 11 items / 10', () => expect(getTotalPages(11, 10)).toBe(2))
})

// ─── 14. COMPLIANCE RATE ──────────────────────────────────────────────────────

const calcComplianceRate = (paidCount: number, activeCount: number) =>
  activeCount === 0 ? 0 : Math.round((paidCount / activeCount) * 100)

describe('[calcComplianceRate]', () => {
  it('returns 0 when no active members', () => expect(calcComplianceRate(0, 0)).toBe(0))
  it('returns 100 when all paid', () => expect(calcComplianceRate(10, 10)).toBe(100))
  it('rounds 1/3 to 33', () => expect(calcComplianceRate(1, 3)).toBe(33))
  it('rounds 2/3 to 67', () => expect(calcComplianceRate(2, 3)).toBe(67))
  it('returns 0 when none paid', () => expect(calcComplianceRate(0, 50)).toBe(0))
  it('handles partial compliance', () => expect(calcComplianceRate(75, 100)).toBe(75))
})

// ─── 15. MEMBER SUMMARY METRICS ───────────────────────────────────────────────

const calcMemberStats = (members: any[]) => ({
  total: members.length,
  active: members.filter(m => m.member_status === 'active').length,
  inactive: members.filter(m => m.member_status !== 'active').length,
  exempted: members.filter(m => m.fee_exemption === 'yes').length,
})

describe('[calcMemberStats]', () => {
  const members = [
    { id: 1, member_status: 'active', fee_exemption: 'no' },
    { id: 2, member_status: 'active', fee_exemption: 'yes' },
    { id: 3, member_status: 'inactive', fee_exemption: 'no' },
    { id: 4, member_status: 'deceased', fee_exemption: 'yes' }
  ]

  it('counts total correctly', () => expect(calcMemberStats(members).total).toBe(4))
  it('counts active correctly', () => expect(calcMemberStats(members).active).toBe(2))
  it('counts inactive correctly', () => expect(calcMemberStats(members).inactive).toBe(2))
  it('counts exempted correctly', () => expect(calcMemberStats(members).exempted).toBe(2))
  it('returns zeros for empty list', () => {
    const stats = calcMemberStats([])
    expect(stats.total).toBe(0)
    expect(stats.active).toBe(0)
    expect(stats.exempted).toBe(0)
  })
})

// ─── 16. DASHBOARD REVENUE CALCULATION ───────────────────────────────────────

const calcRevenueYTD = (payments: any[], year: number) =>
  payments
    .filter(p => (p.date || p.created_at || '').startsWith(String(year)))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)

const calcTotalRevenue = (payments: any[]) =>
  payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)

describe('[calcRevenueYTD]', () => {
  const payments = [
    { id: 1, amount: 20000, date: '2026-01-15' },
    { id: 2, amount: 30000, date: '2026-06-01' },
    { id: 3, amount: 50000, date: '2025-12-31' },
    { id: 4, amount: 15000, created_at: '2026-03-10', date: '' }
  ]
  it('sums only 2026 payments', () => expect(calcRevenueYTD(payments, 2026)).toBe(65000))
  it('sums only 2025 payments', () => expect(calcRevenueYTD(payments, 2025)).toBe(50000))
  it('returns 0 for year with no payments', () => expect(calcRevenueYTD(payments, 2024)).toBe(0))
})

describe('[calcTotalRevenue]', () => {
  it('sums all payment amounts', () => {
    const payments = [{ amount: 10000 }, { amount: 20000 }, { amount: 30000 }]
    expect(calcTotalRevenue(payments)).toBe(60000)
  })
  it('returns 0 for empty', () => expect(calcTotalRevenue([])).toBe(0))
  it('handles missing amount field', () => {
    expect(calcTotalRevenue([{ amount: null }, { amount: undefined }])).toBe(0)
  })
})

// ─── 17. PHONE NUMBER NORMALISATION ──────────────────────────────────────────

const normalisePhone = (val: string): string => {
  if (!val) return '255'
  let digits = val.replace(/\D/g, '')
  if (!digits.startsWith('255')) digits = '255' + digits.replace(/^255?/, '')
  if (digits.startsWith('2550')) digits = '255' + digits.slice(4).replace(/^0+/, '')
  if (digits.length > 12) digits = digits.slice(0, 12)
  return digits
}

describe('[normalisePhone]', () => {
  it('returns 255 for empty string', () => expect(normalisePhone('')).toBe('255'))
  it('strips non-digit characters', () => expect(normalisePhone('+255 712 345 678')).toBe('255712345678'))
  it('prepends 255 when missing', () => expect(normalisePhone('0712345678')).toBe('255712345678'))
  it('removes leading zero after 255', () => expect(normalisePhone('2550712345678')).toBe('255712345678'))
  it('truncates to 12 digits', () => expect(normalisePhone('2557123456789')).toHaveLength(12))
  it('passes through correct number unchanged', () => expect(normalisePhone('255712345678')).toBe('255712345678'))
})

// ─── 18. PHONE NUMBER VALIDATION SCHEMA ──────────────────────────────────────

import { z } from 'zod'

const phoneSchema = z.string()
  .length(12, 'Phone number must be exactly 12 digits')
  .regex(/^255[0-9]{9}$/, 'Phone number must start with 255 followed by 9 digits')

describe('[phoneSchema] Zod validation', () => {
  it('accepts valid 255 number', () => expect(phoneSchema.safeParse('255712345678').success).toBe(true))
  it('rejects number with wrong length', () => expect(phoneSchema.safeParse('25571234567').success).toBe(false))
  it('rejects number not starting with 255', () => expect(phoneSchema.safeParse('254712345678').success).toBe(false))
  it('rejects number with letters', () => expect(phoneSchema.safeParse('255712abc678').success).toBe(false))
  it('rejects empty string', () => expect(phoneSchema.safeParse('').success).toBe(false))
})

// ─── 19. FEE PAYMENT SCHEMA ───────────────────────────────────────────────────

const feePaymentSchema = z.object({
  member_id: z.union([z.number(), z.string().min(1, 'Member selection is required')]),
  fee_id: z.union([z.number(), z.string().min(1, 'Fee schedule selection is required')]),
  payment_mode_id: z.union([z.number(), z.string().min(1, 'Payment mode is required')]),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(4, 'Payment date is required')
})

describe('[feePaymentSchema] Zod validation', () => {
  const valid = { member_id: 1, fee_id: 1, payment_mode_id: 1, amount: 50000, date: '2026-08-17' }
  it('accepts valid payload', () => expect(feePaymentSchema.safeParse(valid).success).toBe(true))
  it('rejects missing member_id', () => expect(feePaymentSchema.safeParse({ ...valid, member_id: '' }).success).toBe(false))
  it('rejects amount of 0', () => expect(feePaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false))
  it('rejects negative amount', () => expect(feePaymentSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false))
  it('rejects short date', () => expect(feePaymentSchema.safeParse({ ...valid, date: '202' }).success).toBe(false))
  it('accepts string member_id', () => expect(feePaymentSchema.safeParse({ ...valid, member_id: '5' }).success).toBe(true))
})

// ─── 20. MEMBER SCHEMA ────────────────────────────────────────────────────────

const memberSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  gender: z.enum(['male', 'female']),
  location_id: z.union([z.number(), z.string().min(1, 'Location branch is required')]),
  age_group_id: z.union([z.number(), z.string().min(1, 'Age group is required')]),
  date_of_birth: z.string().min(4, 'Date of birth is required'),
  phone: z.string().length(12).regex(/^255[0-9]{9}$/),
  member_status: z.enum(['active', 'inactive', 'deceased']),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed']),
  fee_exemption: z.enum(['yes', 'no']),
  registration_date: z.string().min(4, 'Registration date is required')
})

describe('[memberSchema] Zod validation', () => {
  const valid = {
    first_name: 'Aisha', last_name: 'Mohammed', gender: 'female',
    location_id: 1, age_group_id: 2, date_of_birth: '1990-05-20',
    phone: '255712345678', member_status: 'active', marital_status: 'married',
    fee_exemption: 'no', registration_date: '2026-08-17'
  }
  it('accepts a valid member payload', () => expect(memberSchema.safeParse(valid).success).toBe(true))
  it('rejects first_name shorter than 2 chars', () => expect(memberSchema.safeParse({ ...valid, first_name: 'A' }).success).toBe(false))
  it('rejects invalid gender', () => expect(memberSchema.safeParse({ ...valid, gender: 'other' }).success).toBe(false))
  it('rejects invalid member_status', () => expect(memberSchema.safeParse({ ...valid, member_status: 'pending' }).success).toBe(false))
  it('rejects invalid marital_status', () => expect(memberSchema.safeParse({ ...valid, marital_status: 'unknown' }).success).toBe(false))
  it('rejects invalid fee_exemption', () => expect(memberSchema.safeParse({ ...valid, fee_exemption: 'maybe' }).success).toBe(false))
  it('rejects invalid phone', () => expect(memberSchema.safeParse({ ...valid, phone: '0712345678' }).success).toBe(false))
  it('accepts deceased member_status', () => expect(memberSchema.safeParse({ ...valid, member_status: 'deceased' }).success).toBe(true))
  it('accepts divorced marital_status', () => expect(memberSchema.safeParse({ ...valid, marital_status: 'divorced' }).success).toBe(true))
})

// ─── 21. URL CLEANING (useReportPdf) ─────────────────────────────────────────

const cleanDownloadUrl = (url: string) =>
  url.replace(/([?&])download=1(&?)/, (match, p1, p2) => p2 ? p1 : '')

describe('[cleanDownloadUrl]', () => {
  it('removes ?download=1 as sole param', () => expect(cleanDownloadUrl('/api/report?download=1')).toBe('/api/report'))
  it('removes &download=1 at end', () => expect(cleanDownloadUrl('/api/report?fee_id=2&download=1')).toBe('/api/report?fee_id=2'))
  it('removes download=1& keeping rest', () => expect(cleanDownloadUrl('/api/report?download=1&fee_id=2')).toBe('/api/report?fee_id=2'))
  it('leaves URL unchanged when no download param', () => expect(cleanDownloadUrl('/api/report?fee_id=2')).toBe('/api/report?fee_id=2'))
  it('leaves plain URL unchanged', () => expect(cleanDownloadUrl('/api/report')).toBe('/api/report'))
})

// ─── 22. AGE CALCULATION ─────────────────────────────────────────────────────

const calculateAge = (dob: string): number | null => {
  if (!dob) return null
  const dobDate = new Date(dob)
  if (isNaN(dobDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dobDate.getFullYear()
  const monthDiff = today.getMonth() - dobDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) age--
  return age >= 0 ? age : 0
}

describe('[calculateAge]', () => {
  it('returns null for empty string', () => expect(calculateAge('')).toBeNull())
  it('returns null for invalid date', () => expect(calculateAge('not-a-date')).toBeNull())
  it('returns correct age for past date', () => {
    const dob = `${new Date().getFullYear() - 30}-06-15`
    const age = calculateAge(dob)
    expect(age).toBeGreaterThanOrEqual(29)
    expect(age).toBeLessThanOrEqual(30)
  })
  it('returns 0 for future date (clamped)', () => {
    const future = `${new Date().getFullYear() + 1}-01-01`
    expect(calculateAge(future)).toBe(0)
  })
})

const findMatchingAgeGroup = (age: number, ageGroups: any[]): any | null => {
  return ageGroups.find(g => {
    const min = g.from_age != null && g.from_age !== '' ? Number(g.from_age) : 0
    const max = g.to_age != null && g.to_age !== '' ? Number(g.to_age) : 999
    return age >= min && age <= max
  }) || null
}

describe('[findMatchingAgeGroup]', () => {
  const groups = [
    { id: 1, name: 'Youth', from_age: 18, to_age: 30 },
    { id: 2, name: 'Middle', from_age: 31, to_age: 59 },
    { id: 3, name: 'Senior', from_age: 60, to_age: 99 }
  ]
  it('matches Youth for age 25', () => expect(findMatchingAgeGroup(25, groups)?.name).toBe('Youth'))
  it('matches Middle for age 45', () => expect(findMatchingAgeGroup(45, groups)?.name).toBe('Middle'))
  it('matches Senior for age 70', () => expect(findMatchingAgeGroup(70, groups)?.name).toBe('Senior'))
  it('matches boundary age exactly (30)', () => expect(findMatchingAgeGroup(30, groups)?.name).toBe('Youth'))
  it('matches boundary age exactly (31)', () => expect(findMatchingAgeGroup(31, groups)?.name).toBe('Middle'))
  it('returns null for unmatched age (e.g. 100+)', () => expect(findMatchingAgeGroup(150, groups)).toBeNull())
  it('handles null from_age as 0', () => {
    const g = [{ id: 1, name: 'Child', from_age: null, to_age: 17 }]
    expect(findMatchingAgeGroup(5, g)?.name).toBe('Child')
  })
})

// ─── 23. OVERDUE MEMBER DETECTION ────────────────────────────────────────────

const getOverdueMembers = (members: any[], payments: any[], year: number) => {
  const paidIds = new Set(
    payments
      .filter(p => (p.date || p.created_at || '').startsWith(String(year)))
      .map(p => Number(p.member_id))
  )
  return members.filter(m => m.member_status === 'active' && !paidIds.has(Number(m.id)))
}

describe('[getOverdueMembers]', () => {
  const members = [
    { id: 1, member_status: 'active' },
    { id: 2, member_status: 'active' },
    { id: 3, member_status: 'inactive' },
    { id: 4, member_status: 'active' }
  ]
  const payments = [
    { member_id: 1, amount: 50000, date: '2026-03-01' },
    { member_id: 3, amount: 50000, date: '2026-04-01' }
  ]

  it('returns only active members who have not paid in the given year', () => {
    const overdue = getOverdueMembers(members, payments, 2026)
    expect(overdue.map(m => m.id)).toEqual([2, 4])
  })
  it('returns empty when all active members paid', () => {
    const allPaid = [
      { member_id: 1, date: '2026-01-01' },
      { member_id: 2, date: '2026-02-01' },
      { member_id: 4, date: '2026-03-01' }
    ]
    expect(getOverdueMembers(members, allPaid, 2026)).toHaveLength(0)
  })
  it('ignores payments from a different year', () => {
    const oldPayments = [{ member_id: 1, date: '2025-12-01' }, { member_id: 2, date: '2025-11-01' }]
    const overdue = getOverdueMembers(members, oldPayments, 2026)
    expect(overdue).toHaveLength(3) // ids 1, 2, 4 are active and none paid in 2026
  })
  it('ignores inactive/deceased members', () => {
    const overdue = getOverdueMembers(members, [], 2026)
    expect(overdue.map(m => m.id)).not.toContain(3)
  })
})
