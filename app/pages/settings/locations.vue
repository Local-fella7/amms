<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface Location {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

const { data: locations, loading, error, execute: fetchLocations, fetchWithAuth } = useApi<Location[]>()

const searchQuery = ref('')
const isSubmitting = ref(false)
const modalError = ref('')
const editingLocation = ref<Location | null>(null)
const locationName = ref('')
const isModalOpen = ref(false)

// Pagination Reactive State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const schema = z.object({
  name: z.string().min(2, 'Location name must be at least 2 characters')
})

const loadData = async () => {
  try {
    await fetchLocations((api) => api('/api/locations'))
  } catch (err) {
    // Error handled by composable
  }
}

const filteredLocations = computed(() => {
  if (!locations.value) return []
  let result = [...locations.value]
  if (searchQuery.value.trim()) {
    result = result.filter(loc => 
      loc.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  // Sort descending by ID (newest first)
  return result.sort((a, b) => b.id - a.id)
})

// Paginated Locations Slice
const totalPages = computed(() => Math.ceil(filteredLocations.value.length / itemsPerPage.value) || 1)

const paginatedLocations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredLocations.value.slice(start, start + itemsPerPage.value)
})

// Reset to page 1 whenever search query or items per page changes
watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
})

const openAddModal = () => {
  editingLocation.value = null
  locationName.value = ''
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (loc: Location) => {
  editingLocation.value = loc
  locationName.value = loc.name
  modalError.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const handleSave = async () => {
  modalError.value = ''
  const validation = schema.safeParse({ name: locationName.value })
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingLocation.value) {
      await fetchWithAuth(`/api/locations/${editingLocation.value.id}`, {
        method: 'PUT',
        body: { name: locationName.value }
      })
      push.success(`Location "${locationName.value}" updated successfully!`)
    } else {
      await fetchWithAuth('/api/locations', {
        method: 'POST',
        body: { name: locationName.value }
      })
      push.success(`Location "${locationName.value}" created successfully!`)
    }
    
    closeModal()
    await loadData()
  } catch (err: any) {
    modalError.value = err?.data?.message || err?.message || 'Failed to save location'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async (loc: Location) => {
  if (!confirm(`Are you sure you want to delete "${loc.name}"?`)) return
  
  try {
    await fetchWithAuth(`/api/locations/${loc.id}`, { method: 'DELETE' })
    push.success(`Location "${loc.name}" deleted successfully!`)
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete location'
    push.error(msg)
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
      title="Locations & Regions"
      subtitle="Manage geographic branches and member registration locations"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search locations..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="New Location"
      @add="openAddModal"
    />

    <!-- Main Data Table Container -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading locations...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading locations data...</span>
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
              <th>Location Name</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && (!locations || locations.length === 0)">
              <tr v-for="i in 4" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredLocations.length === 0">
              <td colspan="3" class="text-center py-5 text-muted">
                <i class="bi bi-geo-alt fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No locations found</p>
                <small>Click "New Location" above to add your first location branch.</small>
              </td>
            </tr>

            <!-- Location Rows -->
            <tr v-for="loc in paginatedLocations" :key="loc.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ loc.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="loc-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-geo-alt-fill text-primary text-xs"></i>
                  </div>
                  <span>{{ loc.name }}</span>
                </div>
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditModal(loc)"
                    title="Edit Location"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="handleDelete(loc)"
                    title="Delete Location"
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
        v-if="filteredLocations.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredLocations.length"
      />

    </div>

    <!-- Vue-Controlled Pure Modal Overlay (Reliable & No Bootstrap JS Dependencies) -->
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
              <i class="bi bi-geo-alt me-1.5 amms-accent"></i>
              <span>{{ editingLocation ? 'Edit Location Branch' : 'Add New Location Branch' }}</span>
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

              <div class="mb-3">
                <label for="locNameModal" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                  Location / City Name *
                </label>
                <div class="input-group">
                  <span class="input-group-text bg-transparent border-end-0 text-muted">
                    <i class="bi bi-building"></i>
                  </span>
                  <input
                    id="locNameModal"
                    v-model="locationName"
                    type="text"
                    class="form-control border-start-0 ps-1 py-2.5 text-sm"
                    placeholder="e.g. Dar es Salaam, Moshi"
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
                <span>{{ isSubmitting ? 'Saving...' : (editingLocation ? 'Update Location' : 'Save Location') }}</span>
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

.loc-icon-badge {
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
