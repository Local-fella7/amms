import { describe, it, expect } from 'vitest'

describe('Broadcast & Manual Compose Logic', () => {
  const getNotificationTitle = (
    nId: number | string,
    notifications: { id: number; name: string }[]
  ) => {
    if (nId === '__manual__') return 'Write Manually'
    const found = notifications.find(n => Number(n.id) === Number(nId))
    return found ? found.name : `Broadcast #${nId}`
  }

  const handleCampaignChange = (
    newId: number | string,
    notifications: { id: number; name: string; content?: string; notification_template_id?: number }[]
  ) => {
    if (newId === '__manual__') {
      return {
        isManual: true,
        selectedMemberIds: [],
        messageContent: '',
        selectedTemplateId: ''
      }
    }

    const found = notifications.find(n => Number(n.id) === Number(newId))
    return {
      isManual: false,
      selectedMemberIds: [],
      messageContent: found?.content ? found.content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear())) : '',
      selectedTemplateId: found?.notification_template_id ?? ''
    }
  }

  const getAssignedMemberIds = (
    notificationId: number | string,
    rawLinks: { notification_id: number; member_id: number }[]
  ): Set<number> => {
    if (!notificationId || notificationId === '__manual__') return new Set<number>()
    return new Set(
      rawLinks
        .filter(item => Number(item.notification_id) === Number(notificationId))
        .map(item => Number(item.member_id))
    )
  }

  const formatBroadcastSuccessMessage = (channel: string): string => {
    return `Broadcast successfully dispatched via ${channel.toUpperCase()}!`
  }

  const mockNotifications = [
    { id: 10, name: 'Annual General Meeting', content: 'Notice for AGM {{fee_year}}', notification_template_id: 2 },
    { id: 20, name: 'Fee Reminder', content: 'Please pay your balance', notification_template_id: 5 }
  ]

  const mockLinks = [
    { notification_id: 10, member_id: 1 },
    { notification_id: 10, member_id: 2 },
    { notification_id: 20, member_id: 3 }
  ]

  it('correctly resolves title for manual broadcast sentinel', () => {
    expect(getNotificationTitle('__manual__', mockNotifications)).toBe('Write Manually')
  })

  it('resolves regular campaign title by id', () => {
    expect(getNotificationTitle(10, mockNotifications)).toBe('Annual General Meeting')
    expect(getNotificationTitle(999, mockNotifications)).toBe('Broadcast #999')
  })

  it('resets selection and clears message when switching to Write Manually', () => {
    const result = handleCampaignChange('__manual__', mockNotifications)
    expect(result.isManual).toBe(true)
    expect(result.selectedMemberIds).toEqual([])
    expect(result.messageContent).toBe('')
    expect(result.selectedTemplateId).toBe('')
  })

  it('loads campaign template and content when selecting an existing campaign', () => {
    const currentYear = String(new Date().getFullYear())
    const result = handleCampaignChange(10, mockNotifications)
    expect(result.isManual).toBe(false)
    expect(result.messageContent).toBe(`Notice for AGM ${currentYear}`)
    expect(result.selectedTemplateId).toBe(2)
  })

  it('does not mark any member as pre-assigned in manual mode', () => {
    const assigned = getAssignedMemberIds('__manual__', mockLinks)
    expect(assigned.size).toBe(0)
    expect(assigned.has(1)).toBe(false)
  })

  it('identifies pre-assigned members for standard campaigns', () => {
    const assigned = getAssignedMemberIds(10, mockLinks)
    expect(assigned.size).toBe(2)
    expect(assigned.has(1)).toBe(true)
    expect(assigned.has(2)).toBe(true)
    expect(assigned.has(3)).toBe(false)
  })

  it('formats broadcast toast message without count or delivered text', () => {
    expect(formatBroadcastSuccessMessage('sms')).toBe('Broadcast successfully dispatched via SMS!')
    expect(formatBroadcastSuccessMessage('email')).toBe('Broadcast successfully dispatched via EMAIL!')
    expect(formatBroadcastSuccessMessage('both')).toBe('Broadcast successfully dispatched via BOTH!')
  })
})

describe('Report Date Range Formatting & Query Builder', () => {
  const formatDateToDMY = (val: string | Date | null | undefined): string => {
    if (!val) return ''
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const parts = val.substring(0, 10).split('-')
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    const d = val instanceof Date ? val : new Date(val)
    if (isNaN(d.getTime())) return ''
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  const formatDateToYMD = (val: string | Date | null | undefined): string => {
    if (!val) return ''
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.substring(0, 10)
    }
    if (val instanceof Date) {
      const yyyy = val.getFullYear()
      const mm = String(val.getMonth() + 1).padStart(2, '0')
      const dd = String(val.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
    return ''
  }

  const formatRangeDisplay = (range: { start?: Date | string | null; end?: Date | string | null } | null): string => {
    if (!range || !range.start) return ''
    const startStr = formatDateToDMY(range.start)
    if (!range.end) return `From ${startStr}`
    const endStr = formatDateToDMY(range.end)
    return `${startStr} - ${endStr}`
  }

  const buildDateQueryParams = (
    range: { start?: Date | string | null; end?: Date | string | null } | null
  ): Record<string, string> => {
    const params: Record<string, string> = {}
    if (!range || !range.start) return params
    const fromStr = formatDateToYMD(range.start)
    const toStr = range.end ? formatDateToYMD(range.end) : ''
    if (fromStr) params.from = fromStr
    if (toStr) params.to = toStr
    return params
  }

  it('formats ISO date strings to DD/MM/YYYY', () => {
    expect(formatDateToDMY('2026-10-10')).toBe('10/10/2026')
    expect(formatDateToDMY('2026-05-04')).toBe('04/05/2026')
  })

  it('formats Date objects to DD/MM/YYYY', () => {
    const date = new Date(2026, 9, 10) // Oct 10, 2026
    expect(formatDateToDMY(date)).toBe('10/10/2026')
  })

  it('formats full range display string as DD/MM/YYYY - DD/MM/YYYY', () => {
    const range = { start: '2026-10-10', end: '2026-11-10' }
    expect(formatRangeDisplay(range)).toBe('10/10/2026 - 10/11/2026')
  })

  it('formats open-ended start-only range display', () => {
    const range = { start: '2026-10-10', end: null }
    expect(formatRangeDisplay(range)).toBe('From 10/10/2026')
  })

  it('returns empty string for null or empty range', () => {
    expect(formatRangeDisplay(null)).toBe('')
    expect(formatRangeDisplay({ start: null, end: null })).toBe('')
  })

  it('builds valid from and to query params from date range', () => {
    const range = { start: '2026-10-10', end: '2026-11-10' }
    const params = buildDateQueryParams(range)
    expect(params).toEqual({
      from: '2026-10-10',
      to: '2026-11-10'
    })
  })

  it('builds only from param when end date is omitted', () => {
    const range = { start: '2026-10-10', end: null }
    const params = buildDateQueryParams(range)
    expect(params).toEqual({
      from: '2026-10-10'
    })
  })
})

describe('Settings Modal Categories & Navigation', () => {
  interface SettingItem {
    id: string
    title: string
    category: 'organization' | 'communications' | 'finance' | 'registry'
    path: string
  }

  const allSettingsItems: SettingItem[] = [
    { id: 'users', title: 'System Users', category: 'organization', path: '/settings/users' },
    { id: 'roles', title: 'Roles & Permissions', category: 'organization', path: '/settings/roles' },
    { id: 'features', title: 'System Features', category: 'organization', path: '/settings/features' },
    { id: 'feature-groups', title: 'Feature Modules', category: 'organization', path: '/settings/feature-groups' },
    { id: 'broadcast-templates', title: 'Broadcasts Templates', category: 'communications', path: '/notifications' },
    { id: 'fee-types', title: 'Annual Fee Schedules', category: 'finance', path: '/settings/fees' },
    { id: 'payment-methods', title: 'Payment Methods', category: 'finance', path: '/settings/payment-methods' },
    { id: 'locations', title: 'Branch Locations', category: 'registry', path: '/settings/locations' }
  ]

  const getItemsByCategory = (cat: string) => {
    return allSettingsItems.filter(item => item.category === cat)
  }

  it('contains all 4 expected categories', () => {
    const categories = ['organization', 'communications', 'finance', 'registry']
    categories.forEach(cat => {
      const items = getItemsByCategory(cat)
      expect(items.length).toBeGreaterThan(0)
    })
  })

  it('filters organization items properly', () => {
    const orgItems = getItemsByCategory('organization')
    expect(orgItems.map(i => i.id)).toEqual(['users', 'roles', 'features', 'feature-groups'])
  })

  it('links Broadcasts Templates under communications pointing to /notifications', () => {
    const commItems = getItemsByCategory('communications')
    const templateItem = commItems.find(i => i.id === 'broadcast-templates')
    expect(templateItem).toBeDefined()
    expect(templateItem?.path).toBe('/notifications')
    expect(templateItem?.title).toBe('Broadcasts Templates')
  })

  it('all settings items have non-empty paths starting with /', () => {
    allSettingsItems.forEach(item => {
      expect(item.path.startsWith('/')).toBe(true)
    })
  })
})
