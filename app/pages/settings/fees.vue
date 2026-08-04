<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface FeeSchedule {
  id: number
  name?: string
  year?: number
  fee_year?: number
  amount: number
  description?: string
  created_at?: string
  updated_at?: string
}

const { data: fees, loading, error, execute: fetchFees, fetchWithAuth } = useApi<FeeSchedule[]>()

const searchQuery = ref('')
const isSubmitting = ref(false)
const modalError = ref('')
const editingFee = ref<FeeSchedule | null>(null)
const isModalOpen = ref(false)

// Form Fields
const feeYear = ref<number | ''>(new Date().getFullYear())
const amount = ref<number | ''>('')
const description = ref('')

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Delete Modal State
const viewingFee = ref<FeeSchedule | null>(null)
const isViewModalOpen = ref(false)

const openViewModal = (fee: FeeSchedule) => {
  viewingFee.value = fee
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingFee.value = null
  isViewModalOpen.value = false
}
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

const schema = z.object({
  fee_year: z.number({ invalid_type_error: 'Please enter a valid year' })
    .int('Fee year must be a whole number')
    .min(2000, 'Fee year must be year 2000 or later')
    .max(2100, 'Fee year cannot exceed year 2100'),
  amount: z.number({ invalid_type_error: 'Please enter a valid amount' })
    .positive('Annual fee amount must be a positive number greater than 0')
    .min(100, 'Minimum fee amount is TZS 100'),
  description: z.string().optional()
})

const getFeeYear = (fee: FeeSchedule) => {
  return fee.fee_year ?? fee.year ?? new Date().getFullYear()
}

const loadData = async () => {
  try {
    await fetchFees((api) => api('/api/fees'))
  } catch (err) {
    // Error handled by composable
  }
}

const filteredFees = computed(() => {
  if (!fees.value) return []
  let result = [...fees.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(f => {
      const yearStr = getFeeYear(f).toString()
      return yearStr.includes(q) ||
        f.amount.toString().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.name && f.name.toLowerCase().includes(q))
    })
  }
  // Sort descending by year / ID (newest first)
  return result.sort((a, b) => getFeeYear(b) - getFeeYear(a) || b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredFees.value.length / itemsPerPage.value) || 1)

const paginatedFees = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredFees.value.slice(start, start + itemsPerPage.value)
})

// Reset to page 1 on search or page size change
watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
})

const openAddModal = () => {
  editingFee.value = null
  feeYear.value = new Date().getFullYear()
  amount.value = ''
  description.value = ''
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (fee: FeeSchedule) => {
  editingFee.value = fee
  feeYear.value = getFeeYear(fee)
  amount.value = fee.amount
  description.value = fee.description || fee.name || ''
  modalError.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const handleSave = async () => {
  modalError.value = ''
  
  const descText = description.value.trim() || `Annual Fee ${feeYear.value}`
  
  // Backend expects name, description, year, and fee_year
  const payload: any = {
    name: descText,
    description: descText,
    year: Number(feeYear.value),
    fee_year: Number(feeYear.value),
    amount: Number(amount.value)
  }

  const validation = schema.safeParse({
    fee_year: Number(feeYear.value),
    amount: Number(amount.value),
    description: description.value
  })

  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  // Prevent duplicate fee year entries
  const existingYear = fees.value?.find(f => Number(f.fee_year) === Number(payload.fee_year) && f.id !== editingFee.value?.id)
  if (existingYear) {
    modalError.value = `A fee schedule for year ${payload.fee_year} already exists.`
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingFee.value) {
      await fetchWithAuth(`/api/fees/${editingFee.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success(`Fee schedule for year ${feeYear.value} updated successfully!`)
    } else {
      await fetchWithAuth('/api/fees', {
        method: 'POST',
        body: payload
      })
      push.success(`Fee schedule for year ${feeYear.value} created successfully!`)
    }
    
    closeModal()
    await loadData()
  } catch (err: any) {
    console.error('Save fee schedule error:', err)
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save fee schedule'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const promptDelete = (fee: FeeSchedule) => {
  itemToDelete.value = fee
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
    await fetchWithAuth(`/api/fees/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success(`Fee schedule for year ${itemToDelete.value.fee_year} deleted successfully!`)
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete fee schedule'
    push.error(msg)
  } finally {
    isDeleting.value = false
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(val)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="Fee Schedules"
      subtitle="Manage annual membership subscription fees and amounts"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search fees by year or amount..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="New Fee Schedule"
      @add="openAddModal"
    />

    <!-- Main Data Table Container -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading fee schedules...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading fee schedule data...</span>
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
              <th>Fee Year</th>
              <th>Annual Amount</th>
              <th>Description</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && (!fees || fees.length === 0)">
              <tr v-for="i in 4" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-10"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredFees.length === 0">
              <td colspan="5" class="text-center py-5 text-muted">
                <i class="bi bi-receipt fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No fee schedules found</p>
                <small>Click "New Fee Schedule" above to define an annual fee rate.</small>
              </td>
            </tr>

            <!-- Fee Schedule Rows -->
            <tr v-for="fee in paginatedFees" :key="fee.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ fee.id }}</td>
              <td>
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-3 py-1.5 rounded-pill font-monospace fw-semibold">
                  <i class="bi bi-calendar-event me-1"></i>
                  {{ getFeeYear(fee) }}
                </span>
              </td>
              <td class="fw-bold text-success font-monospace fs-6">
                {{ formatCurrency(fee.amount) }}
              </td>
              <td class="text-secondary-amms text-xs">
                {{ fee.description || fee.name || '—' }}
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openViewModal(fee)"
                    title="View Fee Schedule Details"
                  >
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditModal(fee)"
                    title="Edit Fee Schedule"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDelete(fee)"
                    title="Delete Fee Schedule"
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
        v-if="filteredFees.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredFees.length"
      />

    </div>

    <!-- View Fee Schedule Details Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewFeeModal"
      title="Fee Schedule Details"
      icon="bi bi-receipt"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Fee Year</span>
            <span class="fw-bold text-primary font-monospace fs-6">{{ viewingFee ? getFeeYear(viewingFee) : '' }}</span>
          </div>
          <div class="col-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Annual Amount</span>
            <span class="fw-bold text-success font-monospace fs-6">{{ viewingFee ? formatCurrency(viewingFee.amount) : '' }}</span>
          </div>
          <div class="col-12">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Description</span>
            <span class="fw-medium text-body text-xs">{{ viewingFee?.description || viewingFee?.name || '—' }}</span>
          </div>
          <div class="col-6" v-if="viewingFee?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Created Date</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingFee.created_at }}</span>
          </div>
          <div class="col-6" v-if="viewingFee?.updated_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Last Updated</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingFee.updated_at }}</span>
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
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to permanently delete this annual fee schedule?</p>
          
          <p class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1.5 px-3 rounded-3 d-inline-block mx-auto">
            Year {{ itemToDelete ? getFeeYear(itemToDelete) : '' }} ({{ itemToDelete ? formatCurrency(itemToDelete.amount) : '' }})
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
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Fee' }}</span>
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
              <i class="bi bi-receipt me-1.5 amms-accent"></i>
              <span>{{ editingFee ? 'Edit Fee Schedule' : 'Add New Fee Schedule' }}</span>
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

              <div class="row g-3 mb-3">
                <!-- Fee Year -->
                <div class="col-6">
                  <label for="feeYear" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    Fee Year *
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted">
                      <i class="bi bi-calendar"></i>
                    </span>
                    <input
                      id="feeYear"
                      v-model="feeYear"
                      type="number"
                      min="2000"
                      max="2100"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm"
                      placeholder="2026"
                      required
                    />
                  </div>
                </div>

                <!-- Annual Amount -->
                <div class="col-6">
                  <label for="feeAmount" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    Annual Amount (TZS) *
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted">
                      <i class="bi bi-cash"></i>
                    </span>
                    <input
                      id="feeAmount"
                      v-model="amount"
                      type="number"
                      min="100"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm"
                      placeholder="50000"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- Description -->
              <div class="mb-2">
                <label for="feeDesc" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                  Description / Notes
                </label>
                <textarea
                  id="feeDesc"
                  v-model="description"
                  rows="2"
                  class="form-control py-2 text-sm"
                  placeholder="Optional description (e.g. Standard Annual Subscription 2026)"
                ></textarea>
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
                <span>{{ isSubmitting ? 'Saving...' : (editingFee ? 'Update Fee' : 'Save Fee') }}</span>
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
