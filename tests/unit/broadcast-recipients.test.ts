import { describe, it, expect } from 'vitest'
import type { Member, Fee, FeePayment } from '../../app/types'

// Extracted pure logic matching SharedBroadcastRecipientModal.vue
interface RecipientFilterParams {
  members: Member[]
  fees: Fee[]
  payments: FeePayment[]
  statusFilter?: string
  genderFilter?: string
  locationFilter?: string
  paymentFilter?: 'all' | 'fully_paid' | 'has_balance' | 'exempt'
  searchQuery?: string
}

export const calculateMemberFeeSummary = (
  memberId: number,
  fees: Fee[],
  payments: FeePayment[],
  feeExemption?: string
) => {
  if (feeExemption === 'yes') {
    return { totalRequired: 0, totalPaid: 0, balance: 0, status: 'exempt' as const }
  }

  const totalRequired = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  const totalPaid = payments
    .filter(p => Number(p.member_id) === Number(memberId))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  const balance = Math.max(0, totalRequired - totalPaid)
  const status = balance === 0 ? ('fully_paid' as const) : ('has_balance' as const)

  return { totalRequired, totalPaid, balance, status }
}

export const filterBroadcastRecipients = (params: RecipientFilterParams): Member[] => {
  const {
    members,
    fees,
    payments,
    statusFilter = 'all',
    genderFilter = 'all',
    locationFilter = '',
    paymentFilter = 'all',
    searchQuery = ''
  } = params

  return members.filter(m => {
    // 1. Membership status filter
    if (statusFilter !== 'all' && m.member_status !== statusFilter) {
      return false
    }

    // 2. Gender filter
    if (genderFilter !== 'all' && (m.gender || 'male') !== genderFilter) {
      return false
    }

    // 3. Location filter
    if (locationFilter && String(m.location_id) !== String(locationFilter)) {
      return false
    }

    // 4. Payment status filter
    if (paymentFilter !== 'all') {
      const summary = calculateMemberFeeSummary(m.id, fees, payments, m.fee_exemption)
      if (summary.status !== paymentFilter) {
        return false
      }
    }

    // 5. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
      const phone = (m.phone || '').toLowerCase()
      if (!fullName.includes(q) && !phone.includes(q)) {
        return false
      }
    }

    return true
  })
}

export const buildRecipientBatchPayload = (notificationId: number | string, selectedMemberIds: (number | string)[]) => {
  return {
    notification_id: Number(notificationId),
    member_ids: selectedMemberIds.map(Number)
  }
}

describe('Broadcast Recipients Logic', () => {
  const dummyFees: Fee[] = [
    { id: 1, year: 2025, amount: 50000 },
    { id: 2, year: 2026, amount: 60000 }
  ] // Total required = 110,000

  const dummyMembers: Member[] = [
    {
      id: 1,
      first_name: 'Amina',
      last_name: 'Yusuf',
      gender: 'female',
      member_status: 'active',
      phone: '255712345678',
      location_id: 10,
      fee_exemption: 'no',
      age_group_id: 1,
      date_of_birth: '1995-01-01',
      registration_date: '2025-01-01'
    },
    {
      id: 2,
      first_name: 'Hassan',
      last_name: 'Omar',
      gender: 'male',
      member_status: 'active',
      phone: '255788888888',
      location_id: 10,
      fee_exemption: 'no',
      age_group_id: 2,
      date_of_birth: '1980-05-15',
      registration_date: '2025-01-01'
    },
    {
      id: 3,
      first_name: 'Khadija',
      last_name: 'Ali',
      gender: 'female',
      member_status: 'inactive',
      phone: '255799999999',
      location_id: 20,
      fee_exemption: 'no',
      age_group_id: 1,
      date_of_birth: '1992-03-20',
      registration_date: '2025-01-01'
    },
    {
      id: 4,
      first_name: 'Elder',
      last_name: 'Farah',
      gender: 'male',
      member_status: 'active',
      phone: '255777777777',
      location_id: 10,
      fee_exemption: 'yes',
      age_group_id: 3,
      date_of_birth: '1945-01-01',
      registration_date: '2025-01-01'
    }
  ]

  const dummyPayments: FeePayment[] = [
    // Amina has paid 110,000 (fully paid)
    { id: 101, member_id: 1, fee_id: 1, payment_mode_id: 1, amount: 50000, date: '2025-02-01' },
    { id: 102, member_id: 1, fee_id: 2, payment_mode_id: 1, amount: 60000, date: '2026-02-01' },
    // Hassan has paid only 50,000 (has balance of 60,000)
    { id: 103, member_id: 2, fee_id: 1, payment_mode_id: 1, amount: 50000, date: '2025-03-01' }
  ]

  describe('calculateMemberFeeSummary', () => {
    it('accurately identifies fully paid member', () => {
      const summary = calculateMemberFeeSummary(1, dummyFees, dummyPayments, 'no')
      expect(summary.totalRequired).toBe(110000)
      expect(summary.totalPaid).toBe(110000)
      expect(summary.balance).toBe(0)
      expect(summary.status).toBe('fully_paid')
    })

    it('accurately calculates outstanding balance for member with arrears', () => {
      const summary = calculateMemberFeeSummary(2, dummyFees, dummyPayments, 'no')
      expect(summary.totalRequired).toBe(110000)
      expect(summary.totalPaid).toBe(50000)
      expect(summary.balance).toBe(60000)
      expect(summary.status).toBe('has_balance')
    })

    it('returns exempt status and 0 balance for exempted member', () => {
      const summary = calculateMemberFeeSummary(4, dummyFees, dummyPayments, 'yes')
      expect(summary.totalRequired).toBe(0)
      expect(summary.balance).toBe(0)
      expect(summary.status).toBe('exempt')
    })
  })

  describe('filterBroadcastRecipients', () => {
    it('returns all members when no filters applied', () => {
      const result = filterBroadcastRecipients({
        members: dummyMembers,
        fees: dummyFees,
        payments: dummyPayments
      })
      expect(result).toHaveLength(4)
    })

    it('filters by payment status: has_balance', () => {
      const result = filterBroadcastRecipients({
        members: dummyMembers,
        fees: dummyFees,
        payments: dummyPayments,
        paymentFilter: 'has_balance'
      })
      // Hassan (id 2) has balance; Khadija (id 3) has paid 0 and is not exempt, so she also has balance
      expect(result.map(m => m.id)).toEqual([2, 3])
    })

    it('filters by payment status: fully_paid', () => {
      const result = filterBroadcastRecipients({
        members: dummyMembers,
        fees: dummyFees,
        payments: dummyPayments,
        paymentFilter: 'fully_paid'
      })
      expect(result.map(m => m.id)).toEqual([1])
    })

    it('filters by payment status: exempt', () => {
      const result = filterBroadcastRecipients({
        members: dummyMembers,
        fees: dummyFees,
        payments: dummyPayments,
        paymentFilter: 'exempt'
      })
      expect(result.map(m => m.id)).toEqual([4])
    })

    it('filters by gender and location', () => {
      const result = filterBroadcastRecipients({
        members: dummyMembers,
        fees: dummyFees,
        payments: dummyPayments,
        genderFilter: 'female',
        locationFilter: '10'
      })
      expect(result.map(m => m.id)).toEqual([1])
    })

    it('filters by search query matching phone', () => {
      const result = filterBroadcastRecipients({
        members: dummyMembers,
        fees: dummyFees,
        payments: dummyPayments,
        searchQuery: '788888888'
      })
      expect(result.map(m => m.id)).toEqual([2])
    })

    it('filters by membership status', () => {
      const result = filterBroadcastRecipients({
        members: dummyMembers,
        fees: dummyFees,
        payments: dummyPayments,
        statusFilter: 'inactive'
      })
      expect(result.map(m => m.id)).toEqual([3])
    })
  })

  describe('buildRecipientBatchPayload', () => {
    it('constructs batch dispatch payload with normalized numbers', () => {
      const payload = buildRecipientBatchPayload('45', ['1', '2', 3])
      expect(payload).toEqual({
        notification_id: 45,
        member_ids: [1, 2, 3]
      })
    })
  })
})
