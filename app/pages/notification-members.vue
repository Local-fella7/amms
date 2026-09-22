<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FeePayment, Member } from '~/types'

interface NotificationMemberItem {
  id: number
  notification_id: number | string
  member_id: number | string
  notification?: {
    id: number
    name: string
    content?: string
  }
  member?: {
    id: number
    first_name: string
    last_name: string
    phone?: string
    email?: string
    gender?: string
    location_id?: number | string
    member_status?: string
    fee_exemption?: string
    location?: {
      id: number
      name: string
    }
  }
  created_at?: string
  updated_at?: string
}

interface NotificationOption {
  id: number
  name: string
  content?: string
  notification_template_id?: number | string
}

interface NotificationTemplateOption {
  id: number
  name: string
  content: string
}

interface MemberOption {
  id: number
  first_name: string
  last_name: string
  phone?: string
  email?: string
  gender?: string
  location_id?: number | string
  member_status?: string
  fee_exemption?: string
  location?: {
    id: number
    name: string
  }
}

interface LocationOption {
  id: number
  name: string
}

const { data: notificationMembersResponse, loading, error, execute: fetchNotificationMembers, fetchWithAuth } = useApi<NotificationMemberItem[] | { data: NotificationMemberItem[] }>()
const { data: notifications, execute: fetchNotifications } = useApi<NotificationOption[]>()
const { data: templates, execute: fetchTemplates } = useApi<NotificationTemplateOption[]>()
const { data: members, execute: fetchMembers } = useApi<MemberOption[]>()
const { data: locations, execute: fetchLocations } = useApi<LocationOption[]>()
const { data: payments, execute: fetchPayments } = useApi<FeePayment[] | { data: FeePayment[] }>()

const searchQuery = ref('')
const selectedNotificationFilter = ref<string>('')
const selectedLocationFilter = ref<string>('')
const selectedStatusFilter = ref<string>('all')
const selectedReachabilityFilter = ref<string>('all')
const selectedPaymentFilter = ref<string>('all')
const selectedDateFilter = ref<string>('all')
const selectedGenderFilter = ref<string>('all')
const isFilterDrawerOpen = ref(false)

const secondaryActiveFilterCount = computed(() => {
  let count = 0
  if (selectedStatusFilter.value !== 'all') count++
  if (selectedReachabilityFilter.value !== 'all') count++
  if (selectedPaymentFilter.value !== 'all') count++
  if (selectedDateFilter.value !== 'all') count++
  if (selectedGenderFilter.value !== 'all') count++
  return count
})

const activeFilterCount = computed(() => {
  let count = secondaryActiveFilterCount.value
  if (selectedNotificationFilter.value) count++
  if (selectedLocationFilter.value) count++
  if (searchQuery.value.trim()) count++
  return count
})

const hasActiveFilters = computed(() => activeFilterCount.value > 0)

const resetAllFilters = () => {
  searchQuery.value = ''
  selectedNotificationFilter.value = ''
  selectedLocationFilter.value = ''
  selectedStatusFilter.value = 'all'
  selectedReachabilityFilter.value = 'all'
  selectedPaymentFilter.value = 'all'
  selectedDateFilter.value = 'all'
  selectedGenderFilter.value = 'all'
}

const isSubmitting = ref(false)
const modalError = ref('')
const isModalOpen = ref(false)

// Form / 2-Column Modal State
const notificationId = ref<number | string>('')
const selectedTemplateId = ref<number | string>('')
const messageContent = ref('')
const selectedMemberIds = ref<number[]>([])

// Broadcast Dispatch Channel State (Step 3: POST /api/notifications/{id}/broadcast)
const broadcastChannel = ref<'email' | 'sms' | 'both'>('both')
const isBroadcasting = ref(false)
const directDispatchNotifId = ref<number | string>('')
const directDispatchChannel = ref<'email' | 'sms' | 'both'>('both')
const isDirectDispatchModalOpen = ref(false)
const broadcastSummary = ref<{ sent: number; failed: number; channel: string } | null>(null)
const isSummaryModalOpen = ref(false)

// Left Column Filters
const memberFilterSearch = ref('')
const memberFilterLocation = ref<string>('')
const audienceFilter = ref<'all' | 'active' | 'inactive' | 'deceased' | 'outstanding'>('all')

// View Modal State
const viewingItem = ref<NotificationMemberItem | null>(null)
const isViewModalOpen = ref(false)

// Delete Modal State
const itemToDelete = ref<NotificationMemberItem | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const availablePlaceholders = [
  { tag: '{{first_name}}', label: 'First Name' },
  { tag: '{{last_name}}', label: 'Last Name' },
  { tag: '{{fee_year}}', label: 'Fee Year' },
  { tag: '{{phone}}', label: 'Phone' },
  { tag: '{{outstanding_balance}}', label: 'Outstanding Balance' }
]

const loadData = async () => {
  try {
    await Promise.all([
      fetchNotificationMembers((api) => api('/api/notification-members')),
      fetchNotifications((api) => api('/api/notifications')).catch(() => []),
      fetchTemplates((api) => api('/api/notification-templates')).catch(() => []),
      fetchMembers((api) => api('/api/members')).catch(() => []),
      fetchLocations((api) => api('/api/locations')).catch(() => []),
      fetchPayments((api) => api('/api/fee-payments')).catch(() => [])
    ])
  } catch (err) {
    // Handled by composable
  }
}

const rawList = computed<NotificationMemberItem[]>(() => {
  if (!notificationMembersResponse.value) return []
  const res = notificationMembersResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const getNotificationTitle = (nId: number | string) => {
  if (!notifications.value) return `Broadcast #${nId}`
  const found = notifications.value.find(n => Number(n.id) === Number(nId))
  return found ? found.name : `Broadcast #${nId}`
}

const getFullMember = (item: NotificationMemberItem): MemberOption | NotificationMemberItem['member'] | undefined => {
  if (members.value) {
    const found = members.value.find(m => Number(m.id) === Number(item.member_id))
    if (found) return found
  }
  return item.member
}

const getMemberName = (mId: number | string) => {
  if (!members.value) return `Member #${mId}`
  const found = members.value.find(m => Number(m.id) === Number(mId))
  return found ? `${found.first_name} ${found.last_name}` : `Member #${mId}`
}

const getMemberPhone = (mId: number | string) => {
  if (!members.value) return '—'
  const found = members.value.find(m => Number(m.id) === Number(mId))
  return found?.phone || '—'
}

const getLocationName = (locId?: number | string) => {
  if (!locId || !locations.value) return 'Main Branch'
  const found = locations.value.find(l => Number(l.id) === Number(locId))
  return found ? found.name : 'Branch'
}

const currentYear = new Date().getFullYear()

const paidMemberIds = computed(() => {
  const ids = new Set<number>()
  const list = Array.isArray(payments.value) ? payments.value : (payments.value?.data || [])
  list.forEach((p: FeePayment) => {
    if ((p.date || p.created_at || '').startsWith(String(currentYear))) {
      ids.add(Number(p.member_id))
    }
  })
  return ids
})

const isMemberOutstanding = (m?: MemberOption | Partial<Member>) => {
  if (!m) return false
  return (m.member_status || 'active') === 'active' && m.fee_exemption !== 'yes' && !paidMemberIds.value.has(Number(m.id))
}

const checkReachability = (member: MemberOption | Partial<Member> | null | undefined, mode: string) => {
  if (!member || mode === 'all') return true
  const phone = (member.phone || '').trim().replace(/\D/g, '')
  const email = (member.email || '').trim().toLowerCase()
  const hasPhone = phone.length >= 9
  const hasEmail = email.includes('@') && email.includes('.')

  if (mode === 'has_phone') return hasPhone
  if (mode === 'missing_phone') return !hasPhone
  if (mode === 'has_email') return hasEmail
  if (mode === 'missing_email') return !hasEmail
  return true
}

const checkPaymentStatus = (member: MemberOption | Partial<Member> | null | undefined, mode: string) => {
  if (!member || mode === 'all') return true
  if (mode === 'outstanding') return isMemberOutstanding(member)
  if (mode === 'paid') return paidMemberIds.value.has(Number(member.id))
  if (mode === 'exempted') return member.fee_exemption === 'yes'
  return true
}

const isDateMatching = (createdAtStr?: string, filterMode = 'all') => {
  if (!createdAtStr || filterMode === 'all') return true
  const created = new Date(createdAtStr)
  if (isNaN(created.getTime())) return true

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const createdTime = created.getTime()

  if (filterMode === 'today') {
    return createdTime >= todayStart
  }
  if (filterMode === 'this_week') {
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = todayStart - day * 86400000
    return createdTime >= weekStart
  }
  if (filterMode === 'this_month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return createdTime >= monthStart
  }
  return true
}

const filteredItems = computed(() => {
  let result = [...rawList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(item => {
      const m = getFullMember(item)
      const mName = m ? `${m.first_name} ${m.last_name}` : getMemberName(item.member_id)
      const phone = (m?.phone || '').toLowerCase()
      const email = (m?.email || '').toLowerCase()
      const nTitle = item.notification?.name || getNotificationTitle(item.notification_id)
      return mName.toLowerCase().includes(q) ||
             phone.includes(q) ||
             email.includes(q) ||
             nTitle.toLowerCase().includes(q) ||
             String(item.id).includes(q)
    })
  }

  // 1. Broadcast Filter
  if (selectedNotificationFilter.value) {
    result = result.filter(item => Number(item.notification_id) === Number(selectedNotificationFilter.value))
  }

  // 2. Location / Branch Filter
  if (selectedLocationFilter.value) {
    result = result.filter(item => {
      const m = getFullMember(item)
      return String(m?.location_id || '') === String(selectedLocationFilter.value)
    })
  }

  // 3. Member Status Filter
  if (selectedStatusFilter.value !== 'all') {
    result = result.filter(item => {
      const m = getFullMember(item)
      const status = m?.member_status || 'active'
      return status === selectedStatusFilter.value
    })
  }

  // 4. Reachability Filter
  if (selectedReachabilityFilter.value !== 'all') {
    result = result.filter(item => {
      const m = getFullMember(item)
      return checkReachability(m, selectedReachabilityFilter.value)
    })
  }

  // 5. Payment / Outstanding Status Filter
  if (selectedPaymentFilter.value !== 'all') {
    result = result.filter(item => {
      const m = getFullMember(item)
      return checkPaymentStatus(m, selectedPaymentFilter.value)
    })
  }

  // 6. Assignment Period / Date Filter
  if (selectedDateFilter.value !== 'all') {
    result = result.filter(item => isDateMatching(item.created_at, selectedDateFilter.value))
  }

  // 7. Gender Filter
  if (selectedGenderFilter.value !== 'all') {
    result = result.filter(item => {
      const m = getFullMember(item)
      return (m?.gender || '').toLowerCase() === selectedGenderFilter.value
    })
  }

  // Descending sort by ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage.value) || 1)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredItems.value.slice(start, start + itemsPerPage.value)
})

watch([
  searchQuery,
  selectedNotificationFilter,
  selectedLocationFilter,
  selectedStatusFilter,
  selectedReachabilityFilter,
  selectedPaymentFilter,
  selectedDateFilter,
  selectedGenderFilter,
  itemsPerPage
], () => {
  currentPage.value = 1
})

// Left Column Filtering for Available Members
const availableFilteredMembers = computed(() => {
  if (!members.value) return []
  return members.value.filter(m => {
    if (memberFilterSearch.value.trim()) {
      const q = memberFilterSearch.value.toLowerCase()
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
      const phone = (m.phone || '').toLowerCase()
      if (!fullName.includes(q) && !phone.includes(q)) return false
    }
    if (memberFilterLocation.value && String(m.location_id) !== String(memberFilterLocation.value)) {
      return false
    }
    if (audienceFilter.value === 'active') {
      if ((m.member_status || 'active') !== 'active') return false
    } else if (audienceFilter.value === 'inactive') {
      if (m.member_status !== 'inactive') return false
    } else if (audienceFilter.value === 'deceased') {
      if (m.member_status !== 'deceased') return false
    } else if (audienceFilter.value === 'outstanding') {
      if (!isMemberOutstanding(m)) return false
    }
    return true
  })
})

// Members assigned to the currently selected broadcast
const assignedMemberIdsForCurrentBroadcast = computed(() => {
  if (!notificationId.value) return new Set<number>()
  return new Set(
    rawList.value
      .filter(item => Number(item.notification_id) === Number(notificationId.value))
      .map(item => Number(item.member_id))
  )
})

const isMemberAlreadyAssigned = (mId: number) => {
  return assignedMemberIdsForCurrentBroadcast.value.has(Number(mId))
}

const toggleMemberSelection = (id: number) => {
  const idx = selectedMemberIds.value.indexOf(id)
  if (idx > -1) {
    selectedMemberIds.value.splice(idx, 1)
  } else {
    selectedMemberIds.value.push(id)
  }
}

const selectAllFiltered = () => {
  const ids = availableFilteredMembers.value
    .filter(m => !isMemberAlreadyAssigned(Number(m.id)))
    .map(m => Number(m.id))
  selectedMemberIds.value = Array.from(new Set([...selectedMemberIds.value, ...ids]))
}

const deselectAllFiltered = () => {
  const idsToRemove = new Set(availableFilteredMembers.value.map(m => Number(m.id)))
  selectedMemberIds.value = selectedMemberIds.value.filter(id => !idsToRemove.has(id))
}

const removeSelectedMember = (id: number) => {
  const idx = selectedMemberIds.value.indexOf(id)
  if (idx > -1) {
    selectedMemberIds.value.splice(idx, 1)
  }
}

const clearAllSelected = () => {
  selectedMemberIds.value = []
}

// Selected Members List for Preview
const selectedMembersObjects = computed(() => {
  if (!members.value) return []
  const idMap = new Map(members.value.map(m => [Number(m.id), m]))
  return selectedMemberIds.value.map(id => idMap.get(id)).filter(Boolean) as MemberOption[]
})

const previewSampleMessage = computed(() => {
  if (!messageContent.value) return 'Type message or select a template to preview...'
  return messageContent.value
    .replace(/\{\{first_name\}\}/g, 'Halima')
    .replace(/\{\{last_name\}\}/g, 'Said')
    .replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
    .replace(/\{\{phone\}\}/g, '+255 711 222 333')
    .replace(/\{\{outstanding_balance\}\}/g, 'TZS 50,000')
})

const smsCharCount = computed(() => messageContent.value.length)
const smsSegmentCount = computed(() => Math.ceil(messageContent.value.length / 160) || 1)

// Auto-fill message content AND template when broadcast campaign is changed
watch(notificationId, (newNotifId) => {
  if (!newNotifId || !notifications.value) return
  const found = notifications.value.find(n => Number(n.id) === Number(newNotifId))
  if (!found) return

  // Auto-select the template linked to this campaign
  if (found.notification_template_id) {
    selectedTemplateId.value = found.notification_template_id
  } else {
    selectedTemplateId.value = ''
  }

  // Auto-fill message content from the campaign (only if not already typed)
  if (found.content) {
    messageContent.value = found.content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
  }
})

watch(selectedTemplateId, (newTmplId) => {
  if (!newTmplId || !templates.value) return
  const found = templates.value.find(t => Number(t.id) === Number(newTmplId))
  if (found && found.content) {
    messageContent.value = found.content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
  }
})

const insertPlaceholder = (tag: string) => {
  const valueToInsert = tag === '{{fee_year}}' ? String(new Date().getFullYear()) : tag
  messageContent.value = messageContent.value ? `${messageContent.value} ${valueToInsert} ` : `${valueToInsert} `
}

const openAddModal = () => {
  notificationId.value = notifications.value && notifications.value.length > 0 ? notifications.value[0].id : ''
  selectedTemplateId.value = ''
  messageContent.value = ''
  selectedMemberIds.value = []
  memberFilterSearch.value = ''
  memberFilterLocation.value = ''
  audienceFilter.value = 'all'
  modalError.value = ''
  
  if (notifications.value && notifications.value.length > 0) {
    const first = notifications.value[0]
    if (first.content) messageContent.value = first.content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
  }
  
  isModalOpen.value = true
}

const openViewModal = (item: NotificationMemberItem) => {
  viewingItem.value = item
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingItem.value = null
  isViewModalOpen.value = false
}

const closeModal = () => {
  isModalOpen.value = false
  selectedMemberIds.value = []
}

const formatDateDisplay = (val?: string) => {
  if (!val) return '—'
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-')
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return str
}

const handleSaveBatch = async (alsoBroadcast = false) => {
  modalError.value = ''
  
  if (!notificationId.value) {
    modalError.value = 'Please select a broadcast campaign'
    push.error(modalError.value)
    return
  }

  if (selectedMemberIds.value.length === 0) {
    modalError.value = 'Please select at least one recipient member from the left column'
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  if (alsoBroadcast) isBroadcasting.value = true

  try {
    // 1. If message content was edited or selected from template, update broadcast content
    if (notificationId.value && messageContent.value.trim()) {
      const currentNotif = notifications.value?.find(n => Number(n.id) === Number(notificationId.value))
      const sanitizedContent = messageContent.value.trim().replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
      if (currentNotif && currentNotif.content !== sanitizedContent) {
        await fetchWithAuth(`/api/notifications/${notificationId.value}`, {
          method: 'PUT',
          body: {
            name: currentNotif.name ? currentNotif.name.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear())) : `Broadcast #${notificationId.value}`,
            content: sanitizedContent,
            notification_template_id: selectedTemplateId.value || currentNotif.notification_template_id
          }
        }).catch(() => {})
      }
    }

    // 2. Link unassigned members (Step 2)
    const toAssign = selectedMemberIds.value.filter(id => !assignedMemberIdsForCurrentBroadcast.value.has(id))
    let successCount = 0
    if (toAssign.length > 0) {
      for (const mId of toAssign) {
        await fetchWithAuth('/api/notification-members', {
          method: 'POST',
          body: {
            notification_id: Number(notificationId.value),
            member_id: Number(mId)
          }
        })
        successCount++
      }
    }

    // 3. If requested, trigger broadcast dispatch (Step 3: POST /api/notifications/{id}/broadcast)
    if (alsoBroadcast) {
      const res = await fetchWithAuth<{ data?: { sent?: number; failed?: number } }>(`/api/notifications/${notificationId.value}/broadcast`, {
        method: 'POST',
        body: {
          channel: broadcastChannel.value
        }
      })

      const sentCount = res?.data?.sent ?? (successCount > 0 ? successCount : selectedMemberIds.value.length)
      const failedCount = res?.data?.failed ?? 0
      broadcastSummary.value = {
        sent: Number(sentCount),
        failed: Number(failedCount),
        channel: broadcastChannel.value
      }
      isSummaryModalOpen.value = true
      push.success(`Broadcast successfully dispatched via ${broadcastChannel.value.toUpperCase()}!`)
    } else {
      push.success(`Successfully assigned ${successCount} recipient(s) to the broadcast campaign!`)
    }

    closeModal()
    await loadData()
  } catch (err: unknown) {
    modalError.value = extractErrorMessage(err, 'Failed to complete broadcast operation')
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
    isBroadcasting.value = false
  }
}

// Direct Campaign Dispatch Helpers
const directDispatchRecipientCount = computed(() => {
  if (!directDispatchNotifId.value || !rawList.value) return 0
  return rawList.value.filter(item => Number(item.notification_id) === Number(directDispatchNotifId.value)).length
})

const openDirectDispatchModal = (notifId?: number | string) => {
  const targetId = notifId || selectedNotificationFilter.value || (notifications.value && notifications.value[0]?.id)
  if (!targetId) {
    push.warning('Please select a broadcast campaign first')
    return
  }
  directDispatchNotifId.value = targetId
  directDispatchChannel.value = 'both'
  isDirectDispatchModalOpen.value = true
}

const closeDirectDispatchModal = () => {
  isDirectDispatchModalOpen.value = false
}

const executeDirectDispatch = async () => {
  if (!directDispatchNotifId.value) return
  isBroadcasting.value = true
  try {
    const res = await fetchWithAuth<{ data?: { sent?: number; failed?: number } }>(`/api/notifications/${directDispatchNotifId.value}/broadcast`, {
      method: 'POST',
      body: {
        channel: directDispatchChannel.value
      }
    })

    const notifName = getNotificationTitle(directDispatchNotifId.value)
    const sentCount = res?.data?.sent ?? directDispatchRecipientCount.value
    const failedCount = res?.data?.failed ?? 0
    broadcastSummary.value = {
      sent: Number(sentCount),
      failed: Number(failedCount),
      channel: directDispatchChannel.value
    }
    closeDirectDispatchModal()
    isSummaryModalOpen.value = true
    push.success(`Broadcast "${notifName}" dispatched via ${directDispatchChannel.value.toUpperCase()}!`)
    await loadData()
  } catch (err: unknown) {
    const msg = extractErrorMessage(err, 'Failed to dispatch broadcast')
    push.error(msg)
  } finally {
    isBroadcasting.value = false
  }
}

const promptDelete = (item: NotificationMemberItem) => {
  itemToDelete.value = item
  isDeleteModalOpen.value = true
}

const cancelDelete = () => {
  itemToDelete.value = null
  isDeleteModalOpen.value = false
}

const confirmDelete = async () => {
    if (!itemToDelete.value) return
    
    const success = await mutate(api => api(`/api/notification-members/${itemToDelete.value.id}`, { method: 'DELETE' }), {
      successMessage: 'Recipient member assignment removed successfully!'
    })
    
    if (success) {
      cancelDelete()
      await loadData()
    }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="Broadcasts"
      subtitle="Dispatch and manage targeted member communications and campaigns"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search member name or campaign..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="New Broadcast"
      @add="openAddModal"
    />

    <!-- Integrated Table Card -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Top Table Toolbar with Integrated Filters -->
      <div class="card-header bg-body-tertiary border-bottom px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          
          <!-- Broadcast Filter -->
          <div class="d-flex align-items-center gap-1.5">
            <span class="text-xs fw-semibold text-muted text-uppercase font-monospace">Broadcast:</span>
            <select 
              v-model="selectedNotificationFilter" 
              class="form-select form-select-sm filter-pill-select rounded-pill text-xs shadow-none border bg-body"
              style="min-width: 200px;"
            >
              <option value="">All Broadcasts ({{ rawList.length }})</option>
              <option v-for="n in notifications" :key="n.id" :value="String(n.id)">
                {{ n.name }}
              </option>
            </select>
          </div>

          <!-- Branch / Location Filter -->
          <div class="d-flex align-items-center gap-1.5">
            <span class="text-xs fw-semibold text-muted text-uppercase font-monospace">Branch:</span>
            <select 
              v-model="selectedLocationFilter" 
              class="form-select form-select-sm filter-pill-select rounded-pill text-xs shadow-none border bg-body"
              style="min-width: 170px;"
            >
              <option value="">All Branches</option>
              <option v-for="loc in locations" :key="loc.id" :value="String(loc.id)">
                {{ loc.name }}
              </option>
            </select>
          </div>

          <!-- More Filters Drawer Toggle Button -->
          <button 
            type="button" 
            class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold shadow-2xs d-flex align-items-center gap-1.5 transition-all"
            :class="isFilterDrawerOpen || secondaryActiveFilterCount > 0 ? 'btn-primary' : 'btn-outline-secondary'"
            @click="isFilterDrawerOpen = !isFilterDrawerOpen"
            title="Toggle more filters"
          >
            <i class="bi bi-sliders"></i>
            <span>Filters</span>
            <span v-if="secondaryActiveFilterCount > 0" class="badge rounded-pill bg-warning text-dark ms-0.5">
              +{{ secondaryActiveFilterCount }}
            </span>
          </button>

          <!-- Dispatch Selected Campaign Button -->
          <button 
            v-if="selectedNotificationFilter"
            type="button" 
            class="btn btn-sm btn-primary rounded-pill px-3 py-1 text-xs fw-semibold shadow-2xs d-flex align-items-center gap-1.5"
            @click="openDirectDispatchModal(selectedNotificationFilter)"
          >
            <i class="bi bi-broadcast"></i> Dispatch Campaign
          </button>

          <!-- Clear All Filters -->
          <button 
            v-if="hasActiveFilters"
            class="btn btn-sm btn-link text-decoration-none text-xs text-danger p-0 ms-1"
            @click="resetAllFilters"
          >
            <i class="bi bi-x-circle me-1"></i>Reset
          </button>
        </div>

        <!-- Total Counter Badge -->
        <div class="text-xs text-muted font-monospace d-none d-sm-block">
          Showing <span class="fw-bold text-primary">{{ filteredItems.length }}</span> of {{ rawList.length }} assignments
        </div>
      </div>

      <!-- Expandable Secondary Filter Drawer -->
      <div v-if="isFilterDrawerOpen" class="bg-body-tertiary border-bottom px-4 py-3">
        <div class="row g-2.5 align-items-end">
          <!-- Member Status Filter -->
          <div class="col-12 col-sm-6 col-md-4 col-lg-2">
            <label class="form-label text-xs fw-semibold text-muted text-uppercase mb-1">Status</label>
            <select v-model="selectedStatusFilter" class="form-select form-select-sm rounded-3 text-xs shadow-none bg-body">
              <option value="all">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="inactive">Inactive Members</option>
              <option value="deceased">Deceased</option>
            </select>
          </div>

          <!-- Reachability Filter -->
          <div class="col-12 col-sm-6 col-md-4 col-lg-3">
            <label class="form-label text-xs fw-semibold text-muted text-uppercase mb-1">Contact Reachability</label>
            <select v-model="selectedReachabilityFilter" class="form-select form-select-sm rounded-3 text-xs shadow-none bg-body">
              <option value="all">All Channels</option>
              <option value="has_phone">Phone Available (SMS-Ready)</option>
              <option value="missing_phone">⚠️ Missing Phone (Needs Update)</option>
              <option value="has_email">Email Available</option>
              <option value="missing_email">Missing Email</option>
            </select>
          </div>

          <!-- Payment / Dues Filter -->
          <div class="col-12 col-sm-6 col-md-4 col-lg-3">
            <label class="form-label text-xs fw-semibold text-muted text-uppercase mb-1">Fee Status ({{ currentYear }})</label>
            <select v-model="selectedPaymentFilter" class="form-select form-select-sm rounded-3 text-xs shadow-none bg-body">
              <option value="all">All Payment Statuses</option>
              <option value="outstanding">Outstanding Dues (Due {{ currentYear }})</option>
              <option value="paid">Fully Paid</option>
              <option value="exempted">Fee Exempted</option>
            </select>
          </div>

          <!-- Gender Filter -->
          <div class="col-12 col-sm-6 col-md-4 col-lg-2">
            <label class="form-label text-xs fw-semibold text-muted text-uppercase mb-1">Gender</label>
            <select v-model="selectedGenderFilter" class="form-select form-select-sm rounded-3 text-xs shadow-none bg-body">
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <!-- Assigned Period -->
          <div class="col-12 col-sm-6 col-md-4 col-lg-2">
            <label class="form-label text-xs fw-semibold text-muted text-uppercase mb-1">Assigned Period</label>
            <select v-model="selectedDateFilter" class="form-select form-select-sm rounded-3 text-xs shadow-none bg-body">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>

        <!-- Active filter chips -->
        <div v-if="hasActiveFilters" class="d-flex flex-wrap align-items-center gap-1.5 mt-3 pt-2 border-top">
          <span class="text-xs text-muted me-1 font-monospace">Active Filters:</span>
          
          <span v-if="selectedNotificationFilter" class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 rounded-pill px-2.5 py-1 text-xs d-flex align-items-center gap-1">
            <i class="bi bi-broadcast"></i> {{ getNotificationTitle(selectedNotificationFilter) }}
            <i class="bi bi-x cursor-pointer ms-1" @click="selectedNotificationFilter = ''"></i>
          </span>

          <span v-if="selectedLocationFilter" class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 rounded-pill px-2.5 py-1 text-xs d-flex align-items-center gap-1">
            <i class="bi bi-geo-alt"></i> {{ getLocationName(selectedLocationFilter) }}
            <i class="bi bi-x cursor-pointer ms-1" @click="selectedLocationFilter = ''"></i>
          </span>

          <span v-if="selectedStatusFilter !== 'all'" class="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-2.5 py-1 text-xs d-flex align-items-center gap-1 text-capitalize">
            Status: {{ selectedStatusFilter }}
            <i class="bi bi-x cursor-pointer ms-1" @click="selectedStatusFilter = 'all'"></i>
          </span>

          <span v-if="selectedReachabilityFilter !== 'all'" class="badge rounded-pill px-2.5 py-1 text-xs d-flex align-items-center gap-1"
            :class="selectedReachabilityFilter === 'missing_phone' ? 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25' : 'bg-info bg-opacity-10 text-info border border-info border-opacity-25'">
            <i class="bi bi-telephone"></i>
            {{ selectedReachabilityFilter === 'has_phone' ? 'Has Phone' : selectedReachabilityFilter === 'missing_phone' ? 'Missing Phone' : selectedReachabilityFilter === 'has_email' ? 'Has Email' : 'Missing Email' }}
            <i class="bi bi-x cursor-pointer ms-1" @click="selectedReachabilityFilter = 'all'"></i>
          </span>

          <span v-if="selectedPaymentFilter !== 'all'" class="badge rounded-pill px-2.5 py-1 text-xs d-flex align-items-center gap-1"
            :class="selectedPaymentFilter === 'outstanding' ? 'bg-warning bg-opacity-15 text-warning-emphasis border border-warning border-opacity-25' : 'bg-success bg-opacity-10 text-success border border-success border-opacity-25'">
            <i class="bi bi-cash-stack"></i>
            {{ selectedPaymentFilter === 'outstanding' ? 'Outstanding Dues' : selectedPaymentFilter === 'paid' ? 'Paid' : 'Exempted' }}
            <i class="bi bi-x cursor-pointer ms-1" @click="selectedPaymentFilter = 'all'"></i>
          </span>

          <span v-if="selectedGenderFilter !== 'all'" class="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-2.5 py-1 text-xs d-flex align-items-center gap-1 text-capitalize">
            Gender: {{ selectedGenderFilter }}
            <i class="bi bi-x cursor-pointer ms-1" @click="selectedGenderFilter = 'all'"></i>
          </span>

          <span v-if="selectedDateFilter !== 'all'" class="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-2.5 py-1 text-xs d-flex align-items-center gap-1 text-capitalize">
            Period: {{ selectedDateFilter.replace('_', ' ') }}
            <i class="bi bi-x cursor-pointer ms-1" @click="selectedDateFilter = 'all'"></i>
          </span>

          <button class="btn btn-link btn-xs text-danger text-decoration-none p-0 ms-2" @click="resetAllFilters">
            Clear All
          </button>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="alert alert-danger rounded-0 mb-0 py-3 px-4 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <span>{{ error }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-pill" @click="loadData">Retry</button>
      </div>

      <!-- Replaced by AppTable Component -->
      <AppTable
        :columns="[
          { key: 'id', label: '# ID', width: '70px', headerClass: 'ps-4 d-none d-xl-table-cell', cellClass: 'ps-4 font-monospace text-muted text-xs d-none d-xl-table-cell' },
          { key: 'recipient-member', label: 'Recipient Member', cellClass: 'fw-semibold text-primary' },
          { key: 'phone-number', label: 'Contact Reachability', headerClass: 'd-none d-sm-table-cell', cellClass: 'd-none d-sm-table-cell' },
          { key: 'broadcast-campaign', label: 'Broadcast Campaign', headerClass: 'd-none d-md-table-cell', cellClass: 'd-none d-md-table-cell' },
          { key: 'status-branch', label: 'Branch & Status', headerClass: 'd-none d-lg-table-cell', cellClass: 'd-none d-lg-table-cell text-xs' },
          { key: 'assigned-date', label: 'Assigned Date', headerClass: 'd-none d-xl-table-cell', cellClass: 'font-monospace text-xs text-secondary-amms d-none d-xl-table-cell' },
          { key: 'actions', label: 'Actions', align: 'right', width: '110px', headerClass: 'pe-4', cellClass: 'pe-4' }
        ]"
        :items="paginatedItems"
        :loading="loading"
        emptyIcon="bi bi-person-lines-fill"
        emptyTitle="No broadcast recipients match filters"
        emptySubtitle="Try adjusting your search criteria or click 'Reset' above."
      >
        <template #cell-id="{ item }">
          #{{ item.id }}
        </template>
        
        <template #cell-recipient-member="{ item }">
          <div class="d-flex align-items-center gap-2.5">
            <MemberAvatar :member="getFullMember(item)" />
            <div>
              <div class="d-flex align-items-center gap-1.5 flex-wrap">
                <span>{{ item.member ? `${item.member.first_name} ${item.member.last_name}` : getMemberName(item.member_id) }}</span>
                <span v-if="getFullMember(item)?.location_id" class="badge bg-secondary bg-opacity-10 text-secondary-amms text-2xs rounded-pill d-lg-none">
                  {{ getLocationName(getFullMember(item)?.location_id) }}
                </span>
              </div>
              <div class="d-flex align-items-center gap-2 mt-0.5">
                <small v-if="getFullMember(item)?.gender" class="text-muted text-xs text-capitalize">
                  <i :class="getFullMember(item)?.gender === 'female' ? 'bi bi-gender-female text-danger' : 'bi bi-gender-male text-primary'" class="me-0.5"></i>{{ getFullMember(item)?.gender }}
                </small>
                <span v-if="(getFullMember(item)?.member_status || 'active') !== 'active'" class="badge bg-warning bg-opacity-10 text-warning text-2xs text-capitalize">
                  {{ getFullMember(item)?.member_status }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <template #cell-phone-number="{ item }">
          <div class="d-flex flex-column gap-0.5">
            <div class="d-flex align-items-center gap-1.5">
              <template v-if="getFullMember(item)?.phone && getFullMember(item)?.phone?.trim().length >= 9">
                <i class="bi bi-telephone-fill text-success text-xs"></i>
                <span class="font-monospace text-xs text-body">{{ getFullMember(item)?.phone }}</span>
              </template>
              <template v-else>
                <span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-2 py-0.5 text-xs font-monospace">
                  <i class="bi bi-exclamation-circle-fill me-1"></i>No Phone
                </span>
              </template>
            </div>
            <small v-if="getFullMember(item)?.email" class="text-muted text-xs font-monospace text-truncate" style="max-width: 170px;">
              <i class="bi bi-envelope text-muted me-1"></i>{{ getFullMember(item)?.email }}
            </small>
          </div>
        </template>

        <template #cell-broadcast-campaign="{ item }">
          <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs fw-semibold">
            <i class="bi bi-send-fill me-1"></i>
            {{ item.notification?.name || getNotificationTitle(item.notification_id) }}
          </span>
        </template>

        <template #cell-status-branch="{ item }">
          <div class="d-flex flex-column gap-0.5">
            <span class="fw-semibold text-body">
              <i class="bi bi-geo-alt text-muted me-1"></i>{{ getLocationName(getFullMember(item)?.location_id) }}
            </span>
            <div class="d-flex align-items-center gap-1.5 flex-wrap">
              <span class="badge rounded-pill text-2xs"
                :class="(getFullMember(item)?.member_status || 'active') === 'active' ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'">
                {{ getFullMember(item)?.member_status || 'active' }}
              </span>
              <span v-if="isMemberOutstanding(getFullMember(item))" class="badge bg-warning bg-opacity-15 text-warning-emphasis text-2xs">
                Fee Due
              </span>
              <span v-else-if="getFullMember(item)?.fee_exemption === 'yes'" class="badge badge-exempted text-2xs px-2 py-0.5 rounded-pill">
                Exempted
              </span>
            </div>
          </div>
        </template>

        <template #cell-assigned-date="{ item }">
          {{ formatDateDisplay(item.created_at) }}
        </template>

        <template #cell-actions="{ item }">
          <div class="d-flex align-items-center justify-content-end gap-1">
            <button 
              class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
              @click="openViewModal(item)"
              title="View Assignment Details"
            >
              <i class="bi bi-eye-fill text-primary"></i>
            </button>
            <button 
              class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
              @click="promptDelete(item)"
              title="Remove Recipient"
            >
              <i class="bi bi-trash-fill text-danger"></i>
            </button>
          </div>
        </template>
      </AppTable>

      <!-- Pagination Footer -->
      <PaginationControl
        v-if="filteredItems.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredItems.length"
      />

    </div>

    <!-- View Detail Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewNotificationMemberModal"
      title="Recipient Assignment Details"
      icon="bi bi-person-check"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Recipient Member</span>
            <span class="fw-bold text-primary fs-6">{{ viewingItem ? (viewingItem.member ? `${viewingItem.member.first_name} ${viewingItem.member.last_name}` : getMemberName(viewingItem.member_id)) : '—' }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Phone Number</span>
            <span class="fw-semibold text-body font-monospace text-xs">{{ viewingItem ? (viewingItem.member?.phone || getMemberPhone(viewingItem.member_id)) : '—' }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Email Address</span>
            <span class="fw-semibold text-body font-monospace text-xs">{{ viewingItem ? (getFullMember(viewingItem)?.email || '—') : '—' }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Location Branch</span>
            <span class="fw-semibold text-body text-xs">{{ viewingItem ? getLocationName(getFullMember(viewingItem)?.location_id) : '—' }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Status & Exemption</span>
            <span class="fw-semibold text-body text-xs text-capitalize">
              {{ viewingItem ? (getFullMember(viewingItem)?.member_status || 'Active') : '—' }}
              <span v-if="getFullMember(viewingItem)?.fee_exemption === 'yes'" class="badge badge-exempted ms-1 px-2 py-0.5 rounded-pill">Exempted</span>
            </span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Assigned Broadcast</span>
            <span class="fw-semibold text-body text-xs">{{ viewingItem ? (viewingItem.notification?.name || getNotificationTitle(viewingItem.notification_id)) : '—' }}</span>
          </div>
          <div class="col-md-6" v-if="viewingItem?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Assigned Date</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ formatDateDisplay(viewingItem.created_at) }}</span>
          </div>
        </div>
      </div>
    </ViewDetailModal>

    <DeleteConfirmModal
      v-model="isDeleteModalOpen"
      message="Are you sure you want to permanently remove this recipient from the notification?"
        :itemTitle="itemToDelete ? `&quot;${itemToDelete.member?.first_name} ${itemToDelete.member?.last_name}&quot;` : ''"
      :loading="isDeleting"
      confirmText="Remove Recipient"
      @confirm="confirmDelete"
    />

    <!-- Shared Broadcast Recipient / Dispatch Studio Modal -->
    <SharedBroadcastRecipientModal
      v-if="isModalOpen"
      @close="closeModal"
      @saved="loadData"
    />

    <!-- Direct Campaign Dispatch Modal -->
    <div v-if="isDirectDispatchModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    <div v-if="isDirectDispatchModalOpen" class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index: 1065;" @click.self="closeDirectDispatchModal">
      <div class="modal-dialog modal-dialog-centered modal-md">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary">
            <div class="d-flex align-items-center gap-2.5">
              <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-2xs" style="width: 38px; height: 38px; background-color: var(--amms-primary); color: #fff;">
                <i class="bi bi-broadcast fs-5"></i>
              </div>
              <div>
                <h5 class="modal-title fw-bold text-primary text-sm mb-0">Dispatch Broadcast Campaign</h5>
                <small class="text-muted text-xs">Execute immediate delivery to all linked recipients</small>
              </div>
            </div>
            <button type="button" class="btn-close" @click="closeDirectDispatchModal" aria-label="Close"></button>
          </div>
          
          <div class="modal-body p-4">
            <div class="bg-body-tertiary rounded-3 p-3 border mb-3">
              <span class="text-xs text-muted text-uppercase fw-semibold d-block mb-1">Target Campaign</span>
              <h6 class="fw-bold text-primary mb-1">{{ getNotificationTitle(directDispatchNotifId) }}</h6>
              <span class="badge bg-primary text-white rounded-pill text-xs font-monospace">
                {{ directDispatchRecipientCount }} Assigned Member(s) Linked
              </span>
            </div>

            <div class="mb-3">
              <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-1.5">
                Select Delivery Channel *
              </label>
              <div class="row g-2">
                <div class="col-4">
                  <div 
                    class="channel-card p-2.5 rounded-3 border text-center cursor-pointer transition-all"
                    :class="directDispatchChannel === 'email' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                    @click="directDispatchChannel = 'email'"
                  >
                    <i class="bi bi-envelope-fill fs-5 d-block mb-1 text-primary"></i>
                    <span class="fw-bold text-xs d-block text-body">Email</span>
                    <small class="text-muted text-2xs">SendGrid</small>
                  </div>
                </div>
                <div class="col-4">
                  <div 
                    class="channel-card p-2.5 rounded-3 border text-center cursor-pointer transition-all"
                    :class="directDispatchChannel === 'sms' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                    @click="directDispatchChannel = 'sms'"
                  >
                    <i class="bi bi-chat-text-fill fs-5 d-block mb-1 text-success"></i>
                    <span class="fw-bold text-xs d-block text-body">SMS</span>
                    <small class="text-muted text-2xs">Beem SMS</small>
                  </div>
                </div>
                <div class="col-4">
                  <div 
                    class="channel-card p-2.5 rounded-3 border text-center cursor-pointer transition-all"
                    :class="directDispatchChannel === 'both' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                    @click="directDispatchChannel = 'both'"
                  >
                    <i class="bi bi-broadcast fs-5 d-block mb-1 text-warning"></i>
                    <span class="fw-bold text-xs d-block text-body">Both</span>
                    <small class="text-muted text-2xs">Email + SMS</small>
                  </div>
                </div>
              </div>
            </div>

            <div class="alert alert-warning border-0 rounded-3 p-2.5 text-xs text-secondary-amms mb-0 d-flex align-items-center gap-2">
              <i class="bi bi-info-circle-fill text-warning fs-6 flex-shrink-0"></i>
              <span>This triggers actual live dispatch to all {{ directDispatchRecipientCount }} member(s) linked to this campaign.</span>
            </div>
          </div>

          <div class="modal-footer border-top px-4 py-3 bg-body-tertiary d-flex align-items-center justify-content-end gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3.5 text-xs" @click="closeDirectDispatchModal" :disabled="isBroadcasting">
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-primary rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-2 shadow-sm"
              :disabled="isBroadcasting || directDispatchRecipientCount === 0"
              @click="executeDirectDispatch"
            >
              <span v-if="isBroadcasting" class="spinner-border spinner-border-sm" role="status"></span>
              <i v-else class="bi bi-send-fill"></i>
              <span>{{ isBroadcasting ? 'Dispatching...' : `Dispatch via ${directDispatchChannel.toUpperCase()}` }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delivery Results Summary Modal -->
    <div v-if="isSummaryModalOpen" class="modal-backdrop fade show" style="z-index: 1070;"></div>
    <div v-if="isSummaryModalOpen" class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index: 1075;" @click.self="isSummaryModalOpen = false">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden text-center p-4">
          <div class="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success rounded-circle p-3 mx-auto mb-3" style="width: 56px; height: 56px;">
            <i class="bi bi-check2-circle fs-2 text-success"></i>
          </div>
          <h5 class="fw-bold text-primary text-sm mb-1">Broadcast Dispatched!</h5>
          <p class="text-secondary-amms text-xs mb-3">
            Delivery initiated across <strong class="text-uppercase text-primary">{{ broadcastSummary?.channel }}</strong>.
          </p>
          <div class="bg-body-tertiary rounded-3 p-2.5 border mb-3 font-monospace text-xs text-start">
            <div class="d-flex justify-content-between mb-1">
              <span class="text-muted">Delivered/Sent:</span>
              <strong class="text-success">{{ broadcastSummary?.sent || 0 }}</strong>
            </div>
            <div class="d-flex justify-content-between" v-if="broadcastSummary?.failed">
              <span class="text-muted">Failed/Skipped:</span>
              <strong class="text-danger">{{ broadcastSummary.failed }}</strong>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-primary rounded-pill px-4 text-xs fw-semibold w-100 shadow-sm" @click="isSummaryModalOpen = false">
            Done
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.filter-pill-select {
  height: 34px;
  line-height: 1.5;
  transition: all 0.2s ease;
}

.filter-pill-select:hover {
  border-color: var(--amms-primary) !important;
}

.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }

.custom-amms-table {
  --bs-table-bg: transparent;
  --bs-table-hover-bg: rgba(27, 42, 74, 0.03);
}

.custom-amms-table thead {
  background-color: var(--amms-primary) !important;
}

.custom-amms-table thead th {
  color: #FFFFFF !important;
  border-bottom: 2px solid var(--amms-accent);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}

.recip-badge {
  width: 32px;
  height: 32px;
  background-color: rgba(67, 118, 108, 0.1);
}

.avatar-sm-circle {
  width: 28px;
  height: 28px;
}

.member-picker-row:hover {
  border-color: var(--amms-primary) !important;
  background-color: rgba(67, 118, 108, 0.05) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.hover-danger:hover {
  color: #dc3545 !important;
}

.channel-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.channel-card:hover {
  border-color: var(--amms-primary, #43766C) !important;
  transform: translateY(-1px);
}

.channel-card.active-channel-card {
  background: linear-gradient(135deg, rgba(67, 118, 108, 0.08) 0%, rgba(67, 118, 108, 0.16) 100%) !important;
  border-color: var(--amms-primary, #43766C) !important;
  box-shadow: 0 2px 8px rgba(67, 118, 108, 0.14);
}

.text-2xs { font-size: 0.7rem; }
.shadow-2xs { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }
</style>


