<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

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

const { data: notificationMembersResponse, loading, error, execute: fetchNotificationMembers, fetchWithAuth } = useApi<any>()
const { data: notifications, execute: fetchNotifications } = useApi<NotificationOption[]>()
const { data: templates, execute: fetchTemplates } = useApi<NotificationTemplateOption[]>()
const { data: members, execute: fetchMembers } = useApi<MemberOption[]>()
const { data: locations, execute: fetchLocations } = useApi<LocationOption[]>()
const { data: payments, execute: fetchPayments } = useApi<any[]>()

const searchQuery = ref('')
const selectedNotificationFilter = ref<string>('')

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

const filteredItems = computed(() => {
  let result = [...rawList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(item => {
      const mName = item.member ? `${item.member.first_name} ${item.member.last_name}` : getMemberName(item.member_id)
      const nTitle = item.notification?.name || getNotificationTitle(item.notification_id)
      return mName.toLowerCase().includes(q) || nTitle.toLowerCase().includes(q) || String(item.id).includes(q)
    })
  }

  if (selectedNotificationFilter.value) {
    result = result.filter(item => Number(item.notification_id) === Number(selectedNotificationFilter.value))
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

watch([searchQuery, selectedNotificationFilter, itemsPerPage], () => {
  currentPage.value = 1
})

const currentYear = new Date().getFullYear()

const paidMemberIds = computed(() => {
  const ids = new Set<number>()
  const list = Array.isArray(payments.value) ? payments.value : (payments.value?.data || [])
  list.forEach((p: any) => {
    if ((p.date || p.created_at || '').startsWith(String(currentYear))) {
      ids.add(Number(p.member_id))
    }
  })
  return ids
})

const isMemberOutstanding = (m: MemberOption) => {
  return (m.member_status || 'active') === 'active' && m.fee_exemption !== 'yes' && !paidMemberIds.value.has(Number(m.id))
}

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

// Auto-fill message content when broadcast or template is changed
watch(notificationId, (newNotifId) => {
  if (!newNotifId || !notifications.value) return
  const found = notifications.value.find(n => Number(n.id) === Number(newNotifId))
  if (found && found.content && !messageContent.value) {
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
      const res: any = await fetchWithAuth(`/api/notifications/${notificationId.value}/broadcast`, {
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
      push.success(`Broadcast successfully dispatched via ${broadcastChannel.value.toUpperCase()}! ${sentCount} delivered.`)
    } else {
      push.success(`Successfully assigned ${successCount} recipient(s) to the broadcast campaign!`)
    }

    closeModal()
    await loadData()
  } catch (err: any) {
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to complete broadcast operation'
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
    const res: any = await fetchWithAuth(`/api/notifications/${directDispatchNotifId.value}/broadcast`, {
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
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Failed to dispatch broadcast'
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
  
  isDeleting.value = true
  try {
    await fetchWithAuth(`/api/notification-members/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success('Recipient member assignment removed successfully!')
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to remove recipient assignment'
    push.error(msg)
  } finally {
    isDeleting.value = false
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
      title="Broadcast Recipients"
      subtitle="Dispatch and manage targeted member communication rosters"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search member name or campaign..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="Assign Broadcast Recipients"
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
              style="min-width: 220px;"
            >
              <option value="">All Broadcasts ({{ rawList.length }})</option>
              <option v-for="n in notifications" :key="n.id" :value="String(n.id)">
                {{ n.name }}
              </option>
            </select>
          </div>

          <!-- Dispatch Selected Campaign Button -->
          <button 
            v-if="selectedNotificationFilter"
            type="button" 
            class="btn btn-sm btn-primary rounded-pill px-3 py-1 text-xs fw-semibold shadow-2xs d-flex align-items-center gap-1.5 ms-2"
            @click="openDirectDispatchModal(selectedNotificationFilter)"
          >
            <i class="bi bi-broadcast"></i> Dispatch Campaign
          </button>

          <!-- Clear Filters -->
          <button 
            v-if="selectedNotificationFilter || searchQuery"
            class="btn btn-sm btn-link text-decoration-none text-xs text-danger p-0 ms-2"
            @click="selectedNotificationFilter = ''; searchQuery = ''"
          >
            <i class="bi bi-x-circle me-1"></i>Reset
          </button>
        </div>

        <!-- Total Counter Badge -->
        <div class="text-xs text-muted font-monospace d-none d-sm-block">
          Showing <span class="fw-bold text-primary">{{ filteredItems.length }}</span> assignments
        </div>
      </div>

      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading recipients...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading recipient assignments...</span>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="alert alert-danger rounded-0 mb-0 py-3 px-4 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <span>{{ error }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-pill" @click="loadData">Retry</button>
      </div>

      <div class="table-responsive">
        <table class="table align-middle mb-0 custom-amms-table">
          <thead>
            <tr>
              <th class="ps-4" style="width: 80px;"># ID</th>
              <th>Recipient Member</th>
              <th>Phone Number</th>
              <th>Broadcast Campaign</th>
              <th>Assigned Date</th>
              <th class="text-end pe-4" style="width: 120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && rawList.length === 0">
              <tr v-for="i in 5" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="6" class="text-center py-5 text-muted">
                <i class="bi bi-person-lines-fill fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No broadcast recipients assigned yet</p>
                <small>Click "Assign Broadcast Recipients" above to select and queue members.</small>
              </td>
            </tr>

            <!-- Recipient Assignment Rows -->
            <tr v-for="item in paginatedItems" :key="item.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ item.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="recip-badge rounded-circle d-flex align-items-center justify-content-center text-primary font-monospace fw-bold text-xs">
                    {{ item.member ? `${item.member.first_name[0]}${item.member.last_name[0]}` : 'MB' }}
                  </div>
                  <div>
                    <span>{{ item.member ? `${item.member.first_name} ${item.member.last_name}` : getMemberName(item.member_id) }}</span>
                    <small v-if="item.member?.gender" class="d-block text-muted text-xs text-capitalize">
                      <i :class="item.member.gender === 'female' ? 'bi bi-gender-female text-danger' : 'bi bi-gender-male text-primary'" class="me-1"></i>{{ item.member.gender }}
                    </small>
                  </div>
                </div>
              </td>
              <td class="font-monospace text-xs text-body">
                <i class="bi bi-telephone text-muted me-1"></i>
                {{ item.member?.phone || getMemberPhone(item.member_id) }}
              </td>
              <td>
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs fw-semibold">
                  <i class="bi bi-send-fill me-1"></i>
                  {{ item.notification?.name || getNotificationTitle(item.notification_id) }}
                </span>
              </td>
              <td class="font-monospace text-xs text-secondary-amms">
                {{ formatDateDisplay(item.created_at) }}
              </td>
              <td class="pe-4 text-end">
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
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
      :itemTitle="itemToDelete ? &quot; &quot; : ''"
      :loading="isDeleting"
      confirmText="Remove Recipient"
      @confirm="confirmDelete"
    />

    <!-- BROADCAST DISPATCH STUDIO MODAL (SIDE-BY-SIDE) -->
    <div v-if="isModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <div v-if="isModalOpen" class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index: 1065;" @click.self="closeModal">
      <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width: 1200px;">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden d-flex flex-column" style="max-height: 92vh;">
          
          <!-- Modal Header Banner -->
          <div class="modal-header border-0 px-4 py-3 bg-primary text-white d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-3">
              <div class="rounded-circle p-2 bg-white bg-opacity-15 text-white d-flex align-items-center justify-content-center flex-shrink-0" style="width: 40px; height: 40px;">
                <i class="bi bi-broadcast fs-5 text-white"></i>
              </div>
              <div>
                <h5 class="modal-title fw-bold text-white text-base mb-0">Broadcast Dispatch Studio</h5>
                <small class="text-white-50 text-xs">Configure message content & select target member recipients</small>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-white text-primary fw-semibold px-3 py-1.5 rounded-pill text-xs shadow-xs">
                <i class="bi bi-check2-circle me-1"></i>{{ selectedMemberIds.length }} Selected
              </span>
              <button type="button" class="btn-close btn-close-white" @click="closeModal" aria-label="Close"></button>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="modalError" class="alert alert-danger py-2 px-4 mb-0 rounded-0 text-xs d-flex align-items-center gap-2 border-bottom">
            <i class="bi bi-exclamation-triangle-fill text-danger fs-6"></i>
            <span>{{ modalError }}</span>
          </div>

          <!-- Studio Body: Two Balanced Columns -->
          <div class="modal-body p-0 overflow-hidden d-flex flex-column flex-grow-1">
            <div class="row g-0 flex-grow-1" style="min-height: 520px; max-height: calc(90vh - 145px);">
              
              <!-- LEFT COLUMN (42%): TARGET RECIPIENTS DIRECTORY -->
              <div class="col-lg-5 border-end d-flex flex-column bg-body-tertiary bg-opacity-40 p-3 p-md-4 overflow-hidden">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge rounded-circle bg-primary text-white p-0 d-flex align-items-center justify-content-center" style="width: 22px; height: 22px; font-size: 0.75rem;">1</span>
                    <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-0">
                      Target Audience ({{ availableFilteredMembers.length }})
                    </h6>
                  </div>
                  <div class="d-flex align-items-center gap-1.5">
                    <button
                      type="button"
                      class="btn btn-xs btn-outline-primary rounded-pill px-2.5 py-1 text-xs fw-semibold"
                      @click="selectAllFiltered"
                    >
                      <i class="bi bi-check-all me-1"></i>Select All
                    </button>
                    <button
                      type="button"
                      class="btn btn-xs btn-outline-secondary rounded-pill px-2.5 py-1 text-xs"
                      @click="clearAllSelected"
                      :disabled="selectedMemberIds.length === 0"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <!-- Full-Width Executive Search Bar -->
                <div class="position-relative mb-2.5">
                  <span class="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted pointer-events-none d-flex align-items-center">
                    <i class="bi bi-search text-primary opacity-75"></i>
                  </span>
                  <input
                    type="text"
                    v-model="memberFilterSearch"
                    class="form-control form-control-sm ps-5 pe-5 py-2 text-xs rounded-pill border bg-body shadow-2xs transition-all"
                    placeholder="Search member name or phone..."
                  />
                  <button
                    v-if="memberFilterSearch"
                    type="button"
                    class="btn btn-link p-0 position-absolute top-50 end-0 translate-middle-y me-3 text-muted text-decoration-none border-0 d-flex align-items-center"
                    @click="memberFilterSearch = ''"
                    title="Clear search"
                  >
                    <i class="bi bi-x-circle-fill text-muted"></i>
                  </button>
                </div>

                <!-- Single Unified Filter Line: Branch Dropdown + Icon-Only Status Buttons -->
                <div class="d-flex align-items-center justify-content-between gap-2 mb-3">
                  <!-- Branch Dropdown -->
                  <div class="input-group input-group-sm flex-grow-1" style="max-width: 210px;">
                    <span class="input-group-text bg-body border-end-0 text-muted ps-2.5 py-1 rounded-start-pill text-xs">
                      <i class="bi bi-geo-alt-fill text-primary opacity-75"></i>
                    </span>
                    <select
                      v-model="memberFilterLocation"
                      class="form-select form-select-sm border-start-0 ps-1 py-1 text-xs rounded-end-pill bg-body shadow-2xs"
                      aria-label="Filter by branch"
                    >
                      <option value="">All Branches</option>
                      <option v-for="loc in locations" :key="loc.id" :value="String(loc.id)">
                        {{ loc.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Icon-Only Status Filter Buttons Group -->
                  <div class="d-flex align-items-center gap-1 bg-body p-1 border rounded-pill shadow-2xs flex-shrink-0">
                    <!-- All Members -->
                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'all' ? 'btn-primary text-white shadow-xs' : 'btn-light text-muted border-0'"
                      @click="audienceFilter = 'all'"
                      title="All Members"
                      aria-label="All Members"
                    >
                      <i class="bi bi-people-fill text-xs"></i>
                    </button>

                    <!-- Active -->
                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'active' ? 'btn-primary text-white shadow-xs' : 'btn-light text-success border-0'"
                      @click="audienceFilter = 'active'"
                      title="Active Members"
                      aria-label="Active Members"
                    >
                      <i class="bi bi-check-circle-fill text-xs"></i>
                    </button>

                    <!-- Inactive -->
                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'inactive' ? 'btn-primary text-white shadow-xs' : 'btn-light text-muted border-0'"
                      @click="audienceFilter = 'inactive'"
                      title="Inactive Members"
                      aria-label="Inactive Members"
                    >
                      <i class="bi bi-pause-circle-fill text-xs"></i>
                    </button>

                    <!-- Deceased -->
                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'deceased' ? 'btn-primary text-white shadow-xs' : 'btn-light text-danger border-0'"
                      @click="audienceFilter = 'deceased'"
                      title="Deceased Members"
                      aria-label="Deceased Members"
                    >
                      <i class="bi bi-slash-circle-fill text-xs"></i>
                    </button>

                    <!-- Outstanding Fees -->
                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'outstanding' ? 'btn-warning text-dark shadow-xs' : 'btn-light text-warning border-0'"
                      @click="audienceFilter = 'outstanding'"
                      title="Members with Unpaid Fees"
                      aria-label="Members with Unpaid Fees"
                    >
                      <i class="bi bi-clock-history text-xs"></i>
                    </button>

                    <!-- Reset Filters Button -->
                    <button
                      v-if="audienceFilter !== 'all' || memberFilterLocation || memberFilterSearch"
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center text-danger border-0 ms-0.5"
                      style="width: 28px; height: 28px;"
                      @click="audienceFilter = 'all'; memberFilterLocation = ''; memberFilterSearch = ''"
                      title="Reset all filters"
                      aria-label="Reset all filters"
                    >
                      <i class="bi bi-arrow-counterclockwise text-xs"></i>
                    </button>
                  </div>
                </div>

                <!-- Member Directory Header -->
                <div class="d-flex align-items-center justify-content-between px-1 mb-2 text-2xs text-muted">
                  <span class="fw-semibold text-uppercase tracking-wider">
                    Directory ({{ availableFilteredMembers.length }})
                  </span>
                  <span class="badge bg-light text-secondary border text-2xs text-capitalize">
                    {{ audienceFilter }}
                  </span>
                </div>

                <!-- Member Cards Scrollable Directory -->
                <div class="member-list-scroll flex-grow-1 overflow-y-auto rounded-3 border bg-body p-2 d-flex flex-column gap-2">
                  <div
                    v-if="availableFilteredMembers.length === 0"
                    class="text-center py-5 text-muted text-xs"
                  >
                    <i class="bi bi-people fs-2 d-block mb-1 text-opacity-40"></i>
                    No members match the current filter criteria.
                  </div>

                  <div
                    v-for="m in availableFilteredMembers"
                    :key="m.id"
                    class="member-picker-row d-flex align-items-center justify-content-between p-2 rounded-3 transition-all cursor-pointer border"
                    :class="{
                      'bg-primary bg-opacity-10 border-primary': selectedMemberIds.includes(Number(m.id)),
                      'border-light bg-body': !selectedMemberIds.includes(Number(m.id)),
                      'opacity-50 pe-none bg-body-tertiary': isMemberAlreadyAssigned(Number(m.id))
                    }"
                    @click="!isMemberAlreadyAssigned(Number(m.id)) && toggleMemberSelection(Number(m.id))"
                  >
                    <div class="d-flex align-items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        class="form-check-input mt-0 flex-shrink-0 cursor-pointer"
                        :checked="selectedMemberIds.includes(Number(m.id)) || isMemberAlreadyAssigned(Number(m.id))"
                        :disabled="isMemberAlreadyAssigned(Number(m.id))"
                        @click.stop="!isMemberAlreadyAssigned(Number(m.id)) && toggleMemberSelection(Number(m.id))"
                      />
                      <div class="rounded-circle bg-primary text-white fw-bold text-xs d-flex align-items-center justify-content-center flex-shrink-0" style="width: 32px; height: 32px;">
                        {{ m.first_name[0] }}{{ m.last_name[0] }}
                      </div>
                      <div class="text-truncate">
                        <span class="d-block fw-semibold text-primary text-xs text-truncate">
                          {{ m.first_name }} {{ m.last_name }}
                        </span>
                        <small class="text-muted font-monospace text-xs d-block text-truncate">
                          <i class="bi bi-telephone me-1"></i>{{ m.phone || 'No phone' }} • {{ getLocationName(m.location_id) }}
                        </small>
                      </div>
                    </div>

                    <div class="flex-shrink-0 ms-2 text-end d-flex flex-column align-items-end gap-1">
                      <span v-if="isMemberAlreadyAssigned(Number(m.id))" class="badge bg-secondary-subtle text-secondary px-2 py-0.5 rounded-pill text-2xs border">
                        <i class="bi bi-check-circle me-0.5"></i>Assigned
                      </span>
                      <span v-else-if="selectedMemberIds.includes(Number(m.id))" class="badge bg-primary text-white px-2 py-0.5 rounded-pill text-2xs">
                        Selected
                      </span>
                      <span v-if="isMemberOutstanding(m)" class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-1.5 py-0.5 rounded-pill text-2xs">
                        <i class="bi bi-clock-history me-0.5"></i>Unpaid
                      </span>
                      <span v-else-if="m.member_status === 'deceased'" class="badge bg-danger-subtle text-danger border border-danger-subtle px-1.5 py-0.5 rounded-pill text-2xs">
                        Deceased
                      </span>
                      <span v-else-if="m.member_status === 'inactive'" class="badge bg-secondary-subtle text-secondary border px-1.5 py-0.5 rounded-pill text-2xs">
                        Inactive
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Queued Selection Info Bar -->
                <div class="pt-2 px-1 d-flex align-items-center justify-content-between text-xs text-muted">
                  <span>
                    Queued: <strong class="text-primary">{{ selectedMemberIds.length }}</strong> member(s)
                  </span>
                  <span v-if="selectedMemberIds.length > 0" class="text-2xs text-muted font-monospace">
                    Est. {{ selectedMemberIds.length * smsSegmentCount }} SMS dispatches
                  </span>
                </div>

              </div>

              <!-- RIGHT COLUMN (58%): MESSAGE COMPOSER & LIVE PREVIEW -->
              <div class="col-lg-7 d-flex flex-column bg-body p-3 p-md-4 overflow-y-auto">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge rounded-circle bg-primary text-white p-0 d-flex align-items-center justify-content-center" style="width: 22px; height: 22px; font-size: 0.75rem;">2</span>
                    <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-0">
                      Message Composer
                    </h6>
                  </div>
                  <span class="badge bg-body-secondary text-secondary border text-2xs px-2 py-0.5 rounded-pill font-monospace">
                    {{ smsCharCount }} chars • {{ smsSegmentCount }} SMS
                  </span>
                </div>

                <!-- Campaign & Template Selector Row -->
                <div class="row g-2 mb-3">
                  <div class="col-md-6">
                    <label for="composeNotifId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-1">
                      Target Campaign *
                    </label>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text bg-transparent border-end-0 text-muted">
                        <i class="bi bi-megaphone"></i>
                      </span>
                      <select
                        id="composeNotifId"
                        v-model="notificationId"
                        class="form-select border-start-0 ps-1 py-2 text-xs"
                        required
                      >
                        <option v-for="n in notifications" :key="n.id" :value="n.id">
                          {{ n.name }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="d-flex align-items-center justify-content-between mb-1">
                      <label for="composeTmplId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-0">
                        Load Template
                      </label>
                      <small class="text-muted text-2xs">Auto-populates</small>
                    </div>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text bg-transparent border-end-0 text-muted">
                        <i class="bi bi-file-earmark-text"></i>
                      </span>
                      <select
                        id="composeTmplId"
                        v-model="selectedTemplateId"
                        class="form-select border-start-0 ps-1 py-2 text-xs"
                      >
                        <option value="">Choose a template...</option>
                        <option v-for="t in templates" :key="t.id" :value="t.id">
                          {{ t.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Message Content & Placeholder Chips -->
                <div class="mb-3">
                  <label for="composeMsg" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-1">
                    Message Content *
                  </label>
                  
                  <!-- Tag Chips -->
                  <div class="d-flex flex-wrap gap-1 mb-2">
                    <button
                      v-for="ph in availablePlaceholders"
                      :key="ph.tag"
                      type="button"
                      class="btn btn-xs btn-outline-primary rounded-pill px-2.5 py-0.5 text-2xs fw-semibold d-flex align-items-center gap-1 shadow-2xs"
                      @click="insertPlaceholder(ph.tag)"
                      :title="ph.tag"
                    >
                      <i class="bi bi-plus-circle"></i>
                      <span>{{ ph.tag }}</span>
                    </button>
                  </div>

                  <textarea
                    id="composeMsg"
                    v-model="messageContent"
                    rows="4"
                    class="form-control text-xs font-monospace py-2"
                    placeholder="Type broadcast announcement message..."
                    required
                  ></textarea>
                </div>

                <!-- Step 3: Broadcast Delivery Channel -->
                <div class="mb-3">
                  <div class="d-flex align-items-center justify-content-between mb-1.5">
                    <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-0">
                      Step 3: Dispatch Channel *
                    </label>
                    <span class="badge bg-body-secondary text-secondary text-2xs font-monospace">Target Transport</span>
                  </div>
                  <div class="row g-2">
                    <div class="col-4">
                      <div 
                        class="channel-card p-2 rounded-3 border text-center cursor-pointer transition-all"
                        :class="broadcastChannel === 'email' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                        @click="broadcastChannel = 'email'"
                      >
                        <i class="bi bi-envelope-fill fs-5 d-block mb-0.5 text-primary"></i>
                        <span class="fw-bold text-xs d-block text-body">Email</span>
                        <small class="text-muted text-2xs">SendGrid SMTP</small>
                      </div>
                    </div>
                    <div class="col-4">
                      <div 
                        class="channel-card p-2 rounded-3 border text-center cursor-pointer transition-all"
                        :class="broadcastChannel === 'sms' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                        @click="broadcastChannel = 'sms'"
                      >
                        <i class="bi bi-chat-text-fill fs-5 d-block mb-0.5 text-success"></i>
                        <span class="fw-bold text-xs d-block text-body">SMS</span>
                        <small class="text-muted text-2xs">Beem Gateway</small>
                      </div>
                    </div>
                    <div class="col-4">
                      <div 
                        class="channel-card p-2 rounded-3 border text-center cursor-pointer transition-all"
                        :class="broadcastChannel === 'both' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                        @click="broadcastChannel = 'both'"
                      >
                        <i class="bi bi-broadcast fs-5 d-block mb-0.5 text-warning"></i>
                        <span class="fw-bold text-xs d-block text-body">Both</span>
                        <small class="text-muted text-2xs">Email + SMS</small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Live SMS Phone Bubble Preview -->
                <div class="mt-auto pt-3 border-top">
                  <div class="d-flex align-items-center gap-1.5 mb-2 text-xs text-muted fw-semibold">
                    <i class="bi bi-phone text-primary"></i>
                    <span>Live Recipient Preview</span>
                  </div>
                  <div class="p-3 rounded-3 bg-body-tertiary border position-relative">
                    <div class="d-flex align-items-center gap-2 mb-1.5">
                      <span class="badge bg-success-subtle text-success border border-success-subtle text-2xs rounded-pill">
                        SMS Bubble
                      </span>
                      <small class="text-muted text-2xs">Sample: Halima Said</small>
                    </div>
                    <div class="p-2.5 rounded-3 bg-white border shadow-2xs text-xs text-body font-monospace" style="white-space: pre-wrap; word-break: break-word; line-height: 1.45;">
                      {{ previewSampleMessage }}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Modal Action Footer -->
          <div class="modal-footer border-top px-4 py-3 bg-body-tertiary d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div class="text-xs text-muted">
              Campaign: <strong class="text-primary">{{ getNotificationTitle(notificationId) }}</strong> • Channel: <strong class="text-uppercase text-primary">{{ broadcastChannel }}</strong> • Queue: <strong class="text-primary">{{ selectedMemberIds.length }}</strong> recipient(s)
            </div>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3.5 text-xs" @click="closeModal" :disabled="isSubmitting || isBroadcasting">
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary rounded-pill px-3.5 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-2xs"
                :disabled="isSubmitting || isBroadcasting || selectedMemberIds.length === 0 || !notificationId"
                @click="handleSaveBatch(false)"
              >
                <span v-if="isSubmitting && !isBroadcasting" class="spinner-border spinner-border-sm" role="status"></span>
                <i v-else class="bi bi-link-45deg"></i>
                <span>Assign Recipients Only</span>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-primary rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-2 shadow-sm"
                :disabled="isSubmitting || isBroadcasting || selectedMemberIds.length === 0 || !notificationId"
                @click="handleSaveBatch(true)"
              >
                <span v-if="isBroadcasting" class="spinner-border spinner-border-sm" role="status"></span>
                <i v-else class="bi bi-send-fill"></i>
                <span>{{ isBroadcasting ? 'Broadcasting Now...' : `Assign & Broadcast via ${broadcastChannel.toUpperCase()}` }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

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

