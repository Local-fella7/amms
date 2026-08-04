<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface AgeGroup {
  id: number
  name: string
  from_age: number
  to_age: number
  created_at?: string
  updated_at?: string
}

const { data: ageGroups, loading, error, execute: fetchAgeGroups, fetchWithAuth } = useApi<AgeGroup[]>()

const searchQuery = ref('')
const isSubmitting = ref(false)
const modalError = ref('')
const editingGroup = ref<AgeGroup | null>(null)
const isModalOpen = ref(false)

// Form Fields
const name = ref('')
const fromAge = ref<number | ''>('')
const toAge = ref<number | ''>('')

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const schema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters'),
  from_age: z.number().min(0, 'Minimum age must be 0 or greater'),
  to_age: z.number().min(0, 'Maximum age must be 0 or greater')
}).refine(data => data.to_age >= data.from_age, {
  message: 'Maximum age must be greater than or equal to Minimum age',
  path: ['to_age']
})

const loadData = async () => {
  try {
    await fetchAgeGroups((api) => api('/api/age-groups'))
  } catch (err) {
    // Error handled by composable
  }
}

const filteredAgeGroups = computed(() => {
  if (!ageGroups.value) return []
  let result = [...ageGroups.value]
  if (searchQuery.value.trim()) {
    result = result.filter(g => 
      g.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      g.from_age.toString().includes(searchQuery.value) ||
      g.to_age.toString().includes(searchQuery.value)
    )
  }
  // Sort descending by ID (newest first)
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredAgeGroups.value.length / itemsPerPage.value) || 1)

const paginatedAgeGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredAgeGroups.value.slice(start, start + itemsPerPage.value)
})

// Reset to page 1 on filter/size change
watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
})

const openAddModal = () => {
  editingGroup.value = null
  name.value = ''
  fromAge.value = ''
  toAge.value = ''
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (group: AgeGroup) => {
  editingGroup.value = group
  name.value = group.name
  fromAge.value = group.from_age
  toAge.value = group.to_age
  modalError.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const handleSave = async () => {
  modalError.value = ''
  const payload = {
    name: name.value,
    from_age: Number(fromAge.value),
    to_age: Number(toAge.value)
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingGroup.value) {
      await fetchWithAuth(`/api/age-groups/${editingGroup.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success(`Age Group "${name.value}" updated successfully!`)
    } else {
      await fetchWithAuth('/api/age-groups', {
        method: 'POST',
        body: payload
      })
      push.success(`Age Group "${name.value}" created successfully!`)
    }
    
    closeModal()
    await loadData()
  } catch (err: any) {
    modalError.value = err?.data?.message || err?.message || 'Failed to save age group'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const viewingGroup = ref<AgeGroup | null>(null)
const isViewModalOpen = ref(false)

const openViewModal = (group: AgeGroup) => {
  viewingGroup.value = group
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingGroup.value = null
  isViewModalOpen.value = false
}
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

const promptDelete = (group: AgeGroup) => {
  itemToDelete.value = group
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
    await fetchWithAuth(`/api/age-groups/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success(`Age Group "${itemToDelete.value.name}" deleted successfully!`)
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete age group'
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
      title="Age Groups"
      subtitle="Define member age brackets and demographic classifications"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search age groups..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="New Age Group"
      @add="openAddModal"
    />

    <!-- Main Data Table Container -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading age groups...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading age groups data...</span>
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
              <th class="ps-4" style="width: 90px;"># ID</th>
              <th>Group Name</th>
              <th>Age Range</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && (!ageGroups || ageGroups.length === 0)">
              <tr v-for="i in 4" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredAgeGroups.length === 0">
              <td colspan="4" class="text-center py-5 text-muted">
                <i class="bi bi-people fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No age groups found</p>
                <small>Click "New Age Group" above to add your first bracket.</small>
              </td>
            </tr>

            <!-- Age Group Rows -->
            <tr v-for="group in paginatedAgeGroups" :key="group.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ group.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="group-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-person-bounding-box text-primary text-xs"></i>
                  </div>
                  <span>{{ group.name }}</span>
                </div>
              </td>
              <td>
                <span class="badge bg-body-tertiary text-body border px-3 py-1.5 rounded-pill font-monospace text-xs">
                  <i class="bi bi-clock-history me-1 text-muted"></i>
                  {{ group.from_age }} – {{ group.to_age }} Years
                </span>
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openViewModal(group)"
                    title="View Age Group Details"
                  >
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditModal(group)"
                    title="Edit Age Group"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDelete(group)"
                    title="Delete Age Group"
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
        v-if="filteredAgeGroups.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredAgeGroups.length"
      />

    </div>

    <!-- View Age Group Details Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewAgeGroupModal"
      title="Age Group Bracket Details"
      icon="bi bi-people"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-12">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Group Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingGroup?.name }}</span>
          </div>
          <div class="col-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Minimum Age</span>
            <span class="fw-semibold text-body">{{ viewingGroup?.from_age }} Years</span>
          </div>
          <div class="col-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Maximum Age</span>
            <span class="fw-semibold text-body">{{ viewingGroup?.to_age }} Years</span>
          </div>
          <div class="col-6" v-if="viewingGroup?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Created Date</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingGroup.created_at }}</span>
          </div>
          <div class="col-6" v-if="viewingGroup?.updated_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Last Updated</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingGroup.updated_at }}</span>
          </div>
        </div>
      </div>
    </ViewDetailModal>

    <!-- Vue-Controlled Custom Delete Modal Overlay -->
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
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to permanently delete this age group?</p>
          
          <p class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1.5 px-3 rounded-3 d-inline-block mx-auto">
            "{{ itemToDelete?.name }}"
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
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Group' }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Vue-Controlled Pure Modal Overlay -->
    <div v-if="isModalOpen" class="modal-backdrop fade show"></div>
    
    <div 
      v-if="isModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      @click.self="closeModal"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-people me-1.5 amms-accent"></i>
              <span>{{ editingGroup ? 'Edit Age Group' : 'Add New Age Group' }}</span>
            </h5>
            <button 
              type="button" 
              class="btn-close position-absolute end-0 me-3" 
              @click="closeModal"
              aria-label="Close"
            ></button>
          </div>

          <form @submit.prevent="handleSave">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>

              <!-- Group Name -->
              <div class="mb-3">
                <label for="groupName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                  Group Name *
                </label>
                <div class="input-group">
                  <span class="input-group-text bg-transparent border-end-0 text-muted">
                    <i class="bi bi-tag"></i>
                  </span>
                  <input
                    id="groupName"
                    v-model="name"
                    type="text"
                    class="form-control border-start-0 ps-1 py-2.5 text-sm"
                    placeholder="e.g. Infant, Youth, Adult"
                    required
                  />
                </div>
              </div>

              <!-- Age Range Inputs -->
              <div class="row g-3">
                <div class="col-6">
                  <label for="fromAge" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    From Age (Years) *
                  </label>
                  <input
                    id="fromAge"
                    v-model="fromAge"
                    type="number"
                    min="0"
                    class="form-control py-2.5 text-sm"
                    placeholder="0"
                    required
                  />
                </div>

                <div class="col-6">
                  <label for="toAge" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    To Age (Years) *
                  </label>
                  <input
                    id="toAge"
                    v-model="toAge"
                    type="number"
                    min="0"
                    class="form-control py-2.5 text-sm"
                    placeholder="5"
                    required
                  />
                </div>
              </div>

            </div>

            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-secondary rounded-pill px-3" 
                @click="closeModal"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                :disabled="isSubmitting"
              >
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Saving...' : (editingGroup ? 'Update Age Group' : 'Save Age Group') }}</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }

/* Civic Registry Custom Table Styling */
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

.group-icon-badge {
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
