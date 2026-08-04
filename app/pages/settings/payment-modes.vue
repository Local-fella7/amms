<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface PaymentMode {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

const { data: paymentModes, loading, error, execute: fetchPaymentModes, fetchWithAuth } = useApi<PaymentMode[]>()

const searchQuery = ref('')
const isSubmitting = ref(false)
const modalError = ref('')
const editingMode = ref<PaymentMode | null>(null)
const isModalOpen = ref(false)

// Form Fields
const name = ref('')

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Delete Modal State
const viewingMode = ref<PaymentMode | null>(null)
const isViewModalOpen = ref(false)

const openViewModal = (mode: PaymentMode) => {
  viewingMode.value = mode
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingMode.value = null
  isViewModalOpen.value = false
}
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

const schema = z.object({
  name: z.string().min(2, 'Payment mode name must be at least 2 characters')
})

const loadData = async () => {
  try {
    await fetchPaymentModes((api) => api('/api/payment-modes'))
  } catch (err) {
    // Error handled by composable
  }
}

const filteredPaymentModes = computed(() => {
  if (!paymentModes.value) return []
  let result = [...paymentModes.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(m => m.name.toLowerCase().includes(q))
  }
  // Sort descending by ID (newest first)
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredPaymentModes.value.length / itemsPerPage.value) || 1)

const paginatedPaymentModes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredPaymentModes.value.slice(start, start + itemsPerPage.value)
})

// Reset to page 1 on search or page size change
watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
})

const openAddModal = () => {
  editingMode.value = null
  name.value = ''
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (mode: PaymentMode) => {
  editingMode.value = mode
  name.value = mode.name
  modalError.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const handleSave = async () => {
  modalError.value = ''
  const payload = {
    name: name.value.trim()
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingMode.value) {
      await fetchWithAuth(`/api/payment-modes/${editingMode.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success(`Payment mode "${name.value}" updated successfully!`)
    } else {
      await fetchWithAuth('/api/payment-modes', {
        method: 'POST',
        body: payload
      })
      push.success(`Payment mode "${name.value}" created successfully!`)
    }
    
    closeModal()
    await loadData()
  } catch (err: any) {
    console.error('Save payment mode error:', err)
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save payment mode'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const promptDelete = (mode: PaymentMode) => {
  itemToDelete.value = mode
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
    await fetchWithAuth(`/api/payment-modes/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success(`Payment mode "${itemToDelete.value.name}" deleted successfully!`)
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete payment mode'
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
      title="Payment Modes"
      subtitle="Manage accepted fee payment channels (e.g. Cash, Cheque, Mobile Money)"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search payment modes..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="New Payment Mode"
      @add="openAddModal"
    />

    <!-- Main Data Table Container -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading payment modes...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading payment mode data...</span>
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
              <th>Mode Name</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && (!paymentModes || paymentModes.length === 0)">
              <tr v-for="i in 4" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredPaymentModes.length === 0">
              <td colspan="3" class="text-center py-5 text-muted">
                <i class="bi bi-credit-card fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No payment modes found</p>
                <small>Click "New Payment Mode" above to add an accepted payment channel.</small>
              </td>
            </tr>

            <!-- Payment Mode Rows -->
            <tr v-for="mode in paginatedPaymentModes" :key="mode.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ mode.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="mode-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-credit-card-2-front text-primary text-xs"></i>
                  </div>
                  <span>{{ mode.name }}</span>
                </div>
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openViewModal(mode)"
                    title="View Payment Mode Details"
                  >
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditModal(mode)"
                    title="Edit Payment Mode"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDelete(mode)"
                    title="Delete Payment Mode"
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
        v-if="filteredPaymentModes.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredPaymentModes.length"
      />

    </div>

    <!-- View Payment Mode Details Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewPaymentModeModal"
      title="Payment Mode Details"
      icon="bi bi-credit-card"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-12">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Mode Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingMode?.name }}</span>
          </div>
          <div class="col-6" v-if="viewingMode?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Created Date</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingMode.created_at }}</span>
          </div>
          <div class="col-6" v-if="viewingMode?.updated_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Last Updated</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingMode.updated_at }}</span>
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
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to permanently delete this payment mode?</p>
          
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
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Mode' }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Create / Edit Vue Pure Modal -->
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
              <i class="bi bi-credit-card me-1.5 amms-accent"></i>
              <span>{{ editingMode ? 'Edit Payment Mode' : 'Add New Payment Mode' }}</span>
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

              <!-- Payment Mode Name -->
              <div class="mb-2">
                <label for="modeName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                  Payment Mode Name *
                </label>
                <div class="input-group">
                  <span class="input-group-text bg-transparent border-end-0 text-muted">
                    <i class="bi bi-wallet"></i>
                  </span>
                  <input
                    id="modeName"
                    v-model="name"
                    type="text"
                    class="form-control border-start-0 ps-1 py-2.5 text-sm"
                    placeholder="e.g. Cash, Cheque, Mobile Money"
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
                <span>{{ isSubmitting ? 'Saving...' : (editingMode ? 'Update Mode' : 'Save Mode') }}</span>
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

.mode-icon-badge {
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
