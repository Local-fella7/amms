import { describe, it, expect } from 'vitest'
import type { Member, Fee, FeePayment } from '../../app/types'

// Extracted pure logic matching OverdueRemindersModal.vue
export interface OverdueMemberItem {
  member: Member
  requiredTotal: number
  paidTotal: number
  balance: number
}

export const calculateOverdueMembers = (
  members: Member[],
  fees: Fee[],
  payments: FeePayment[]
): OverdueMemberItem[] => {
  const totalRequired = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)

  return members
    .filter(m => m.member_status === 'active' && m.fee_exemption !== 'yes')
    .map(m => {
      const paidTotal = payments
        .filter(p => Number(p.member_id) === Number(m.id))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      const balance = Math.max(0, totalRequired - paidTotal)
      return {
        member: m,
        requiredTotal: totalRequired,
        paidTotal,
        balance
      }
    })
    .filter(item => item.balance > 0)
}

export const renderReminderMessage = (
  template: string,
  member: Member,
  balance: number,
  year = new Date().getFullYear()
): string => {
  return template
    .replace(/\{\{first_name\}\}/g, member.first_name || '')
    .replace(/\{\{last_name\}\}/g, member.last_name || '')
    .replace(/\{\{fee_year\}\}/g, String(year))
    .replace(/\{\{outstanding_balance\}\}/g, `TZS ${balance.toLocaleString('en-US')}`)
}

export const buildOverdueBatchPayload = (
  notificationId: number | string,
  overdueItems: OverdueMemberItem[]
) => {
  return {
    notification_id: Number(notificationId),
    member_ids: overdueItems.map(item => Number(item.member.id))
  }
}

describe('Overdue Reminders Logic', () => {
  const dummyFees: Fee[] = [
    { id: 1, year: 2025, amount: 50000 },
    { id: 2, year: 2026, amount: 60000 }
  ] // Total required = 110,000

  const dummyMembers: Member[] = [
    { id: 1, first_name: 'Amina', last_name: 'Yusuf', member_status: 'active', fee_exemption: 'no', phone: '255712345678', location_id: 1, age_group_id: 1, gender: 'female', date_of_birth: '1995-01-01', registration_date: '2025-01-01' },
    { id: 2, first_name: 'Hassan', last_name: 'Omar', member_status: 'active', fee_exemption: 'no', phone: '255788888888', location_id: 1, age_group_id: 2, gender: 'male', date_of_birth: '1980-05-15', registration_date: '2025-01-01' },
    { id: 3, first_name: 'Khadija', last_name: 'Ali', member_status: 'inactive', fee_exemption: 'no', phone: '255799999999', location_id: 2, age_group_id: 1, gender: 'female', date_of_birth: '1992-03-20', registration_date: '2025-01-01' },
    { id: 4, first_name: 'Elder', last_name: 'Farah', member_status: 'active', fee_exemption: 'yes', phone: '255777777777', location_id: 1, age_group_id: 3, gender: 'male', date_of_birth: '1945-01-01', registration_date: '2025-01-01' }
  ]

  const dummyPayments: FeePayment[] = [
    // Amina has paid 110,000 (fully paid, not overdue)
    { id: 101, member_id: 1, fee_id: 1, payment_mode_id: 1, amount: 50000, date: '2025-02-01' },
    { id: 102, member_id: 1, fee_id: 2, payment_mode_id: 1, amount: 60000, date: '2026-02-01' },
    // Hassan has paid only 50,000 (overdue balance = 60,000)
    { id: 103, member_id: 2, fee_id: 1, payment_mode_id: 1, amount: 50000, date: '2025-03-01' }
  ]

  describe('calculateOverdueMembers', () => {
    it('identifies only active, non-exempt members with outstanding balances', () => {
      const result = calculateOverdueMembers(dummyMembers, dummyFees, dummyPayments)
      expect(result).toHaveLength(1)
      expect(result[0].member.id).toBe(2)
      expect(result[0].balance).toBe(60000)
    })

    it('ignores inactive members even if they owe money', () => {
      const result = calculateOverdueMembers(dummyMembers, dummyFees, dummyPayments)
      const inactive = result.find(r => r.member.id === 3)
      expect(inactive).toBeUndefined()
    })

    it('ignores fee-exempt members', () => {
      const result = calculateOverdueMembers(dummyMembers, dummyFees, dummyPayments)
      const exempt = result.find(r => r.member.id === 4)
      expect(exempt).toBeUndefined()
    })
  })

  describe('renderReminderMessage', () => {
    it('interpolates member details and balance into template', () => {
      const template = 'Hello {{first_name}} {{last_name}}, you owe {{outstanding_balance}} for {{fee_year}}.'
      const member = dummyMembers[1] // Hassan Omar
      const rendered = renderReminderMessage(template, member, 60000, 2026)
      expect(rendered).toBe('Hello Hassan Omar, you owe TZS 60,000 for 2026.')
    })
  })

  describe('buildOverdueBatchPayload', () => {
    it('generates dispatch payload for all overdue members', () => {
      const overdueItems = calculateOverdueMembers(dummyMembers, dummyFees, dummyPayments)
      const payload = buildOverdueBatchPayload(99, overdueItems)
      expect(payload).toEqual({
        notification_id: 99,
        member_ids: [2]
      })
    })
  })
})
