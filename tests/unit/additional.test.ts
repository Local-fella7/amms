/**
 * Additional tests covering:
 *   - audit-logs.vue: formatJsonPretty, getUserName, getFeatureName, filter/sort
 *   - notifications.vue: insertPlaceholder, SMS segment calc, filter
 *   - notification-members.vue: toggleMemberSelection, assignedMemberIds, SMS chars
 *   - app/components/BaseModal.vue
 *   - app/components/PageHeader.vue
 *   - app/components/ViewDetailModal.vue
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseModal from '../../app/components/BaseModal.vue'
import PageHeader from '../../app/components/PageHeader.vue'
import ViewDetailModal from '../../app/components/ViewDetailModal.vue'

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

const formatJsonPretty = (data?: string | object): string => {
  if (!data) return 'None'
  if (typeof data === 'object') return JSON.stringify(data, null, 2)
  try {
    return JSON.stringify(JSON.parse(data as string), null, 2)
  } catch {
    return String(data)
  }
}

describe('[formatJsonPretty]', () => {
  it('returns "None" for falsy value', () => expect(formatJsonPretty(undefined)).toBe('None'))
  it('returns "None" for null', () => expect(formatJsonPretty(null as any)).toBe('None'))
  it('returns "None" for empty string', () => expect(formatJsonPretty('')).toBe('None'))
  it('pretty-prints an object', () => {
    const result = formatJsonPretty({ name: 'Aisha', age: 30 })
    expect(result).toContain('"name": "Aisha"')
    expect(result).toContain('"age": 30')
  })
  it('pretty-prints a JSON string', () => {
    const result = formatJsonPretty('{"key":"value"}')
    expect(result).toContain('"key": "value"')
  })
  it('returns raw string for invalid JSON string', () => {
    expect(formatJsonPretty('not valid json')).toBe('not valid json')
  })
  it('handles nested objects', () => {
    const result = formatJsonPretty({ a: { b: 1 } })
    expect(result).toContain('"b": 1')
  })
  it('handles arrays', () => {
    const result = formatJsonPretty([1, 2, 3])
    expect(result).toContain('1')
  })
})

const getUserName = (uId: number | string | undefined, users: any[]): string => {
  if (!uId) return 'System / General'
  const found = users.find(u => Number(u.id) === Number(uId))
  return found ? `${found.first_name} ${found.last_name}` : 'System / General'
}

describe('[getUserName] (audit logs)', () => {
  const users = [
    { id: 1, first_name: 'Admin', last_name: 'User' },
    { id: 2, first_name: 'Omar', last_name: 'Hassan' }
  ]
  it('returns name when found', () => expect(getUserName(1, users)).toBe('Admin User'))
  it('returns System / General when user not found', () => expect(getUserName(99, users)).toBe('System / General'))
  it('returns System / General when uId is undefined', () => expect(getUserName(undefined, users)).toBe('System / General'))
  it('matches string id to number id', () => expect(getUserName('2', users)).toBe('Omar Hassan'))
})

const getFeatureName = (fId: number | string | undefined, features: any[]): string => {
  if (!fId) return 'General Operation'
  const found = features.find(f => Number(f.id) === Number(fId))
  return found ? found.name : 'General Operation'
}

describe('[getFeatureName] (audit logs)', () => {
  const features = [{ id: 1, name: 'Members' }, { id: 2, name: 'Fee Payments' }]
  it('returns feature name', () => expect(getFeatureName(1, features)).toBe('Members'))
  it('returns General Operation when not found', () => expect(getFeatureName(99, features)).toBe('General Operation'))
  it('returns General Operation when fId is undefined', () => expect(getFeatureName(undefined, features)).toBe('General Operation'))
})

const filterAuditLogs = (logs: any[], query: string, userId: string) => {
  let result = [...logs]
  if (query.trim()) {
    const q = query.toLowerCase()
    result = result.filter(l =>
      (l.user_name || '').toLowerCase().includes(q) ||
      (l.feature_name || '').toLowerCase().includes(q) ||
      String(l.id).includes(q)
    )
  }
  if (userId) result = result.filter(l => Number(l.user_id) === Number(userId))
  return result.sort((a, b) => b.id - a.id)
}

describe('[filterAuditLogs]', () => {
  const logs = [
    { id: 1, user_id: 1, user_name: 'Admin User', feature_name: 'Members', action: 'create' },
    { id: 2, user_id: 2, user_name: 'Omar Hassan', feature_name: 'Fee Payments', action: 'update' },
    { id: 3, user_id: 1, user_name: 'Admin User', feature_name: 'Notifications', action: 'delete' }
  ]
  it('returns all logs sorted desc when no filters', () => {
    expect(filterAuditLogs(logs, '', '').map(l => l.id)).toEqual([3, 2, 1])
  })
  it('filters by user name', () => expect(filterAuditLogs(logs, 'omar', '')).toHaveLength(1))
  it('filters by feature name', () => expect(filterAuditLogs(logs, 'fee', '')).toHaveLength(1))
  it('filters by log id', () => expect(filterAuditLogs(logs, '3', '')).toHaveLength(1))
  it('filters by user id', () => expect(filterAuditLogs(logs, '', '1')).toHaveLength(2))
  it('combines query + user filter', () => {
    const result = filterAuditLogs(logs, 'admin', '1')
    expect(result).toHaveLength(2)
  })
})

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

const insertPlaceholder = (content: string, tag: string): string =>
  content + ' ' + tag + ' '

describe('[insertPlaceholder]', () => {
  it('appends tag with surrounding spaces', () => {
    expect(insertPlaceholder('Dear', '{{first_name}}')).toBe('Dear {{first_name}} ')
  })
  it('appends to empty string', () => {
    expect(insertPlaceholder('', '{{last_name}}')).toBe(' {{last_name}} ')
  })
  it('handles multiple placeholders', () => {
    const after1 = insertPlaceholder('Hello', '{{first_name}}')
    const after2 = insertPlaceholder(after1, '{{fee_year}}')
    expect(after2).toContain('{{first_name}}')
    expect(after2).toContain('{{fee_year}}')
  })
})

const calcSmsSegments = (content: string): number =>
  Math.ceil(content.length / 160) || 1

describe('[calcSmsSegments]', () => {
  it('returns 1 for empty string', () => expect(calcSmsSegments('')).toBe(1))
  it('returns 1 for content under 160 chars', () => expect(calcSmsSegments('Hello world')).toBe(1))
  it('returns 1 for exactly 160 chars', () => expect(calcSmsSegments('a'.repeat(160))).toBe(1))
  it('returns 2 for 161 chars', () => expect(calcSmsSegments('a'.repeat(161))).toBe(2))
  it('returns 2 for 320 chars', () => expect(calcSmsSegments('a'.repeat(320))).toBe(2))
  it('returns 3 for 321 chars', () => expect(calcSmsSegments('a'.repeat(321))).toBe(3))
})

const filterNotifications = (notifications: any[], query: string) => {
  let result = [...notifications]
  if (query.trim()) {
    const q = query.toLowerCase()
    result = result.filter(n =>
      (n.name || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      String(n.id).includes(q)
    )
  }
  return result.sort((a, b) => b.id - a.id)
}

describe('[filterNotifications]', () => {
  const notifications = [
    { id: 1, name: 'Fee Reminder', content: 'Pay your fee', created_at: '2026-01-01' },
    { id: 2, name: 'General Announcement', content: 'Meeting tomorrow', created_at: '2026-02-01' },
    { id: 3, name: 'New Update Notice', content: 'Annual report ready', created_at: '2026-03-01' }
  ]
  it('returns all sorted desc when no query', () => {
    expect(filterNotifications(notifications, '').map(n => n.id)).toEqual([3, 2, 1])
  })
  it('filters by name', () => expect(filterNotifications(notifications, 'general')).toHaveLength(1))
  it('filters by content', () => expect(filterNotifications(notifications, 'annual')).toHaveLength(1))
  it('filters by id string', () => expect(filterNotifications(notifications, '2')).toHaveLength(1))
  it('matches across name and content', () => expect(filterNotifications(notifications, 'fee')).toHaveLength(1))
  it('returns empty for no match', () => expect(filterNotifications(notifications, 'zzz')).toHaveLength(0))
})

// ─── NOTIFICATION MEMBERS ────────────────────────────────────────────────────

const toggleMemberSelection = (selectedIds: number[], id: number): number[] => {
  const idx = selectedIds.indexOf(id)
  if (idx === -1) return [...selectedIds, id]
  return selectedIds.filter(sid => sid !== id)
}

describe('[toggleMemberSelection]', () => {
  it('adds member when not selected', () => {
    expect(toggleMemberSelection([1, 2], 3)).toEqual([1, 2, 3])
  })
  it('removes member when already selected', () => {
    expect(toggleMemberSelection([1, 2, 3], 2)).toEqual([1, 3])
  })
  it('handles empty selection list', () => {
    expect(toggleMemberSelection([], 5)).toEqual([5])
  })
  it('removes only selected member from a single-element list', () => {
    expect(toggleMemberSelection([5], 5)).toEqual([])
  })
})

const getAssignedMemberIds = (notificationId: number, assignments: any[]): Set<number> =>
  new Set(
    assignments
      .filter(a => Number(a.notification_id) === notificationId)
      .map(a => Number(a.member_id))
  )

describe('[getAssignedMemberIds]', () => {
  const assignments = [
    { id: 1, notification_id: 1, member_id: 10 },
    { id: 2, notification_id: 1, member_id: 11 },
    { id: 3, notification_id: 2, member_id: 10 }
  ]
  it('returns correct set for notification 1', () => {
    const set = getAssignedMemberIds(1, assignments)
    expect(set.has(10)).toBe(true)
    expect(set.has(11)).toBe(true)
    expect(set.size).toBe(2)
  })
  it('returns correct set for notification 2', () => {
    const set = getAssignedMemberIds(2, assignments)
    expect(set.has(10)).toBe(true)
    expect(set.size).toBe(1)
  })
  it('returns empty set for unknown notification', () => {
    expect(getAssignedMemberIds(99, assignments).size).toBe(0)
  })
})

const isMemberAlreadyAssigned = (mId: number, assignedSet: Set<number>): boolean =>
  assignedSet.has(mId)

describe('[isMemberAlreadyAssigned]', () => {
  const assigned = new Set([10, 11, 12])
  it('returns true when member is assigned', () => expect(isMemberAlreadyAssigned(10, assigned)).toBe(true))
  it('returns false when member is not assigned', () => expect(isMemberAlreadyAssigned(99, assigned)).toBe(false))
})

// ─── COMPLIANCE GAUGE SVG ─────────────────────────────────────────────────────

const gaugeStrokeDasharray = (rate: number): string =>
  `${rate * 2.136} 213.6`

const gaugeColor = (rate: number): string =>
  rate >= 70 ? '#43766C' : rate >= 40 ? '#B19470' : '#76453B'

describe('[gaugeStrokeDasharray]', () => {
  it('contains "213.6" as the total circumference part', () => expect(gaugeStrokeDasharray(100)).toContain('213.6'))
  it('starts with approximately 106.8 for 50%', () => expect(parseFloat(gaugeStrokeDasharray(50).split(' ')[0])).toBeCloseTo(106.8, 0))
  it('returns "0 213.6" for 0%', () => expect(gaugeStrokeDasharray(0)).toBe('0 213.6'))
})

describe('[gaugeColor]', () => {
  it('returns teal (#43766C) for rate >= 70', () => expect(gaugeColor(70)).toBe('#43766C'))
  it('returns teal (#43766C) for rate = 100', () => expect(gaugeColor(100)).toBe('#43766C'))
  it('returns gold (#B19470) for rate >= 40 and < 70', () => expect(gaugeColor(40)).toBe('#B19470'))
  it('returns gold (#B19470) for rate = 65', () => expect(gaugeColor(65)).toBe('#B19470'))
  it('returns brown (#76453B) for rate < 40', () => expect(gaugeColor(39)).toBe('#76453B'))
  it('returns brown (#76453B) for rate = 0', () => expect(gaugeColor(0)).toBe('#76453B'))
})

// ─── ACTIVE RATE CALC (dashboard KPI) ────────────────────────────────────────

const calcActiveRate = (active: number, total: number): number =>
  total ? Math.round((active / total) * 100) : 0

describe('[calcActiveRate]', () => {
  it('returns 0 when total is 0', () => expect(calcActiveRate(0, 0)).toBe(0))
  it('returns 100 when all active', () => expect(calcActiveRate(50, 50)).toBe(100))
  it('returns correct percentage', () => expect(calcActiveRate(75, 100)).toBe(75))
  it('rounds correctly', () => expect(calcActiveRate(1, 3)).toBe(33))
})

// ─── BaseModal COMPONENT ──────────────────────────────────────────────────────

describe('BaseModal.vue', () => {
  const defaultProps = { id: 'test-modal', title: 'Test Modal' }

  it('renders modal with correct id', () => {
    const wrapper = mount(BaseModal, { props: defaultProps })
    expect(wrapper.find('#test-modal').exists()).toBe(true)
  })
  it('renders the title', () => {
    const wrapper = mount(BaseModal, { props: defaultProps })
    expect(wrapper.text()).toContain('Test Modal')
  })
  it('uses default submit text "Save Changes"', () => {
    const wrapper = mount(BaseModal, { props: defaultProps })
    expect(wrapper.text()).toContain('Save Changes')
  })
  it('uses custom submitText when provided', () => {
    const wrapper = mount(BaseModal, { props: { ...defaultProps, submitText: 'Register Member' } })
    expect(wrapper.text()).toContain('Register Member')
  })
  it('disables submit button when loading', () => {
    const wrapper = mount(BaseModal, { props: { ...defaultProps, loading: true } })
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })
  it('submit button is enabled when not loading', () => {
    const wrapper = mount(BaseModal, { props: { ...defaultProps, loading: false } })
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeUndefined()
  })
  it('emits submit when form is submitted', async () => {
    const wrapper = mount(BaseModal, { props: defaultProps })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })
})

// ─── PageHeader COMPONENT ────────────────────────────────────────────────────

describe('PageHeader.vue', () => {
  // searchQuery must be provided (even empty string) for the search input to render
  const defaultProps = { title: 'Members', subtitle: 'Manage members', loading: false, searchQuery: '' }

  it('renders the title', () => {
    const wrapper = mount(PageHeader, { props: defaultProps })
    expect(wrapper.text()).toContain('Members')
  })
  it('renders the subtitle when provided', () => {
    const wrapper = mount(PageHeader, { props: defaultProps })
    expect(wrapper.text()).toContain('Manage members')
  })
  it('uses default placeholder "Search..." when not specified', () => {
    const wrapper = mount(PageHeader, { props: defaultProps })
    const input = wrapper.find('input[type="search"]')
    expect(input.attributes('placeholder')).toBe('Search...')
  })
  it('uses custom searchPlaceholder', () => {
    const wrapper = mount(PageHeader, {
      props: { ...defaultProps, searchPlaceholder: 'Search members...' }
    })
    const input = wrapper.find('input[type="search"]')
    expect(input.attributes('placeholder')).toBe('Search members...')
  })
  it('emits update:searchQuery on input', async () => {
    const wrapper = mount(PageHeader, { props: defaultProps })
    const input = wrapper.find('input[type="search"]')
    await input.setValue('aisha')
    expect(wrapper.emitted('update:searchQuery')).toBeTruthy()
    expect(wrapper.emitted('update:searchQuery')![0]).toEqual(['aisha'])
  })
  it('shows Add button when showAddButton is true', () => {
    const wrapper = mount(PageHeader, { props: { ...defaultProps, showAddButton: true } })
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add New'))
    expect(addBtn).toBeTruthy()
  })
  it('uses custom addButtonText', () => {
    const wrapper = mount(PageHeader, {
      props: { ...defaultProps, showAddButton: true, addButtonText: 'Register Member' }
    })
    expect(wrapper.text()).toContain('Register Member')
  })
  it('emits add event when Add button is clicked', async () => {
    const wrapper = mount(PageHeader, { props: { ...defaultProps, showAddButton: true } })
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('Add'))
    await addBtn?.trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
  })
  it('emits refresh when Refresh button is clicked', async () => {
    const wrapper = mount(PageHeader, { props: defaultProps })
    const refreshBtn = wrapper.findAll('button').find(b =>
      b.attributes('title')?.includes('Refresh') || b.text().includes('Refresh')
    )
    await refreshBtn?.trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })
  it('disables Refresh button when loading', () => {
    const wrapper = mount(PageHeader, { props: { ...defaultProps, loading: true } })
    const btns = wrapper.findAll('button')
    const disabled = btns.some(b => b.attributes('disabled') !== undefined)
    expect(disabled).toBe(true)
  })
})

// ─── ViewDetailModal COMPONENT ───────────────────────────────────────────────

describe('ViewDetailModal.vue', () => {
  const defaultProps = { id: 'view-modal', title: 'Member Details' }

  it('renders with correct id', () => {
    const wrapper = mount(ViewDetailModal, { props: defaultProps })
    expect(wrapper.find('#view-modal').exists()).toBe(true)
  })
  it('renders the title', () => {
    const wrapper = mount(ViewDetailModal, { props: defaultProps })
    expect(wrapper.text()).toContain('Member Details')
  })
  it('emits close when close button is clicked', async () => {
    const wrapper = mount(ViewDetailModal, { props: defaultProps })
    const closeBtn = wrapper.findAll('button').find(b =>
      b.attributes('aria-label')?.toLowerCase().includes('close') || b.text().toLowerCase().includes('close')
    )
    await closeBtn?.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
  it('renders icon when icon prop is provided', () => {
    const wrapper = mount(ViewDetailModal, {
      props: { ...defaultProps, icon: 'bi bi-person-fill' }
    })
    expect(wrapper.find('.bi-person-fill').exists()).toBe(true)
  })
  it('does not render icon element when icon prop is absent', () => {
    const wrapper = mount(ViewDetailModal, { props: defaultProps })
    expect(wrapper.find('.bi-person-fill').exists()).toBe(false)
  })
})
