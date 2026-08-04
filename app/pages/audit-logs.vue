<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface AuditLogItem {
  id: number
  feature_id: number | string
  user_id: number | string
  datetime: string
  before?: string | object
  after?: string | object
  user?: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  feature?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string
}

interface UserOption {
  id: number
  first_name: string
  last_name: string
}

interface FeatureOption {
  id: number
  name: string
}

const { data: logsResponse, loading, error, execute: fetchLogs, fetchWithAuth } = useApi<any>()
const { data: users, execute: fetchUsers } = useApi<UserOption[]>()
const { data: features, execute: fetchFeatures } = useApi<FeatureOption[]>()

const searchQuery = ref('')
const selectedUserFilter = ref<string>('')

// View Modal State
const viewingLog = ref<AuditLogItem | null>(null)
const isViewModalOpen = ref(false)

// Delete Modal State
const itemToDelete = ref<AuditLogItem | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const loadData = async () => {
  try {
    await Promise.all([
      fetchLogs((api) => api('/api/logs')),
      fetchUsers((api) => api('/api/users')).catch(() => []),
      fetchFeatures((api) => api('/api/features')).catch(() => [])
    ])
  } catch (err) {
    // Handled by composable
  }
}

const rawLogsList = computed<AuditLogItem[]>(() => {
  if (!logsResponse.value) return []
  const res = logsResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const getUserName = (uId?: number | string) => {
  if (!uId) return 'System / General'
  if (!users.value) return `User #${uId}`
  const found = users.value.find(u => Number(u.id) === Number(uId))
  return found ? `${found.first_name} ${found.last_name}` : `User #${uId}`
}

const getFeatureName = (fId?: number | string) => {
  if (!fId) return 'General Operation'
  if (!features.value) return `Feature #${fId}`
  const found = features.value.find(f => Number(f.id) === Number(fId))
  return found ? found.name : `Feature #${fId}`
}

const filteredLogs = computed(() => {
  let result = [...rawLogsList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(l => {
      const uName = l.user ? `${l.user.first_name} ${l.user.last_name}` : getUserName(l.user_id)
      const fName = l.feature?.name || getFeatureName(l.feature_id)
      return uName.toLowerCase().includes(q) || fName.toLowerCase().includes(q) || String(l.id).includes(q)
    })
  }

  if (selectedUserFilter.value) {
    result = result.filter(l => Number(l.user_id) === Number(selectedUserFilter.value))
  }

  // Descending sort by ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredLogs.value.length / itemsPerPage.value) || 1)

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredLogs.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, selectedUserFilter, itemsPerPage], () => {
  currentPage.value = 1
})

const openViewModal = (l: AuditLogItem) => {
  viewingLog.value = l
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingLog.value = null
  isViewModalOpen.value = false
}

const formatDateDisplay = (val?: string) => {
  if (!val) return '—'
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-')
    const timePart = str.length > 10 ? str.substring(10) : ''
    return `${parts[2]}-${parts[1]}-${parts[0]}${timePart}`
  }
  return str
}

const formatJsonPretty = (data?: string | object) => {
  if (!data) return 'None'
  if (typeof data === 'object') return JSON.stringify(data, null, 2)
  try {
    const parsed = JSON.parse(data)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(data)
  }
}

const promptDelete = (l: AuditLogItem) => {
  itemToDelete.value = l
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
    await fetchWithAuth(`/api/logs/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success('Audit log record deleted successfully!')
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete audit log'
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
      title="Audit Trail"
      subtitle="Track and inspect system action history and security audit logs"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search audit log user or feature..."
      :loading="loading"
      hideRefresh
      :showAddButton="false"
    />

    <!-- Integrated Table Container with Top Toolbar -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Top Table Toolbar with Integrated Filters -->
      <div class="card-header bg-body-tertiary border-bottom px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="text-xs fw-bold text-uppercase text-secondary-amms tracking-wider me-1">
            <i class="bi bi-funnel-fill text-primary me-1"></i> Quick Filters:
          </span>

          <!-- User Filter Pill -->
          <div style="min-width: 170px;">
            <select 
              v-model="selectedUserFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedUserFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Users</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.first_name }} {{ u.last_name }}</option>
            </select>
          </div>

          <!-- Clear Filters Link -->
          <button 
            v-if="selectedUserFilter || searchQuery"
            type="button" 
            class="btn btn-xs btn-link text-danger text-xs text-decoration-none px-2 fw-semibold ms-1"
            @click="selectedUserFilter = ''; searchQuery = ''"
          >
            <i class="bi bi-x-lg me-1"></i> Clear Filters
          </button>
        </div>

        <!-- Total Filtered Counter Badge -->
        <div class="text-xs text-muted font-monospace">
          Showing <span class="fw-bold text-primary">{{ filteredLogs.length }}</span> audit logs
        </div>
      </div>

      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading audit logs...</span>
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
              <th>Executing User</th>
              <th>System Feature / Action</th>
              <th>Timestamp</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && rawLogsList.length === 0">
              <tr v-for="i in 5" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredLogs.length === 0">
              <td colspan="5" class="text-center py-5 text-muted">
                <i class="bi bi-journal-x fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No audit log records found</p>
                <small>System action events will be logged here automatically.</small>
              </td>
            </tr>

            <!-- Log Rows -->
            <tr v-for="l in paginatedLogs" :key="l.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ l.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="user-avatar-badge rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold text-xs">
                    {{ l.user?.first_name ? l.user.first_name[0] : 'A' }}
                  </div>
                  <span>{{ l.user ? `${l.user.first_name} ${l.user.last_name}` : getUserName(l.user_id) }}</span>
                </div>
              </td>
              <td>
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs">
                  <i class="bi bi-shield-check me-1"></i>
                  {{ l.feature?.name || getFeatureName(l.feature_id) }}
                </span>
              </td>
              <td class="font-monospace text-xs text-body">
                {{ formatDateDisplay(l.datetime || l.created_at) }}
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openViewModal(l)"
                    title="View Audit Log Details & Diffs"
                  >
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDelete(l)"
                    title="Delete Audit Log"
                  >
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Reusable Pagination Control Footer -->
      <PaginationControl
        v-if="filteredLogs.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredLogs.length"
      />

    </div>

    <!-- View Audit Log Details Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewAuditLogModal"
      title="Audit Log Diffs & Details"
      icon="bi bi-journal-text"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Executing User</span>
            <span class="fw-bold text-primary fs-6">
              {{ viewingLog?.user ? `${viewingLog.user.first_name} ${viewingLog.user.last_name}` : (viewingLog ? getUserName(viewingLog.user_id) : '—') }}
            </span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">System Feature</span>
            <span class="fw-semibold text-body text-xs">
              {{ viewingLog?.feature?.name || (viewingLog ? getFeatureName(viewingLog.feature_id) : '—') }}
            </span>
          </div>
          <div class="col-md-12">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Timestamp</span>
            <span class="font-monospace text-xs text-body">{{ formatDateDisplay(viewingLog?.datetime || viewingLog?.created_at) }}</span>
          </div>
        </div>

        <!-- Before & After JSON Diffs -->
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-danger text-uppercase fw-bold d-block mb-1">
              <i class="bi bi-dash-circle me-1"></i> State Before Action
            </span>
            <pre class="p-3 bg-body rounded-3 border text-xs font-monospace text-danger overflow-auto" style="max-height: 200px;">{{ formatJsonPretty(viewingLog?.before) }}</pre>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-success text-uppercase fw-bold d-block mb-1">
              <i class="bi bi-plus-circle me-1"></i> State After Action
            </span>
            <pre class="p-3 bg-body rounded-3 border text-xs font-monospace text-success overflow-auto" style="max-height: 200px;">{{ formatJsonPretty(viewingLog?.after) }}</pre>
          </div>
        </div>
      </div>
    </ViewDetailModal>

    <!-- Custom Delete Confirmation Modal -->
    <div v-if="isDeleteModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <div 
      v-if="isDeleteModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      style="z-index: 1065;"
      @click.self="cancelDelete"
    >
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden text-center p-4">
          
          <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 mx-auto mb-3" style="width: 56px; height: 56px;">
            <i class="bi bi-trash3-fill fs-3"></i>
          </div>

          <h5 class="fw-bold text-primary text-sm mb-1">Confirm Deletion</h5>
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to delete this audit log entry?</p>
          
          <p class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1.5 px-3 rounded-3 d-inline-block mx-auto">
            Log #{{ itemToDelete?.id }} - {{ itemToDelete ? getFeatureName(itemToDelete.feature_id) : '' }}
          </p>

          <div class="d-flex align-items-center justify-content-center gap-2">
            <button 
              type="button" 
              class="btn btn-sm btn-light border rounded-pill px-3.5 text-xs fw-semibold" 
              @click="cancelDelete"
            >
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-danger rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
              :disabled="isDeleting"
              @click="confirmDelete"
            >
              <span v-if="isDeleting" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Log' }}</span>
            </button>
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

.user-avatar-badge {
  width: 28px;
  height: 28px;
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
