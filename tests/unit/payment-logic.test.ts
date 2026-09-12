import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type { FeePayment, Fee } from '../../app/types'

// Extracted pure logic matching SharedPaymentModal.vue & fee-payments.vue
export const calculatePriorPayments = (
  memberId: number | string,
  feeId: number | string,
  payments: FeePayment[]
): number => {
  if (!memberId || !feeId) return 0
  return payments
    .filter(p => Number(p.member_id) === Number(memberId) && Number(p.fee_id) === Number(feeId))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
}

export const calculateRemainingBalance = (
  feeSchedule: Fee | null | undefined,
  priorPayments: number
): number => {
  if (!feeSchedule) return 0
  const totalRequired = Number(feeSchedule.amount) || 0
  return Math.max(0, totalRequired - priorPayments)
}

export const paymentSchema = z.object({
  member_id: z.union([z.number(), z.string().min(1, 'Member selection is required')]),
  fee_id: z.union([z.number(), z.string().min(1, 'Fee schedule selection is required')]),
  payment_mode_id: z.union([z.number(), z.string().min(1, 'Payment mode is required')]),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(4, 'Payment date is required')
})

export const filterFeePayments = (
  payments: FeePayment[],
  query: string,
  modeFilter: string,
  yearFilter: string
): FeePayment[] => {
  let result = [...payments]

  if (query.trim()) {
    const q = query.toLowerCase().trim()
    result = result.filter(p => {
      const memberName = p.member ? `${p.member.first_name || ''} ${p.member.last_name || ''}`.toLowerCase() : ''
      const phone = p.member?.phone || ''
      const feeYear = String(p.fee?.fee_year || p.fee?.year || '')
      return memberName.includes(q) || phone.includes(q) || feeYear.includes(q)
    })
  }

  if (modeFilter) {
    result = result.filter(p => String(p.payment_mode_id) === String(modeFilter))
  }

  if (yearFilter) {
    result = result.filter(p => {
      const year = String(p.fee?.fee_year || p.fee?.year || '')
      return year === String(yearFilter)
    })
  }

  return result
}

describe('Payment Logic & Validation', () => {
  const dummyPayments: FeePayment[] = [
    { id: 1, member_id: 10, fee_id: 5, payment_mode_id: 1, amount: 20000, date: '2026-01-10', fee: { id: 5, fee_year: 2026, amount: 60000 }, member: { first_name: 'Amina', last_name: 'Ali', phone: '255711111111' } },
    { id: 2, member_id: 10, fee_id: 5, payment_mode_id: 2, amount: 15000, date: '2026-02-10', fee: { id: 5, fee_year: 2026, amount: 60000 }, member: { first_name: 'Amina', last_name: 'Ali', phone: '255711111111' } },
    { id: 3, member_id: 20, fee_id: 5, payment_mode_id: 1, amount: 60000, date: '2026-01-15', fee: { id: 5, fee_year: 2026, amount: 60000 }, member: { first_name: 'Omar', last_name: 'Hassan', phone: '255722222222' } },
    { id: 4, member_id: 10, fee_id: 4, payment_mode_id: 1, amount: 50000, date: '2025-01-10', fee: { id: 4, fee_year: 2025, amount: 50000 }, member: { first_name: 'Amina', last_name: 'Ali', phone: '255711111111' } }
  ]

  describe('calculatePriorPayments', () => {
    it('sums all payments made by member for specific fee', () => {
      const prior = calculatePriorPayments(10, 5, dummyPayments)
      expect(prior).toBe(35000) // 20000 + 15000
    })

    it('returns 0 when member has no payments for fee', () => {
      const prior = calculatePriorPayments(99, 5, dummyPayments)
      expect(prior).toBe(0)
    })

    it('returns 0 when memberId or feeId is missing', () => {
      expect(calculatePriorPayments('', 5, dummyPayments)).toBe(0)
      expect(calculatePriorPayments(10, '', dummyPayments)).toBe(0)
    })
  })

  describe('calculateRemainingBalance', () => {
    const fee2026: Fee = { id: 5, year: 2026, amount: 60000 }

    it('calculates remaining balance accurately', () => {
      const remaining = calculateRemainingBalance(fee2026, 35000)
      expect(remaining).toBe(25000)
    })

    it('returns 0 when prior payments equal or exceed required amount', () => {
      expect(calculateRemainingBalance(fee2026, 60000)).toBe(0)
      expect(calculateRemainingBalance(fee2026, 70000)).toBe(0)
    })

    it('returns 0 if fee schedule is null or undefined', () => {
      expect(calculateRemainingBalance(null, 20000)).toBe(0)
      expect(calculateRemainingBalance(undefined, 20000)).toBe(0)
    })
  })

  describe('paymentSchema Validation', () => {
    it('validates a correct payment payload', () => {
      const validPayload = {
        member_id: 10,
        fee_id: 5,
        payment_mode_id: 1,
        amount: 25000,
        date: '2026-09-12'
      }
      const result = paymentSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('rejects payload with zero or negative amount', () => {
      const zeroPayload = {
        member_id: 10,
        fee_id: 5,
        payment_mode_id: 1,
        amount: 0,
        date: '2026-09-12'
      }
      const result = paymentSchema.safeParse(zeroPayload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Amount must be greater than 0')
      }
    })

    it('rejects payload with missing member or fee', () => {
      const missingPayload = {
        member_id: '',
        fee_id: '',
        payment_mode_id: 1,
        amount: 10000,
        date: '2026-09-12'
      }
      const result = paymentSchema.safeParse(missingPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('filterFeePayments', () => {
    it('filters by member name query', () => {
      const res = filterFeePayments(dummyPayments, 'omar', '', '')
      expect(res).toHaveLength(1)
      expect(res[0].member?.first_name).toBe('Omar')
    })

    it('filters by payment mode', () => {
      const res = filterFeePayments(dummyPayments, '', '2', '')
      expect(res).toHaveLength(1)
      expect(res[0].id).toBe(2)
    })

    it('filters by fee year', () => {
      const res = filterFeePayments(dummyPayments, '', '', '2025')
      expect(res).toHaveLength(1)
      expect(res[0].id).toBe(4)
    })
  })
})
