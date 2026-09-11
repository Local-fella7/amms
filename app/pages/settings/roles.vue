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

interface FeatureGroup {
  id: number
  name: string
}

interface RoleFeature {
  id: number
  role_id: number
  feature_id: number
}

const { data: roles, loading: loadingRoles, error: rolesError, execute: fetchRoles, fetchWithAuth } = useApi<Role[]>()
const { data: features, execute: fetchFeatures } = useApi<Feature[]>()
const { data: featureGroups, execute: fetchFeatureGroups } = useApi<FeatureGroup[]>()
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
const isLoadingRolePerms = ref(false)
const permsSearchQuery = ref('')

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
      fetchFeatureGroups((api) => api('/api/feature-groups')).catch(() => []),
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

const totalFeaturesCount = computed(() => features.value?.length || 0)
const grantedCount = computed(() => selectedFeatureIds.value.length)
const grantedPercentage = computed(() => {
  if (!totalFeaturesCount.value) return 0
  return Math.round((grantedCount.value / totalFeaturesCount.value) * 100)
})

const getGroupIcon = (name: string) => {
  const n = (name || '').toLowerCase()
  if (n.includes('member')) return 'bi-people-fill'
  if (n.includes('finan') || n.includes('pay') || n.includes('fee')) return 'bi-wallet2'
  if (n.includes('notif') || n.includes('comm') || n.includes('broadcast')) return 'bi-megaphone-fill'
  if (n.includes('role') || n.includes('user') || n.includes('audit') || n.includes('secur') || n.includes('system') || n.includes('admin')) return 'bi-shield-lock-fill'
  return 'bi-folder2-open'
}

const getGroupIconStyle = (name: string) => {
  const n = (name || '').toLowerCase()
  if (n.includes('member')) return { background: 'rgba(67, 118, 108, 0.15)', color: '#43766C' }
  if (n.includes('finan') || n.includes('pay') || n.includes('fee')) return { background: 'rgba(177, 148, 112, 0.22)', color: '#8c6d48' }
  if (n.includes('notif') || n.includes('comm') || n.includes('broadcast')) return { background: 'rgba(13, 162, 192, 0.16)', color: '#0aa2c0' }
  if (n.includes('role') || n.includes('user') || n.includes('audit') || n.includes('secur') || n.includes('system') || n.includes('admin')) return { background: 'rgba(118, 69, 59, 0.16)', color: '#76453B' }
  return { background: 'rgba(67, 118, 108, 0.15)', color: '#43766C' }
}

const getAssignedCount = (roleId: number) => {
  if (!roleFeatures.value) return 0
  const records = Array.isArray(roleFeatures.value) 
    ? roleFeatures.value 
    : ((roleFeatures.value as any)?.data || [])
  return records.filter((rf: any) => Number(rf.role_id || rf.roleId) === Number(roleId)).length
}

// Grouped features calculation
const groupedFeatures = computed(() => {
  if (!features.value) return []
  const groups = featureGroups.value || []
  const map = new Map<number, Feature[]>()
  const ungrouped: Feature[] = []

  for (const f of features.value) {
    const gId = Number(f.features_group_id || (f as any).feature_group_id || (f as any).featuresGroupId)
    if (gId) {
      if (!map.has(gId)) map.set(gId, [])
      map.get(gId)!.push(f)
    } else {
      ungrouped.push(f)
    }
  }

  const list: Array<{ id: number; name: string; features: Feature[] }> = []
  for (const g of groups) {
    const feats = map.get(Number(g.id)) || []
    if (feats.length > 0) {
      list.push({
        id: g.id,
        name: g.name,
        features: feats
      })
    }
  }

  if (ungrouped.length > 0) {
    list.push({
      id: 0,
      name: 'General & Core Capabilities',
      features: ungrouped
    })
  }

  if (list.length === 0 && features.value.length > 0) {
    list.push({
      id: 1,
      name: 'All Capabilities',
      features: features.value
    })
  }

  return list
})

const filteredGroupedFeatures = computed(() => {
  const groups = groupedFeatures.value
  if (!permsSearchQuery.value.trim()) return groups

  const q = permsSearchQuery.value.toLowerCase()
  return groups
    .map(grp => {
      const matched = grp.features.filter(f => f.name.toLowerCase().includes(q) || String(f.id).includes(q))
      return { ...grp, features: matched }
    })
    .filter(grp => grp.features.length > 0)
})

const selectedGroupId = ref<number | 'all'>('all')

const getGroupGrantedCount = (grp: { features: Feature[] }) => {
  if (!grp || !grp.features) return 0
  return grp.features.filter(f => selectedFeatureIds.value.includes(Number(f.id))).length
}

const activeGroupsToDisplay = computed(() => {
  if (permsSearchQuery.value.trim() || selectedGroupId.value === 'all') {
    return filteredGroupedFeatures.value
  }
  return filteredGroupedFeatures.value.filter(g => Number(g.id) === Number(selectedGroupId.value))
})

const isGroupAllSelected = (grp: { features: Feature[] }) => {
  if (!grp.features.length) return false
  return grp.features.every(f => selectedFeatureIds.value.includes(Number(f.id)))
}

const isGroupPartiallySelected = (grp: { features: Feature[] }) => {
  if (!grp.features.length) return false
  const count = grp.features.filter(f => selectedFeatureIds.value.includes(Number(f.id))).length
  return count > 0 && count < grp.features.length
}

const toggleGroupSelection = (grp: { features: Feature[] }) => {
  const allSelected = isGroupAllSelected(grp)
  const grpIds = grp.features.map(f => Number(f.id))
  if (allSelected) {
    selectedFeatureIds.value = selectedFeatureIds.value.filter(id => !grpIds.includes(id))
  } else {
    selectedFeatureIds.value = Array.from(new Set([...selectedFeatureIds.value, ...grpIds]))
  }
}

const selectAllFeatures = () => {
  if (!features.value) return
  selectedFeatureIds.value = features.value.map(f => Number(f.id))
}

const deselectAllFeatures = () => {
  selectedFeatureIds.value = []
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
  permsSearchQuery.value = ''
  selectedGroupId.value = 'all'
  selectedFeatureIds.value = []
  isLoadingRolePerms.value = true
  isPermsDrawerOpen.value = true
  
  try {
    // 1. Direct role features endpoint: GET /api/roles/{id}/features
    const res: any = await fetchWithAuth(`/api/roles/${role.id}/features`).catch(() => null)
    
    let ids: number[] = []
    if (Array.isArray(res)) {
      ids = res.map((x: any) => typeof x === 'number' ? x : Number(x.id || x.feature_id))
    } else if (Array.isArray(res?.data)) {
      ids = res.data.map((x: any) => typeof x === 'number' ? x : Number(x.id || x.feature_id))
    } else if (Array.isArray(res?.data?.feature_ids)) {
      ids = res.data.feature_ids.map(Number)
    } else {
      // Fallback: global roleFeatures filter
      const allRf = Array.isArray(roleFeatures.value) ? roleFeatures.value : ((roleFeatures.value as any)?.data || [])
      ids = allRf
        .filter((rf: any) => Number(rf.role_id || rf.roleId) === Number(role.id))
        .map((rf: any) => Number(rf.feature_id || rf.featureId || rf.id))
    }

    selectedFeatureIds.value = ids.filter(id => Boolean(id) && !isNaN(id))
  } catch (err) {
    console.error('Error fetching role features:', err)
  } finally {
    isLoadingRolePerms.value = false
  }
}

const closePermsDrawer = () => {
  isPermsDrawerOpen.value = false
  selectedRoleForPerms.value = null
  permsSearchQuery.value = ''
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
    const roleId = Number(selectedRoleForPerms.value.id)
    
    // Single atomic batch call: POST /api/role-features
    await fetchWithAuth('/api/role-features', {
      method: 'POST',
      body: {
        role_id: roleId,
        feature_ids: selectedFeatureIds.value.map(Number)
      }
    })

    push.success(`Permissions for role "${selectedRoleForPerms.value.name}" saved successfully!`)
    closePermsDrawer()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Failed to update permissions matrix'
    push.error(msg)
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

      
    <!-- Replaced by AppTable Component -->
    <AppTable
      :columns="[{key: 'id', label: '# ID', width: '90px', headerClass: 'ps-4', cellClass: 'ps-4 font-monospace text-muted text-xs'}, {key: 'role-name', label: 'Role Name', cellClass: 'fw-semibold text-primary'}, {key: 'granted-permissions', label: 'Granted Permissions'}, {key: 'actions', label: 'Actions', align: 'right', width: '180px', headerClass: 'pe-4', cellClass: 'pe-4'}]"
      :items="paginatedRoles"
      :loading="loadingRoles"
      emptyIcon="bi bi-shield-lock"
      emptyTitle="No system roles found"
      emptySubtitle="Click 'New Role' above to create an access control role."

    >
      <template #cell-id="{ item }">
#{{ item.id }}
      </template>
      <template #cell-role-name="{ item }">

                <div class="d-flex align-items-center gap-2.5">
                  <div class="item-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-shield-shaded text-primary text-xs"></i>
                  </div>
                  <span>{{ item.name }}</span>
                </div>
              
      </template>
      <template #cell-granted-permissions="{ item }">

                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs fw-semibold">
                  <i class="bi bi-shield-check me-1"></i>
                  {{ getAssignedCount(item.id) }} / {{ totalFeaturesCount }} Features
                </span>
              
      </template>
      <template #cell-actions="{ item }">

                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openPermsDrawer(item)"
                    title="Manage Permissions Matrix"
                  >
                    <i class="bi bi-sliders text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditRoleModal(item)"
                    title="Edit Role Name"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDeleteRole(item)"
                    title="Delete Role"
                  >
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              
      </template>
    </AppTable>

      <!-- Reusable Pagination Control Footer -->
      <PaginationControl
        v-if="filteredRoles.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredRoles.length"
      />

    </div>

    <DeleteConfirmModal
      v-model="isDeleteModalOpen"
      message="Are you sure you want to permanently delete this access role?"
        :itemTitle="itemToDelete ? `&quot;${itemToDelete.name}&quot;` : ''"
      :loading="isDeleting"
      confirmText="Delete Role"
      @confirm="confirmDelete"
    />

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

    <!-- Centered Permissions Matrix Modal Backdrop -->
    <div 
      v-if="isPermsDrawerOpen" 
      class="modal-backdrop fade show"
      style="z-index: 1060;"
      @click="closePermsDrawer"
    ></div>

    <!-- Centered Permissions Matrix Modal Dialog -->
    <div 
      v-if="isPermsDrawerOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      style="z-index: 1065;"
      @click.self="closePermsDrawer"
    >
      <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden" style="max-height: 90vh;">

          <!-- Executive Modal Header -->
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary flex-column align-items-stretch flex-shrink-0">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center gap-3">
                <div class="role-icon-badge rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-2xs" style="width: 44px; height: 44px; background-color: var(--amms-primary); color: #FFFFFF;">
                  <i class="bi bi-shield-lock-fill fs-4"></i>
                </div>
                <div>
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge rounded-pill text-uppercase px-2.5 py-1 text-xs fw-bold tracking-wider shadow-2xs" style="background-color: var(--amms-primary); color: #fff;">
                      {{ selectedRoleForPerms?.name }}
                    </span>
                    <span class="text-xs text-muted font-monospace">ID #{{ selectedRoleForPerms?.id }}</span>
                  </div>
                  <h4 class="fw-bold mb-0 text-primary fs-5">
                    Role Permissions &mdash; {{ selectedRoleForPerms?.name }}
                  </h4>
                </div>
              </div>

              <button 
                type="button" 
                class="btn-close" 
                @click="closePermsDrawer" 
                aria-label="Close"
              ></button>
            </div>

            <!-- Coverage Progress Bar & Metric -->
            <div class="coverage-bar-container bg-body rounded-3 p-3 border shadow-2xs">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="text-xs fw-semibold text-body d-flex align-items-center gap-2">
                  <i class="bi bi-shield-check text-primary fs-6"></i>
                  <span>System Capability Coverage:</span> 
                  <strong class="text-primary">{{ grantedCount }}</strong> of {{ totalFeaturesCount }} Granted
                </span>
                <span class="badge rounded-pill fw-bold text-xs px-2.5 py-1" :class="grantedPercentage > 0 ? 'bg-primary text-white' : 'bg-body-secondary text-muted'">
                  {{ grantedPercentage }}% Active
                </span>
              </div>
              <div class="progress-bar-track" style="height: 7px;">
                <div class="progress-bar-fill" :style="{ width: `${grantedPercentage}%` }"></div>
              </div>
            </div>
          </div>

          <!-- Modal Body: Two-Sided Master-Detail Split Layout -->
          <div class="modal-body p-0 d-flex flex-row overflow-hidden" style="height: 70vh; min-height: 580px;">
            
            <!-- Left Side: Modules & Categories Sidebar -->
            <div class="category-sidebar d-flex flex-column border-end bg-body-tertiary flex-shrink-0" style="width: 330px;">
              <!-- Search Box -->
              <div class="p-3 border-bottom bg-body">
                <div class="input-group input-group-sm rounded-pill border overflow-hidden bg-body shadow-2xs">
                  <span class="input-group-text bg-transparent border-0 text-muted ps-3">
                    <i class="bi bi-search"></i>
                  </span>
                  <input 
                    v-model="permsSearchQuery" 
                    type="search" 
                    class="form-control border-0 bg-transparent ps-1 text-xs shadow-none py-1.5" 
                    placeholder="Filter capabilities..." 
                  />
                  <button 
                    v-if="permsSearchQuery" 
                    class="btn bg-transparent border-0 text-muted text-xs pe-3" 
                    @click="permsSearchQuery = ''"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Categories Navigation List -->
              <div class="category-list overflow-y-auto flex-grow-1 p-3">
                <!-- All Categories Option -->
                <button
                  type="button"
                  class="category-nav-item w-100 text-start border-0 rounded-3 px-3.5 py-3 mb-2 d-flex align-items-center justify-content-between transition-all"
                  :class="{ 'active-category': selectedGroupId === 'all' }"
                  @click="selectedGroupId = 'all'"
                >
                  <div class="d-flex align-items-center gap-3 overflow-hidden">
                    <div class="category-icon-box" style="background-color: rgba(67, 118, 108, 0.12); color: #43766C;">
                      <i class="bi bi-grid-fill fs-6"></i>
                    </div>
                    <div class="text-truncate">
                      <div class="fw-bold text-xs mb-0.5">All Categories</div>
                      <div class="text-xs opacity-75">{{ totalFeaturesCount }} capabilities</div>
                    </div>
                  </div>
                  <span 
                    class="badge rounded-pill font-monospace text-xs px-2.5 py-1" 
                    :class="selectedGroupId === 'all' ? 'bg-white text-primary fw-bold' : 'bg-body border text-muted'"
                  >
                    {{ grantedCount }}/{{ totalFeaturesCount }}
                  </span>
                </button>

                <div class="px-2 my-2.5 text-uppercase text-xs fw-bold tracking-wider text-muted opacity-75" style="font-size: 0.68rem;">
                  Feature Modules
                </div>

                <!-- Individual Module Categories -->
                <button
                  v-for="grp in filteredGroupedFeatures"
                  :key="grp.id"
                  type="button"
                  class="category-nav-item w-100 text-start border-0 rounded-3 px-3.5 py-3 mb-2 d-flex align-items-center justify-content-between transition-all"
                  :class="{ 'active-category': selectedGroupId === grp.id }"
                  @click="selectedGroupId = grp.id"
                >
                  <div class="d-flex align-items-center gap-3 overflow-hidden pe-1">
                    <div class="category-icon-box" :style="getGroupIconStyle(grp.name)">
                      <i :class="`bi ${getGroupIcon(grp.name)} fs-6`"></i>
                    </div>
                    <div class="text-truncate">
                      <div class="fw-bold text-xs text-truncate mb-0.5">{{ grp.name }}</div>
                      <div class="text-xs opacity-75">{{ grp.features.length }} capabilities</div>
                    </div>
                  </div>
                  <span 
                    class="badge rounded-pill font-monospace text-xs flex-shrink-0 px-2.5 py-1"
                    :class="selectedGroupId === grp.id ? 'bg-white text-primary fw-bold' : (getGroupGrantedCount(grp) > 0 ? 'bg-primary-subtle text-primary fw-semibold' : 'bg-body border text-muted')"
                  >
                    {{ getGroupGrantedCount(grp) }}/{{ grp.features.length }}
                  </span>
                </button>
              </div>

              <!-- Quick Bulk Actions in Sidebar -->
              <div class="p-3 border-top bg-body d-flex align-items-center gap-2.5">
                <button 
                  type="button" 
                  class="btn btn-sm btn-outline-primary rounded-pill flex-fill py-1.5 text-xs fw-semibold shadow-2xs d-flex align-items-center justify-content-center gap-1.5"
                  @click="selectAllFeatures"
                >
                  <i class="bi bi-check2-all"></i> Grant All
                </button>
                <button 
                  type="button" 
                  class="btn btn-sm btn-outline-secondary rounded-pill flex-fill py-1.5 text-xs fw-semibold d-flex align-items-center justify-content-center gap-1.5"
                  @click="deselectAllFeatures"
                >
                  <i class="bi bi-x-circle"></i> Clear All
                </button>
              </div>
            </div>

            <!-- Right Side: Capabilities Detail Panel -->
            <div class="capabilities-detail flex-grow-1 bg-body overflow-y-auto p-4 p-xl-5">
              
              <!-- Loading State -->
              <div v-if="isLoadingRolePerms" class="text-center py-5">
                <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
                  <span class="visually-hidden">Loading role permissions...</span>
                </div>
                <p class="text-xs fw-semibold text-primary mt-2.5 mb-0">Fetching role permissions matrix...</p>
              </div>

              <!-- Empty State -->
              <div v-else-if="activeGroupsToDisplay.length === 0" class="text-center py-5 text-muted">
                <i class="bi bi-filter-circle fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No matching capabilities found</p>
                <small v-if="permsSearchQuery">Try adjusting your search filter.</small>
                <small v-else>No features found in this category.</small>
              </div>

              <!-- Active Categories & Capabilities -->
              <div v-else class="d-flex flex-column gap-4">
                <div 
                  v-for="grp in activeGroupsToDisplay" 
                  :key="grp.id"
                  class="category-detail-section bg-body rounded-4 border p-4 shadow-2xs mb-4"
                >
                  <!-- Section Header with Group Info & Master Switch -->
                  <div class="d-flex align-items-center justify-content-between pb-3 mb-4 border-bottom">
                    <div class="d-flex align-items-center gap-3">
                      <div class="category-icon-box" :style="getGroupIconStyle(grp.name)" style="width: 40px; height: 40px;">
                        <i :class="`bi ${getGroupIcon(grp.name)} fs-5`"></i>
                      </div>
                      <div>
                        <h5 class="fw-bold fs-6 mb-1 text-primary">{{ grp.name }}</h5>
                        <span class="text-xs text-secondary-amms font-monospace">
                          {{ getGroupGrantedCount(grp) }} of {{ grp.features.length }} capabilities granted
                        </span>
                      </div>
                    </div>

                    <!-- Master Category Toggle -->
                    <div class="form-check form-switch mb-0 d-flex align-items-center gap-2">
                      <input 
                        class="form-check-input cursor-pointer" 
                        type="checkbox" 
                        :id="`group-switch-${grp.id}`"
                        :checked="isGroupAllSelected(grp)"
                        @change="toggleGroupSelection(grp)"
                        style="width: 2.25rem; height: 1.25rem;"
                      />
                      <label 
                        :for="`group-switch-${grp.id}`" 
                        class="form-check-label text-xs fw-semibold text-secondary-amms cursor-pointer user-select-none"
                      >
                        {{ isGroupAllSelected(grp) ? 'All Enabled' : (isGroupPartiallySelected(grp) ? 'Partial' : 'Enable All') }}
                      </label>
                    </div>
                  </div>

                  <!-- Spacious 2-Column Capability Grid -->
                  <div class="row gy-3 gx-3" style="row-gap: 14px;">
                    <div 
                      v-for="feat in grp.features" 
                      :key="feat.id"
                      class="col-12 col-xl-6"
                    >
                      <div 
                        class="capability-tile px-3.5 py-3 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer transition-all"
                        :class="{ 'active-tile': isFeatureSelected(feat.id) }"
                        @click="toggleFeaturePerm(feat.id)"
                        style="min-height: 64px;"
                      >
                        <div class="d-flex align-items-center gap-3 overflow-hidden pe-2">
                          <i 
                            :class="isFeatureSelected(feat.id) ? 'bi bi-check-circle-fill text-primary fs-4' : 'bi bi-circle text-muted fs-4 opacity-50'"
                          ></i>
                          <div class="overflow-hidden">
                            <span class="fw-medium text-sm text-body text-truncate d-block" :title="feat.name">
                              {{ feat.name }}
                            </span>
                          </div>
                        </div>
                        <span 
                          class="badge rounded-pill font-monospace text-xs flex-shrink-0 px-2.5 py-1"
                          :class="isFeatureSelected(feat.id) ? 'bg-primary text-white' : 'bg-body-secondary text-muted border'"
                        >
                          #{{ feat.id }}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>

          <!-- Sticky Modal Footer -->
          <div class="modal-footer border-top px-4 py-3 bg-body-tertiary d-flex align-items-center justify-content-between flex-shrink-0">
            <div class="text-xs text-secondary-amms">
              <i class="bi bi-info-circle text-primary me-1"></i>
              Changes take effect immediately upon saving.
            </div>

            <div class="d-flex align-items-center gap-2">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-secondary rounded-pill px-3.5" 
                @click="closePermsDrawer"
                :disabled="isSavingPerms"
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
                <i v-else class="bi bi-shield-check"></i>
                <span>{{ isSavingPerms ? 'Saving Permissions...' : 'Save Permissions' }}</span>
              </button>
            </div>
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
  background-color: rgba(67, 118, 108, 0.1);
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

/* Progress Bar Track */
.progress-bar-track {
  height: 6px;
  border-radius: 999px;
  background-color: rgba(67, 118, 108, 0.12);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #43766C, #5fa396);
  border-radius: 999px;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.group-icon-box,
.category-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-nav-item {
  background: transparent;
  color: var(--bs-body-color);
  transition: all 0.15s ease-in-out;
}

.category-nav-item:hover {
  background-color: rgba(67, 118, 108, 0.08);
}

.category-nav-item.active-category {
  background-color: var(--amms-primary, #43766C) !important;
  color: #FFFFFF !important;
  box-shadow: 0 4px 12px rgba(67, 118, 108, 0.25);
}

.category-nav-item.active-category .category-icon-box {
  background-color: rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
}

.category-detail-section {
  border-color: rgba(67, 118, 108, 0.14) !important;
}

.group-perm-card {
  border-color: rgba(67, 118, 108, 0.16) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.group-perm-card:hover {
  border-color: rgba(67, 118, 108, 0.32) !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05) !important;
}

.capability-tile {
  background-color: var(--bs-body-bg);
  border: 1px solid rgba(0, 0, 0, 0.09) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.capability-tile:hover {
  border-color: var(--amms-primary, #43766C) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(67, 118, 108, 0.1);
}

.capability-tile.active-tile {
  background: linear-gradient(135deg, rgba(67, 118, 108, 0.08) 0%, rgba(67, 118, 108, 0.16) 100%) !important;
  border-color: var(--amms-primary, #43766C) !important;
  box-shadow: 0 2px 8px rgba(67, 118, 108, 0.14);
}

.shadow-2xs {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
</style>



