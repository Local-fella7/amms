<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface UserItem {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  status?: 'active' | 'inactive' | string
  role_id: number | string
  role?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string
}

interface RoleOption {
  id: number
  name: string
}

const { data: usersResponse, loading, error, execute: fetchUsers, fetchWithAuth } = useApi<any>()
const { data: roles, execute: fetchRoles } = useApi<RoleOption[]>()

const searchQuery = ref('')
const selectedRoleFilter = ref<string>('')
const selectedStatusFilter = ref<string>('')

const isSubmitting = ref(false)
const modalError = ref('')
const editingUser = ref<UserItem | null>(null)
const isModalOpen = ref(false)

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const status = ref<'active' | 'inactive'>('active')
const password = ref('')
const roleId = ref<number | string>('')

// View Modal State
const viewingUser = ref<UserItem | null>(null)
const isViewModalOpen = ref(false)

// Delete Modal State
const itemToDelete = ref<UserItem | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const schema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  password: z.string().optional(),
  role_id: z.union([z.number(), z.string().min(1, 'Role assignment is required')])
})

const loadData = async () => {
  try {
    await Promise.all([
      fetchUsers((api) => api('/api/users')),
      fetchRoles((api) => api('/api/roles')).catch(() => [])
    ])
  } catch (err) {
    // Handled by composable
  }
}

const rawUsersList = computed<UserItem[]>(() => {
  if (!usersResponse.value) return []
  const res = usersResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const getRoleName = (rId: number | string) => {
  if (!roles.value) return `Role #${rId}`
  const found = roles.value.find(r => Number(r.id) === Number(rId))
  return found ? found.name : `Role #${rId}`
}

const filteredUsers = computed(() => {
  let result = [...rawUsersList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(u => 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      String(u.id).includes(q)
    )
  }

  if (selectedRoleFilter.value) {
    result = result.filter(u => Number(u.role_id) === Number(selectedRoleFilter.value))
  }

  // Descending sort by ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage.value) || 1)

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredUsers.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, selectedRoleFilter, itemsPerPage], () => {
  currentPage.value = 1
})

const openAddModal = () => {
  editingUser.value = null
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  phone.value = '255'
  status.value = 'active'
  password.value = ''
  roleId.value = roles.value && roles.value.length > 0 ? roles.value[0].id : ''
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (u: UserItem) => {
  editingUser.value = u
  firstName.value = u.first_name
  lastName.value = u.last_name
  email.value = u.email
  phone.value = u.phone || ''
  status.value = (u.status as any) || 'active'
  password.value = ''
  roleId.value = u.role_id
  modalError.value = ''
  isModalOpen.value = true
}

const openViewModal = (u: UserItem) => {
  viewingUser.value = u
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingUser.value = null
  isViewModalOpen.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

const handleSave = async () => {
  modalError.value = ''
  const payload: any = {
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim() || undefined,
    status: status.value,
    role_id: Number(roleId.value)
  }

  if (password.value) {
    payload.password = password.value
  } else if (!editingUser.value) {
    modalError.value = 'Password is required for new user accounts'
    push.error(modalError.value)
    return
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingUser.value) {
      await fetchWithAuth(`/api/users/${editingUser.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success('System user updated successfully!')
    } else {
      await fetchWithAuth('/api/users', {
        method: 'POST',
        body: payload
      })
      push.success('System user created successfully!')
    }
    
    closeModal()
    await loadData()
  } catch (err: any) {
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save system user'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const promptDelete = (u: UserItem) => {
  itemToDelete.value = u
  isDeleteModalOpen.value = true
}

const cancelDelete = () => {
  itemToDelete.value = null
  isDeleteModalOpen.value = false
}

const confirmDelete = async () => {
    if (!itemToDelete.value) return
    
    const success = await mutate(api => api(`/api/users/${itemToDelete.value.id}`, { method: 'DELETE' }), {
      successMessage: 'System user deleted successfully!'
    })
    
    if (success) {
      cancelDelete()
      await loadData()
    }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <PageHeader
      title="System Users"
      subtitle="Manage administrative user accounts and role assignments"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search users by name, email, phone..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="Add System User"
      @add="openAddModal"
    />

    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Top Table Toolbar with Integrated Filters -->
      <div class="card-header bg-body-tertiary border-bottom px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="text-xs fw-bold text-uppercase text-secondary-amms tracking-wider me-1">
            <i class="bi bi-funnel-fill text-primary me-1"></i> Quick Filters:
          </span>

          <div style="min-width: 170px;">
            <select 
              v-model="selectedRoleFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedRoleFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Roles</option>
              <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>

          <div style="min-width: 140px;">
            <select 
              v-model="selectedStatusFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedStatusFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button 
            v-if="selectedRoleFilter || selectedStatusFilter || searchQuery"
            type="button" 
            class="btn btn-xs btn-link text-danger text-xs text-decoration-none px-2 fw-semibold ms-1"
            @click="selectedRoleFilter = ''; selectedStatusFilter = ''; searchQuery = ''"
          >
            <i class="bi bi-x-lg me-1"></i> Clear Filters
          </button>
        </div>

        <div class="text-xs text-muted font-monospace">
          Showing <span class="fw-bold text-primary">{{ filteredUsers.length }}</span> users
        </div>
      </div>

      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading system users...</span>
      </div>

      <div v-if="error" class="alert alert-danger rounded-0 mb-0 py-3 px-4 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <span>{{ error }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-pill" @click="loadData">Retry</button>
      </div>

      
    <!-- Replaced by AppTable Component -->
    <AppTable
      :columns="[{key: 'id', label: '# ID', width: '70px', headerClass: 'ps-4', cellClass: 'ps-4 font-monospace text-muted text-xs'}, {key: 'user-name', label: 'User Name', cellClass: 'fw-semibold text-primary'}, {key: 'email-phone', label: 'Email & Phone'}, {key: 'assigned-role', label: 'Assigned Role'}, {key: 'status', label: 'Status'}, {key: 'actions', label: 'Actions', align: 'right', width: '140px', headerClass: 'pe-4', cellClass: 'pe-4'}]"
      :items="paginatedUsers"
      :loading="loading"
      emptyIcon="bi bi-person-x"
      emptyTitle="No system users found"
      emptySubtitle="Click 'Add System User' above to create one."

    >
      <template #cell-id="{ item }">
#{{ item.id }}
      </template>
      <template #cell-user-name="{ item }">

                <div class="d-flex align-items-center gap-2.5">
                  <div class="user-avatar-badge rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold text-xs">
                    {{ item.first_name ? item.first_name[0] : 'U' }}
                  </div>
                  <span>{{ item.first_name }} {{ item.last_name }}</span>
                </div>
              
      </template>
      <template #cell-email-phone="{ item }">

                <div class="text-xs font-monospace text-body">{{ item.email }}</div>
                <small v-if="item.phone" class="text-muted font-monospace text-xs">{{ item.phone }}</small>
              
      </template>
      <template #cell-assigned-role="{ item }">

                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs">
                  <i class="bi bi-shield-check me-1"></i>
                  {{ item.role?.name || getRoleName(item.role_id) }}
                </span>
              
      </template>
      <template #cell-status="{ item }">

                <span 
                  class="badge px-2.5 py-1 rounded-pill text-xs fw-semibold"
                  :class="item.status === 'inactive' ? 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-20' : 'bg-success bg-opacity-10 text-success border border-success border-opacity-20'"
                >
                  <i :class="item.status === 'inactive' ? 'bi bi-dash-circle-fill me-1' : 'bi bi-check-circle-fill me-1'"></i>
                  {{ item.status === 'inactive' ? 'Inactive' : 'Active' }}
                </span>
              
      </template>
      <template #cell-actions="{ item }">

                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn" @click="openViewModal(item)" title="View User Details">
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn" @click="openEditModal(item)" title="Edit User">
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" @click="promptDelete(item)" title="Delete User">
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              
      </template>
    </AppTable>

      <PaginationControl
        v-if="filteredUsers.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredUsers.length"
      />

    </div>

    <!-- View Detail Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewUserModal"
      title="System User Details"
      icon="bi bi-person-badge"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">User Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingUser ? `${viewingUser.first_name} ${viewingUser.last_name}` : '—' }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Email Address</span>
            <span class="fw-semibold text-body font-monospace text-xs">{{ viewingUser?.email }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Phone Number</span>
            <span class="fw-medium text-body font-monospace text-xs">{{ viewingUser?.phone || '—' }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Assigned Role</span>
            <span class="fw-semibold text-body text-xs">{{ viewingUser ? (viewingUser.role?.name || getRoleName(viewingUser.role_id)) : '—' }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Account Status</span>
            <span class="badge px-2.5 py-1 rounded-pill text-xs" :class="viewingUser?.status === 'inactive' ? 'bg-secondary text-white' : 'bg-success text-white'">
              {{ viewingUser?.status === 'inactive' ? 'Inactive' : 'Active' }}
            </span>
          </div>
          <div class="col-md-6" v-if="viewingUser?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Account Created</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingUser.created_at }}</span>
          </div>
          <div class="col-md-6" v-if="viewingUser?.updated_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Last Modified</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingUser.updated_at }}</span>
          </div>
        </div>
      </div>
    </ViewDetailModal>

    <DeleteConfirmModal
      v-model="isDeleteModalOpen"
      message="Are you sure you want to permanently delete this user?"
        :itemTitle="itemToDelete ? `&quot;${itemToDelete.name}&quot;` : ''"
      :loading="isDeleting"
      confirmText="Delete User"
      @confirm="confirmDelete"
    />

    <!-- Create / Edit Modal -->
    <div v-if="isModalOpen" class="modal-backdrop fade show"></div>
    
    <div v-if="isModalOpen" class="modal fade show d-block" tabindex="-1" role="dialog" @click.self="closeModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-person-badge me-1.5 amms-accent"></i>
              <span>{{ editingUser ? 'Edit System User' : 'Add System User' }}</span>
            </h5>
            <button type="button" class="btn-close position-absolute end-0 me-3" @click="closeModal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="handleSave">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="usrFirst" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">First Name *</label>
                  <input id="usrFirst" v-model="firstName" type="text" class="form-control py-2.5 text-sm" placeholder="e.g. John" required />
                </div>
                <div class="col-md-6">
                  <label for="usrLast" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Last Name *</label>
                  <input id="usrLast" v-model="lastName" type="text" class="form-control py-2.5 text-sm" placeholder="e.g. Doe" required />
                </div>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="usrEmail" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Email Address *</label>
                  <input id="usrEmail" v-model="email" type="email" class="form-control py-2.5 text-sm font-monospace" placeholder="john@amms.local" required />
                </div>
                <div class="col-md-6">
                  <label for="usrPhone" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Phone Number</label>
                  <input id="usrPhone" v-model="phone" type="tel" class="form-control py-2.5 text-sm font-monospace" placeholder="255700000000" />
                </div>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="usrRole" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Assigned Role *</label>
                  <select id="usrRole" v-model="roleId" class="form-select py-2.5 text-sm" required>
                    <option v-for="r in roles" :key="r.id" :value="r.id">
                      {{ r.name }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label for="usrStatus" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Account Status *</label>
                  <select id="usrStatus" v-model="status" class="form-select py-2.5 text-sm" required>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div class="mb-2">
                <label for="usrPass" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                  Password {{ editingUser ? '(Leave blank to keep unchanged)' : '*' }}
                </label>
                <input id="usrPass" v-model="password" type="password" class="form-control py-2.5 text-sm font-monospace" placeholder="••••••••" :required="!editingUser" />
              </div>
            </div>
            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Saving...' : (editingUser ? 'Update User' : 'Save User') }}</span>
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



