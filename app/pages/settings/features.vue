<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface Feature {
  id: number
  name: string
  features_group_id: number | string
  group?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string
}

interface FeatureGroupOption {
  id: number
  name: string
}

const { data: featuresResponse, loading, error, execute: fetchFeatures, fetchWithAuth } = useApi<any>()
const { data: featureGroups, execute: fetchGroups } = useApi<FeatureGroupOption[]>()

const searchQuery = ref('')
const selectedGroupFilter = ref<string>('')

const isSubmitting = ref(false)
const modalError = ref('')
const editingFeature = ref<Feature | null>(null)
const isModalOpen = ref(false)

const name = ref('')
const featuresGroupId = ref<number | string>('')

// View Modal State
const viewingFeature = ref<Feature | null>(null)
const isViewModalOpen = ref(false)

// Delete Modal State
const itemToDelete = ref<Feature | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const schema = z.object({
  name: z.string().min(2, 'Feature name is required'),
  features_group_id: z.union([z.number(), z.string().min(1, 'Feature group is required')])
})

const loadData = async () => {
  try {
    await Promise.all([
      fetchFeatures((api) => api('/api/features')),
      fetchGroups((api) => api('/api/feature-groups')).catch(() => [])
    ])
  } catch (err) {
    // Handled by composable
  }
}

const rawFeaturesList = computed<Feature[]>(() => {
  if (!featuresResponse.value) return []
  const res = featuresResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const getGroupName = (groupId: number | string) => {
  if (!featureGroups.value) return `Group #${groupId}`
  const found = featureGroups.value.find(g => Number(g.id) === Number(groupId))
  return found ? found.name : `Group #${groupId}`
}

const filteredFeatures = computed(() => {
  let result = [...rawFeaturesList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(f => f.name.toLowerCase().includes(q) || String(f.id).includes(q))
  }

  if (selectedGroupFilter.value) {
    result = result.filter(f => Number(f.features_group_id) === Number(selectedGroupFilter.value))
  }

  // Descending sort by ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredFeatures.value.length / itemsPerPage.value) || 1)

const paginatedFeatures = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredFeatures.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, selectedGroupFilter, itemsPerPage], () => {
  currentPage.value = 1
})

const openAddModal = () => {
  editingFeature.value = null
  name.value = ''
  featuresGroupId.value = featureGroups.value && featureGroups.value.length > 0 ? featureGroups.value[0].id : ''
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (f: Feature) => {
  editingFeature.value = f
  name.value = f.name
  featuresGroupId.value = f.features_group_id
  modalError.value = ''
  isModalOpen.value = true
}

const openViewModal = (f: Feature) => {
  viewingFeature.value = f
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingFeature.value = null
  isViewModalOpen.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

const handleSave = async () => {
  modalError.value = ''
  const payload = {
    name: name.value.trim(),
    features_group_id: Number(featuresGroupId.value)
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingFeature.value) {
      await fetchWithAuth(`/api/features/${editingFeature.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success('Feature updated successfully!')
    } else {
      await fetchWithAuth('/api/features', {
        method: 'POST',
        body: payload
      })
      push.success('Feature created successfully!')
    }
    
    closeModal()
    await loadData()
  } catch (err: any) {
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save feature'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const promptDelete = (f: Feature) => {
  itemToDelete.value = f
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
    await fetchWithAuth(`/api/features/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success('Feature deleted successfully!')
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete feature'
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
    <PageHeader
      title="System Features"
      subtitle="Manage granular permission capabilities across system modules"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search system features..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="Add Feature"
      @add="openAddModal"
    />

    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Top Table Toolbar with Integrated Filters -->
      <div class="card-header bg-body-tertiary border-bottom px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="text-xs fw-bold text-uppercase text-secondary-amms tracking-wider me-1">
            <i class="bi bi-funnel-fill text-primary me-1"></i> Quick Filters:
          </span>

          <div style="min-width: 200px;">
            <select 
              v-model="selectedGroupFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedGroupFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Feature Groups</option>
              <option v-for="g in featureGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>

          <button 
            v-if="selectedGroupFilter || searchQuery"
            type="button" 
            class="btn btn-xs btn-link text-danger text-xs text-decoration-none px-2 fw-semibold ms-1"
            @click="selectedGroupFilter = ''; searchQuery = ''"
          >
            <i class="bi bi-x-lg me-1"></i> Clear Filters
          </button>
        </div>

        <div class="text-xs text-muted font-monospace">
          Showing <span class="fw-bold text-primary">{{ filteredFeatures.length }}</span> features
        </div>
      </div>

      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading system features...</span>
      </div>

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
              <th>Feature Name</th>
              <th>Feature Group</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading && rawFeaturesList.length === 0">
              <tr v-for="i in 5" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <tr v-else-if="filteredFeatures.length === 0">
              <td colspan="4" class="text-center py-5 text-muted">
                <i class="bi bi-shield-slash fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No features found</p>
                <small>Click "Add Feature" above to create one.</small>
              </td>
            </tr>

            <tr v-for="f in paginatedFeatures" :key="f.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ f.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="feat-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-key-fill text-primary text-xs"></i>
                  </div>
                  <span>{{ f.name }}</span>
                </div>
              </td>
              <td>
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs">
                  <i class="bi bi-folder me-1"></i>
                  {{ f.group?.name || getGroupName(f.features_group_id) }}
                </span>
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn" @click="openViewModal(f)" title="View Details">
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn" @click="openEditModal(f)" title="Edit Feature">
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" @click="promptDelete(f)" title="Delete Feature">
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationControl
        v-if="filteredFeatures.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredFeatures.length"
      />

    </div>

    <!-- View Detail Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewFeatureModal"
      title="System Feature Details"
      icon="bi bi-key"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Feature Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingFeature?.name }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Assigned Group</span>
            <span class="fw-semibold text-body text-xs">{{ viewingFeature ? (viewingFeature.group?.name || getGroupName(viewingFeature.features_group_id)) : '—' }}</span>
          </div>
          <div class="col-md-6" v-if="viewingFeature?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Created At</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingFeature.created_at }}</span>
          </div>
          <div class="col-md-6" v-if="viewingFeature?.updated_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Last Updated</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingFeature.updated_at }}</span>
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
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to delete this feature?</p>
          <p class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1.5 px-3 rounded-3 d-inline-block mx-auto">
            {{ itemToDelete?.name }}
          </p>
          <div class="d-flex align-items-center justify-content-center gap-2">
            <button type="button" class="btn btn-sm btn-light border rounded-pill px-3.5 text-xs fw-semibold" @click="cancelDelete">Cancel</button>
            <button type="button" class="btn btn-sm btn-danger rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-sm" :disabled="isDeleting" @click="confirmDelete">
              <span v-if="isDeleting" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Feature' }}</span>
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
              <i class="bi bi-key me-1.5 amms-accent"></i>
              <span>{{ editingFeature ? 'Edit System Feature' : 'Add System Feature' }}</span>
            </h5>
            <button type="button" class="btn-close position-absolute end-0 me-3" @click="closeModal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="handleSave">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>
              <div class="mb-3">
                <label for="featName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Feature Name *</label>
                <input id="featName" v-model="name" type="text" class="form-control py-2.5 text-sm" placeholder="e.g. Manage Reports" required />
              </div>
              <div class="mb-3">
                <label for="groupId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Feature Group *</label>
                <select id="groupId" v-model="featuresGroupId" class="form-select py-2.5 text-sm" required>
                  <option v-for="g in featureGroups" :key="g.id" :value="g.id">
                    {{ g.name }}
                  </option>
                </select>
              </div>
            </div>
            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Saving...' : (editingFeature ? 'Update Feature' : 'Save Feature') }}</span>
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

.feat-icon-badge {
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
