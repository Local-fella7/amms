<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface NotificationMemberItem {
  id: number
  notification_id: number | string
  member_id: number | string
  notification?: {
    id: number
    name: string
  }
  member?: {
    id: number
    first_name: string
    last_name: string
    phone?: string
  }
  created_at?: string
  updated_at?: string
}

interface NotificationOption {
  id: number
  name: string
}

interface MemberOption {
  id: number
  first_name: string
  last_name: string
  phone?: string
}

const { data: notificationMembersResponse, loading, error, execute: fetchNotificationMembers, fetchWithAuth } = useApi<any>()
const { data: notifications, execute: fetchNotifications } = useApi<NotificationOption[]>()
const { data: members, execute: fetchMembers } = useApi<MemberOption[]>()

const searchQuery = ref('')
const selectedNotificationFilter = ref<string>('')

const isSubmitting = ref(false)
const modalError = ref('')
const editingItem = ref<NotificationMemberItem | null>(null)
const isModalOpen = ref(false)

const notificationId = ref<number | string>('')
const memberId = ref<number | string>('')

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

const schema = z.object({
  notification_id: z.union([z.number(), z.string().min(1, 'Broadcast selection is required')]),
  member_id: z.union([z.number(), z.string().min(1, 'Member selection is required')])
})

const loadData = async () => {
  try {
    await Promise.all([
      fetchNotificationMembers((api) => api('/api/notification-members')),
      fetchNotifications((api) => api('/api/notifications')).catch(() => []),
      fetchMembers((api) => api('/api/members')).catch(() => [])
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

const openAddModal = () => {
  editingItem.value = null
  notificationId.value = notifications.value && notifications.value.length > 0 ? notifications.value[0].id : ''
  memberId.value = members.value && members.value.length > 0 ? members.value[0].id : ''
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (item: NotificationMemberItem) => {
  editingItem.value = item
  notificationId.value = item.notification_id
  memberId.value = item.member_id
  modalError.value = ''
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

const handleSave = async () => {
  modalError.value = ''
  const payload = {
    notification_id: Number(notificationId.value),
    member_id: Number(memberId.value)
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingItem.value) {
      await fetchWithAuth(`/api/notification-members/${editingItem.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success('Notification recipient assignment updated successfully!')
    } else {
      await fetchWithAuth('/api/notification-members', {
        method: 'POST',
        body: payload
      })
      push.success('Notification recipient assigned successfully!')
    }
    
    closeModal()
    await loadData()
  } catch (err: any) {
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save recipient assignment'
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
    push.success('Recipient assignment deleted successfully!')
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete recipient assignment'
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
      title="Notification Members"
      subtitle="Manage recipient member assignments for broadcast notifications"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search member or broadcast title..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="Assign Recipient"
      @add="openAddModal"
    />

    <!-- Integrated Table Container with Top Toolbar -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Top Table Toolbar with Integrated Filters -->
      <div class="card-header bg-body-tertiary border-bottom px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="text-xs fw-bold text-uppercase text-secondary-amms tracking-wider me-1">
            <i class="bi bi-funnel-fill text-primary me-1"></i> Quick Filters:
          </span>

          <!-- Broadcast Filter Pill -->
          <div style="min-width: 220px;">
            <select 
              v-model="selectedNotificationFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedNotificationFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Broadcasts</option>
              <option v-for="n in notifications" :key="n.id" :value="n.id">{{ n.name }}</option>
            </select>
          </div>

          <!-- Clear Filters Link -->
          <button 
            v-if="selectedNotificationFilter || searchQuery"
            type="button" 
            class="btn btn-xs btn-link text-danger text-xs text-decoration-none px-2 fw-semibold ms-1"
            @click="selectedNotificationFilter = ''; searchQuery = ''"
          >
            <i class="bi bi-x-lg me-1"></i> Clear Filters
          </button>
        </div>

        <!-- Total Filtered Counter Badge -->
        <div class="text-xs text-muted font-monospace">
          Showing <span class="fw-bold text-primary">{{ filteredItems.length }}</span> assignments
        </div>
      </div>

      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading notification recipients...</span>
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
              <th>Assigned Broadcast</th>
              <th>Assigned Date</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && rawList.length === 0">
              <tr v-for="i in 5" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="6" class="text-center py-5 text-muted">
                <i class="bi bi-person-lines-fill fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No notification recipient assignments found</p>
                <small>Click "Assign Recipient" above to link a member to a broadcast.</small>
              </td>
            </tr>

            <!-- Rows -->
            <tr v-for="item in paginatedItems" :key="item.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ item.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="recip-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-person text-primary text-xs"></i>
                  </div>
                  <span>{{ item.member ? `${item.member.first_name} ${item.member.last_name}` : getMemberName(item.member_id) }}</span>
                </div>
              </td>
              <td class="font-monospace text-xs text-body">
                <i class="bi bi-telephone text-muted me-1"></i>
                {{ item.member?.phone || getMemberPhone(item.member_id) }}
              </td>
              <td>
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs">
                  <i class="bi bi-broadcast me-1"></i>
                  {{ item.notification?.name || getNotificationTitle(item.notification_id) }}
                </span>
              </td>
              <td class="font-monospace text-xs text-body">
                {{ formatDateDisplay(item.created_at) }}
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn" @click="openViewModal(item)" title="View Details">
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn" @click="openEditModal(item)" title="Edit Assignment">
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" @click="promptDelete(item)" title="Delete Assignment">
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
          <h5 class="fw-bold text-primary text-sm mb-1">Confirm Deletion</h5>
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to remove this member recipient assignment?</p>
          <p class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1.5 px-3 rounded-3 d-inline-block mx-auto">
            {{ itemToDelete ? getMemberName(itemToDelete.member_id) : '' }}
          </p>
          <div class="d-flex align-items-center justify-content-center gap-2">
            <button type="button" class="btn btn-sm btn-light border rounded-pill px-3.5 text-xs fw-semibold" @click="cancelDelete">Cancel</button>
            <button type="button" class="btn btn-sm btn-danger rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-sm" :disabled="isDeleting" @click="confirmDelete">
              <span v-if="isDeleting" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Assignment' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="isModalOpen" class="modal-backdrop fade show"></div>
    
    <div v-if="isModalOpen" class="modal fade show d-block" tabindex="-1" role="dialog" @click.self="closeModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-person-check me-1.5 amms-accent"></i>
              <span>{{ editingItem ? 'Edit Recipient Assignment' : 'Assign Recipient Member' }}</span>
            </h5>
            <button type="button" class="btn-close position-absolute end-0 me-3" @click="closeModal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="handleSave">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>
              <div class="mb-3">
                <label for="notifId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Select Broadcast *</label>
                <select id="notifId" v-model="notificationId" class="form-select py-2.5 text-sm" required>
                  <option v-for="n in notifications" :key="n.id" :value="n.id">
                    {{ n.name }}
                  </option>
                </select>
              </div>
              <div class="mb-2">
                <label for="memId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Select Recipient Member *</label>
                <select id="memId" v-model="memberId" class="form-select py-2.5 text-sm" required>
                  <option v-for="m in members" :key="m.id" :value="m.id">
                    {{ m.first_name }} {{ m.last_name }} ({{ m.phone || 'No phone' }})
                  </option>
                </select>
              </div>
            </div>
            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Saving...' : (editingItem ? 'Update Assignment' : 'Save Assignment') }}</span>
              </button>
            </div>
          </form>
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

.action-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.hover-danger:hover {
  background-color: rgba(220, 53, 69, 0.12) !important;
}
</style>
