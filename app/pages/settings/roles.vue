<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface Role {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

interface Feature {
  id: number
  name: string
  features_group_id?: number
}

interface RoleFeature {
  id: number
  role_id: number
  feature_id: number
}

const { data: roles, loading: loadingRoles, error: rolesError, execute: fetchRoles, fetchWithAuth } = useApi<Role[]>()
const { data: features, execute: fetchFeatures } = useApi<Feature[]>()
const { data: roleFeatures, execute: fetchRoleFeatures } = useApi<RoleFeature[]>()

const searchQuery = ref('')
const isSubmitting = ref(false)
const modalError = ref('')
const editingRole = ref<Role | null>(null)
const roleName = ref('')
const isRoleModalOpen = ref(false)

// Permissions Drawer State
const selectedRoleForPerms = ref<Role | null>(null)
const isPermsDrawerOpen = ref(false)
const selectedFeatureIds = ref<number[]>([])
const isSavingPerms = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Delete Modal State
const itemToDelete = ref<Role | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

const schema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters')
})

const loadData = async () => {
  try {
    await Promise.all([
      fetchRoles((api) => api('/api/roles')),
      fetchFeatures((api) => api('/api/features')).catch(() => []),
      fetchRoleFeatures((api) => api('/api/role-features')).catch(() => [])
    ])
  } catch (err) {
    // Error handled by composable
  }
}

const filteredRoles = computed(() => {
  if (!roles.value) return []
  let result = [...roles.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(r => r.name.toLowerCase().includes(q))
  }
  // Sort descending by ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredRoles.value.length / itemsPerPage.value) || 1)

const paginatedRoles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredRoles.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
})

const getAssignedCount = (roleId: number) => {
  if (!roleFeatures.value) return 0
  const records = Array.isArray(roleFeatures.value) 
    ? roleFeatures.value 
    : ((roleFeatures.value as any)?.data || [])
  return records.filter((rf: any) => Number(rf.role_id || rf.roleId) === Number(roleId)).length
}

const openAddRoleModal = () => {
  editingRole.value = null
  roleName.value = ''
  modalError.value = ''
  isRoleModalOpen.value = true
}

const openEditRoleModal = (role: Role) => {
  editingRole.value = role
  roleName.value = role.name
  modalError.value = ''
  isRoleModalOpen.value = true
}

const closeRoleModal = () => {
  isRoleModalOpen.value = false
}

const handleSaveRole = async () => {
  modalError.value = ''
  const payload = { name: roleName.value.trim() }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingRole.value) {
      await fetchWithAuth(`/api/roles/${editingRole.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success(`Role "${roleName.value}" updated successfully!`)
    } else {
      await fetchWithAuth('/api/roles', {
        method: 'POST',
        body: payload
      })
      push.success(`Role "${roleName.value}" created successfully!`)
    }
    
    closeRoleModal()
    await loadData()
  } catch (err: any) {
    console.error('Save role error:', err)
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save role'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const openPermsDrawer = async (role: Role) => {
  selectedRoleForPerms.value = role
  isPermsDrawerOpen.value = true
  
  try {
    const res: any = await fetchWithAuth('/api/role-features')
    console.log('GET /api/role-features response:', res)
    
    let records = []
    if (Array.isArray(res)) {
      records = res
    } else if (Array.isArray(res?.data)) {
      records = res.data
    } else if (Array.isArray(res?.data?.data)) {
      records = res.data.data
    } else if (res?.data && typeof res.data === 'object') {
      records = Object.values(res.data)
    }

    console.log('Parsed role-feature records:', records)

    selectedFeatureIds.value = records
      .filter((rf: any) => Number(rf.role_id ?? rf.roleId ?? rf.role_id) === Number(role.id))
      .map((rf: any) => Number(rf.feature_id ?? rf.featureId ?? rf.id))

    console.log('Selected feature IDs for role', role.id, ':', selectedFeatureIds.value)
  } catch (err) {
    console.error('Error fetching role-features:', err)
    selectedFeatureIds.value = []
  }
}

const closePermsDrawer = () => {
  isPermsDrawerOpen.value = false
  selectedRoleForPerms.value = null
}

const isFeatureSelected = (featureId: number | string) => {
  return selectedFeatureIds.value.some(id => Number(id) === Number(featureId))
}

const toggleFeaturePerm = (featureId: number | string) => {
  const numId = Number(featureId)
  const index = selectedFeatureIds.value.findIndex(id => Number(id) === numId)
  if (index > -1) {
    selectedFeatureIds.value.splice(index, 1)
  } else {
    selectedFeatureIds.value.push(numId)
  }
}

const handleSavePermissions = async () => {
  if (!selectedRoleForPerms.value) return

  isSavingPerms.value = true
  try {
    const roleId = selectedRoleForPerms.value.id
    
    // 1. Fetch current existing records for this role
    const currentRfList = await fetchWithAuth('/api/role-features').catch(() => [])
    const allRecords = Array.isArray(currentRfList) ? currentRfList : (currentRfList?.data || [])
    const existingRoleRecords = allRecords.filter((rf: any) => Number(rf.role_id) === Number(roleId))

    const existingFeatureIds = existingRoleRecords.map((rf: any) => Number(rf.feature_id))

    // 2. Add newly selected features
    for (const fId of selectedFeatureIds.value) {
      if (!existingFeatureIds.includes(fId)) {
        await fetchWithAuth('/api/role-features', {
          method: 'POST',
          body: { role_id: roleId, feature_id: fId }
        }).catch(() => {})
      }
    }

    // 3. Delete unselected features
    for (const record of existingRoleRecords) {
      if (!selectedFeatureIds.value.includes(Number(record.feature_id))) {
        await fetchWithAuth(`/api/role-features/${record.id}`, {
          method: 'DELETE'
        }).catch(() => {})
      }
    }

    push.success(`Permissions for role "${selectedRoleForPerms.value.name}" saved!`)
    closePermsDrawer()
    await loadData()
  } catch (err: any) {
    push.error('Failed to update permissions matrix')
  } finally {
    isSavingPerms.value = false
  }
}

const promptDeleteRole = (role: Role) => {
  itemToDelete.value = role
  isDeleteModalOpen.value = true
}

const cancelDelete = () => {
  itemToDelete.value = null
  isDeleteModalOpen.value = false
}

const confirmDeleteRole = async () => {
  if (!itemToDelete.value) return
  
  isDeleting.value = true
  try {
    await fetchWithAuth(`/api/roles/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success(`Role "${itemToDelete.value.name}" deleted successfully!`)
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete role'
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
      title="Roles & Permissions"
      subtitle="Define portal user access roles and feature permission matrices"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search roles..."
      :loading="loadingRoles"
      hideRefresh
      showAddButton
      addButtonText="New Role"
      @add="openAddRoleModal"
    />

    <!-- Main Data Table Container -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Center Loading Spinner Overlay -->
      <div v-if="loadingRoles" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading roles...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading role definitions...</span>
      </div>

      <!-- Error Alert -->
      <div v-if="rolesError" class="alert alert-danger rounded-0 mb-0 py-3 px-4 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <span>{{ rolesError }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-pill" @click="loadData">Retry</button>
      </div>

      <div class="table-responsive">
        <table class="table align-middle mb-0 custom-amms-table">
          <thead>
            <tr>
              <th class="ps-4" style="width: 90px;"># ID</th>
              <th>Role Name</th>
              <th>Granted Permissions</th>
              <th class="text-end pe-4" style="width: 180px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loadingRoles && (!roles || roles.length === 0)">
              <tr v-for="i in 4" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredRoles.length === 0">
              <td colspan="4" class="text-center py-5 text-muted">
                <i class="bi bi-shield-lock fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No system roles found</p>
                <small>Click "New Role" above to create an access control role.</small>
              </td>
            </tr>

            <!-- Role Rows -->
            <tr v-for="role in paginatedRoles" :key="role.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ role.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="role-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-shield-shaded text-primary text-xs"></i>
                  </div>
                  <span>{{ role.name }}</span>
                </div>
              </td>
              <td>
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs fw-semibold">
                  <i class="bi bi-key me-1"></i>
                  {{ getAssignedCount(role.id) }} Features Enabled
                </span>
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openPermsDrawer(role)"
                    title="Manage Permissions Matrix"
                  >
                    <i class="bi bi-sliders text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditRoleModal(role)"
                    title="Edit Role Name"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDeleteRole(role)"
                    title="Delete Role"
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
        v-if="filteredRoles.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredRoles.length"
      />

    </div>

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
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to permanently delete this access role?</p>
          
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
              @click="confirmDeleteRole"
            >
              <span v-if="isDeleting" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Role' }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Create / Edit Role Modal -->
    <div v-if="isRoleModalOpen" class="modal-backdrop fade show"></div>
    
    <div 
      v-if="isRoleModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      @click.self="closeRoleModal"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-shield-lock me-1.5 amms-accent"></i>
              <span>{{ editingRole ? 'Edit Access Role' : 'Add New Access Role' }}</span>
            </h5>
            <button 
              type="button" 
              class="btn-close position-absolute end-0 me-3" 
              @click="closeRoleModal"
              aria-label="Close"
            ></button>
          </div>

          <form @submit.prevent="handleSaveRole">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>

              <!-- Role Name -->
              <div class="mb-2">
                <label for="roleName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                  Role Title *
                </label>
                <div class="input-group">
                  <span class="input-group-text bg-transparent border-end-0 text-muted">
                    <i class="bi bi-shield"></i>
                  </span>
                  <input
                    id="roleName"
                    v-model="roleName"
                    type="text"
                    class="form-control border-start-0 ps-1 py-2.5 text-sm"
                    placeholder="e.g. System Officer, Finance Manager, Auditor"
                    required
                  />
                </div>
              </div>

            </div>

            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-secondary rounded-pill px-3" 
                @click="closeRoleModal"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                :disabled="isSubmitting"
              >
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Saving...' : (editingRole ? 'Update Role' : 'Save Role') }}</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>

    <!-- Permissions Matrix Modal Overlay -->
    <div v-if="isPermsDrawerOpen" class="modal-backdrop fade show"></div>
    
    <div 
      v-if="isPermsDrawerOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      @click.self="closePermsDrawer"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-sliders me-1.5 amms-accent"></i>
              <span>Permissions Matrix: {{ selectedRoleForPerms?.name }}</span>
            </h5>
            <button 
              type="button" 
              class="btn-close position-absolute end-0 me-3" 
              @click="closePermsDrawer"
              aria-label="Close"
            ></button>
          </div>

          <div class="modal-body p-4">
            <p class="text-secondary-amms text-xs mb-3">
              Select feature capabilities to grant permissions for role <strong class="text-primary">{{ selectedRoleForPerms?.name }}</strong>:
            </p>

            <div v-if="!features || features.length === 0" class="alert alert-info text-xs py-3 px-3 rounded-3 mb-0">
              <i class="bi bi-info-circle me-1"></i> No feature permissions configured yet in the system.
            </div>

            <div v-else class="row g-3">
              <div v-for="feat in features" :key="feat.id" class="col-md-6">
                <div 
                  class="p-3 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer transition-all"
                  :class="{ 'border-primary bg-primary bg-opacity-10': isFeatureSelected(feat.id) }"
                  @click="toggleFeaturePerm(feat.id)"
                >
                  <div class="d-flex align-items-center gap-2.5">
                    <i :class="isFeatureSelected(feat.id) ? 'bi bi-check-circle-fill text-primary fs-5' : 'bi bi-circle text-muted fs-5'"></i>
                    <span class="fw-semibold text-sm text-body">{{ feat.name }}</span>
                  </div>
                  <span class="badge rounded-pill text-xs" :class="isFeatureSelected(feat.id) ? 'bg-primary text-white' : 'bg-body-tertiary text-muted'">
                    {{ isFeatureSelected(feat.id) ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
            <button 
              type="button" 
              class="btn btn-sm btn-outline-secondary rounded-pill px-3" 
              @click="closePermsDrawer"
            >
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
              :disabled="isSavingPerms"
              @click="handleSavePermissions"
            >
              <span v-if="isSavingPerms" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ isSavingPerms ? 'Saving Matrix...' : 'Save Permissions' }}</span>
            </button>
          </div>

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

.role-icon-badge {
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

.cursor-pointer {
  cursor: pointer;
}
</style>
