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

// Left Column Filters
const memberFilterSearch = ref('')
const memberFilterLocation = ref<string>('')
const memberFilterStatus = ref<string>('active')

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
  { tag: '{{phone}}', label: 'Phone' }
]

const loadData = async () => {
  try {
    await Promise.all([
      fetchNotificationMembers((api) => api('/api/notification-members')),
      fetchNotifications((api) => api('/api/notifications')).catch(() => []),
      fetchTemplates((api) => api('/api/notification-templates')).catch(() => []),
      fetchMembers((api) => api('/api/members')).catch(() => []),
      fetchLocations((api) => api('/api/locations')).catch(() => [])
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
    if (memberFilterStatus.value && (m.member_status || 'active') !== memberFilterStatus.value) {
      return false
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

// Selected Members List for Right Column Preview
const selectedMembersObjects = computed(() => {
  if (!members.value) return []
  const idMap = new Map(members.value.map(m => [Number(m.id), m]))
  return selectedMemberIds.value.map(id => idMap.get(id)).filter(Boolean) as MemberOption[]
})

// Auto-fill message content when broadcast or template is changed
watch(notificationId, (newNotifId) => {
  if (!newNotifId || !notifications.value) return
  const found = notifications.value.find(n => Number(n.id) === Number(newNotifId))
  if (found && found.content && !messageContent.value) {
    messageContent.value = found.content
  }
})

watch(selectedTemplateId, (newTmplId) => {
  if (!newTmplId || !templates.value) return
  const found = templates.value.find(t => Number(t.id) === Number(newTmplId))
  if (found && found.content) {
    messageContent.value = found.content
  }
})

const insertPlaceholder = (tag: string) => {
  messageContent.value += ` ${tag}`
}

const openAddModal = () => {
  notificationId.value = notifications.value && notifications.value.length > 0 ? notifications.value[0].id : ''
  selectedTemplateId.value = ''
  messageContent.value = ''
  selectedMemberIds.value = []
  memberFilterSearch.value = ''
  memberFilterLocation.value = ''
  memberFilterStatus.value = 'active'
  modalError.value = ''
  
  if (notifications.value && notifications.value.length > 0) {
    const first = notifications.value[0]
    if (first.content) messageContent.value = first.content
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

const handleSaveBatch = async () => {
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
  try {
    const toAssign = selectedMemberIds.value.filter(id => !assignedMemberIdsForCurrentBroadcast.value.has(id))
    
    if (toAssign.length === 0) {
      push.info('All selected members are already assigned to this broadcast.')
      closeModal()
      return
    }

    let successCount = 0
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

    push.success(`Successfully assigned ${successCount} recipient(s) to the broadcast campaign!`)
    closeModal()
    await loadData()
  } catch (err: any) {
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save recipient assignments'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
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

    <!-- Custom Delete Confirmation Modal -->
    <div v-if="isDeleteModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <div v-if="isDeleteModalOpen" class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index: 1065;" @click.self="cancelDelete">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden text-center p-4">
          <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 mx-auto mb-3" style="width: 56px; height: 56px;">
            <i class="bi bi-trash3-fill fs-3"></i>
          </div>
          <h5 class="fw-bold text-primary text-sm mb-1">Confirm Removal</h5>
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to remove this member recipient assignment?</p>
          <p class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1.5 px-3 rounded-3 d-inline-block mx-auto">
            {{ itemToDelete ? getMemberName(itemToDelete.member_id) : '' }}
          </p>
          <div class="d-flex align-items-center justify-content-center gap-2">
            <button type="button" class="btn btn-sm btn-light border rounded-pill px-3.5 text-xs fw-semibold" @click="cancelDelete">Cancel</button>
            <button type="button" class="btn btn-sm btn-danger rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-sm" :disabled="isDeleting" @click="confirmDelete">
              <span v-if="isDeleting" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ isDeleting ? 'Deleting...' : 'Remove Assignment' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TWO-COLUMN BROADCAST RECIPIENT COMPOSER MODAL -->
    <div v-if="isModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <div v-if="isModalOpen" class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index: 1065;" @click.self="closeModal">
      <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width: 1140px;">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden d-flex flex-column" style="max-height: 90vh;">
          
          <!-- Modal Header -->
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-circle p-2 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
                <i class="bi bi-send-check-fill fs-5"></i>
              </div>
              <div>
                <h5 class="modal-title fw-bold text-primary text-sm mb-0">Assign Broadcast Recipients</h5>
                <small class="text-muted text-xs">Select target members and preview message template dispatch</small>
              </div>
            </div>
            <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
          </div>

          <!-- Two-Column Modal Body -->
          <div class="modal-body p-0 overflow-hidden d-flex flex-column flex-grow-1">
            <div v-if="modalError" class="alert alert-danger py-2 px-4 mb-0 rounded-0 small border-bottom d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ modalError }}</span>
            </div>

            <div class="row g-0 flex-grow-1" style="min-height: 480px; max-height: calc(85vh - 140px);">
              
              <!-- LEFT COLUMN: MEMBER SELECTION DIRECTORY -->
              <div class="col-lg-6 border-end d-flex flex-column bg-body-tertiary bg-opacity-50 p-3 p-md-4 overflow-hidden">
                <div class="d-flex align-items-center justify-content-between mb-2.5">
                  <span class="text-xs fw-bold text-primary text-uppercase font-monospace">
                    <i class="bi bi-people-fill me-1"></i> Member Directory ({{ availableFilteredMembers.length }})
                  </span>
                  <div class="d-flex align-items-center gap-1.5">
                    <button 
                      type="button" 
                      class="btn btn-xs btn-outline-primary rounded-pill px-2.5 py-0.5 text-xs fw-semibold"
                      @click="selectAllFiltered"
                    >
                      Select All
                    </button>
                    <button 
                      type="button" 
                      class="btn btn-xs btn-light border rounded-pill px-2.5 py-0.5 text-xs text-muted"
                      @click="deselectAllFiltered"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <!-- Member Search & Filters -->
                <div class="d-flex flex-column gap-2 mb-3">
                  <div class="input-group input-group-sm rounded-3 border bg-body overflow-hidden">
                    <span class="input-group-text bg-transparent border-0 text-muted ps-2.5">
                      <i class="bi bi-search"></i>
                    </span>
                    <input 
                      type="search" 
                      v-model="memberFilterSearch" 
                      class="form-control border-0 bg-transparent ps-1 text-xs shadow-none" 
                      placeholder="Search member by name or phone..."
                    />
                  </div>

                  <div class="row g-2">
                    <div class="col-6">
                      <select v-model="memberFilterLocation" class="form-select form-select-sm rounded-3 text-xs bg-body shadow-none">
                        <option value="">All Branches / Regions</option>
                        <option v-for="loc in locations" :key="loc.id" :value="String(loc.id)">
                          {{ loc.name }}
                        </option>
                      </select>
                    </div>
                    <div class="col-6">
                      <select v-model="memberFilterStatus" class="form-select form-select-sm rounded-3 text-xs bg-body shadow-none">
                        <option value="">All Member Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                        <option value="deceased">Deceased Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Scrollable Member List Checkbox Tray -->
                <div class="member-list-scroll flex-grow-1 overflow-y-auto rounded-3 border bg-body p-2 d-flex flex-column gap-1.5">
                  <div 
                    v-if="availableFilteredMembers.length === 0" 
                    class="text-center py-5 text-muted text-xs"
                  >
                    <i class="bi bi-search fs-3 d-block mb-1 text-opacity-50"></i>
                    No members match your filter criteria.
                  </div>

                  <div 
                    v-for="m in availableFilteredMembers" 
                    :key="m.id"
                    class="member-picker-row d-flex align-items-center justify-content-between p-2 rounded-3 transition-all cursor-pointer border"
                    :class="{
                      'bg-primary bg-opacity-10 border-primary': selectedMemberIds.includes(Number(m.id)),
                      'border-light bg-body': !selectedMemberIds.includes(Number(m.id)),
                      'opacity-50 pe-none bg-light': isMemberAlreadyAssigned(Number(m.id))
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
                      <div class="avatar-sm-circle rounded-circle bg-primary bg-opacity-15 text-primary fw-bold text-xs d-flex align-items-center justify-content-center flex-shrink-0">
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

                    <div class="flex-shrink-0 ms-2 text-end">
                      <span v-if="isMemberAlreadyAssigned(Number(m.id))" class="badge bg-secondary bg-opacity-15 text-secondary px-2 py-0.5 rounded-pill text-xs">
                        <i class="bi bi-check-circle me-1"></i>Assigned
                      </span>
                      <span v-else-if="selectedMemberIds.includes(Number(m.id))" class="badge bg-primary px-2 py-0.5 rounded-pill text-xs text-white">
                        Selected
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- RIGHT COLUMN: TEMPLATE SELECTION, MESSAGE CONTENT & STAGED RECIPIENTS PREVIEW -->
              <div class="col-lg-6 d-flex flex-column bg-body p-3 p-md-4 overflow-y-auto">
                
                <!-- Target Campaign Selection -->
                <div class="mb-3">
                  <label for="composeNotifId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase font-monospace mb-1">
                    1. Target Broadcast Campaign *
                  </label>
                  <select id="composeNotifId" v-model="notificationId" class="form-select form-select-sm py-2 text-xs rounded-3 shadow-none border" required>
                    <option v-for="n in notifications" :key="n.id" :value="n.id">
                      {{ n.name }}
                    </option>
                  </select>
                </div>

                <!-- Template Selector -->
                <div class="mb-3">
                  <label for="composeTmplId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase font-monospace mb-1">
                    2. Load Message Template (Optional)
                  </label>
                  <select id="composeTmplId" v-model="selectedTemplateId" class="form-select form-select-sm py-2 text-xs rounded-3 shadow-none border">
                    <option value="">Select template to load content...</option>
                    <option v-for="t in templates" :key="t.id" :value="t.id">
                      {{ t.name }}
                    </option>
                  </select>
                </div>

                <!-- Message Content Box & Dynamic Tags -->
                <div class="mb-3">
                  <div class="d-flex align-items-center justify-content-between mb-1">
                    <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase font-monospace mb-0">
                      3. Message Content Preview
                    </label>
                    <small class="text-muted text-xs font-monospace">
                      {{ messageContent.length }} characters • {{ Math.ceil(messageContent.length / 160) || 1 }} SMS part(s)
                    </small>
                  </div>

                  <textarea 
                    v-model="messageContent" 
                    rows="3" 
                    class="form-control text-xs rounded-3 shadow-none bg-body-tertiary border"
                    placeholder="Message text to be delivered to assigned members..."
                  ></textarea>

                  <!-- Dynamic Tags Quick Insert -->
                  <div class="d-flex align-items-center gap-1.5 mt-1.5 flex-wrap">
                    <small class="text-muted text-xs me-1">Insert tag:</small>
                    <button 
                      v-for="ph in availablePlaceholders" 
                      :key="ph.tag"
                      type="button" 
                      class="badge bg-body-tertiary text-primary border rounded-pill px-2 py-0.5 cursor-pointer text-xs"
                      @click="insertPlaceholder(ph.tag)"
                    >
                      + {{ ph.label }}
                    </button>
                  </div>
                </div>

                <!-- Staged Recipients Preview Tray -->
                <div class="flex-grow-1 d-flex flex-column rounded-3 border bg-body-tertiary p-3">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-xs fw-bold text-primary text-uppercase font-monospace">
                      <i class="bi bi-send-check me-1"></i> Queued Recipients ({{ selectedMemberIds.length }})
                    </span>
                    <button 
                      v-if="selectedMemberIds.length > 0"
                      type="button" 
                      class="btn btn-xs btn-link text-danger text-decoration-none text-xs p-0"
                      @click="clearAllSelected"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <!-- Chips / Badges Container -->
                  <div class="selected-recipients-tray flex-grow-1 overflow-y-auto d-flex flex-wrap gap-1.5 align-content-start" style="max-height: 150px;">
                    <div 
                      v-if="selectedMemberIds.length === 0" 
                      class="text-muted text-xs py-3 text-center w-100"
                    >
                      <i class="bi bi-person-plus fs-4 d-block mb-1 text-opacity-50"></i>
                      No recipients selected yet. Check members in the left directory to queue them.
                    </div>

                    <div 
                      v-for="sm in selectedMembersObjects" 
                      :key="sm.id"
                      class="badge bg-body text-body border rounded-pill px-2.5 py-1 text-xs d-flex align-items-center gap-1.5 shadow-2xs"
                    >
                      <span class="fw-semibold text-primary">{{ sm.first_name }} {{ sm.last_name }}</span>
                      <small class="text-muted font-monospace">({{ sm.phone || 'No phone' }})</small>
                      <i 
                        class="bi bi-x-circle-fill text-muted hover-danger cursor-pointer ms-1 text-xs"
                        @click="removeSelectedMember(Number(sm.id))"
                        title="Remove member"
                      ></i>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Modal Action Footer -->
          <div class="modal-footer border-top px-4 py-3 bg-body-tertiary d-flex align-items-center justify-content-between">
            <div class="text-xs text-muted font-monospace">
              Ready to assign <span class="fw-bold text-primary">{{ selectedMemberIds.length }}</span> member(s)
            </div>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3 text-xs" @click="closeModal">Cancel</button>
              <button 
                type="button" 
                class="btn btn-sm btn-primary rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-2 shadow-sm"
                :disabled="isSubmitting || selectedMemberIds.length === 0 || !notificationId"
                @click="handleSaveBatch"
              >
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <i v-else class="bi bi-send-fill"></i>
                <span>{{ isSubmitting ? 'Assigning Recipients...' : `Assign ${selectedMemberIds.length} Recipient(s)` }}</span>
              </button>
            </div>
          </div>

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
  width: 28px;
  height: 28px;
  background-color: rgba(27, 42, 74, 0.08);
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
</style>
