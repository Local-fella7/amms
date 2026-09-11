<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface FeatureGroup {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

const { data: featureGroupsResponse, loading, error, execute: fetchFeatureGroups } = useApi<any>()

const searchQuery = ref('')

// View Modal State
const viewingGroup = ref<FeatureGroup | null>(null)
const isViewModalOpen = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const loadData = async () => {
  try {
    await fetchFeatureGroups((api) => api('/api/feature-groups'))
  } catch (err) {
    // Handled by composable
  }
}

const rawGroupsList = computed<FeatureGroup[]>(() => {
  if (!featureGroupsResponse.value) return []
  const res = featureGroupsResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const filteredGroups = computed(() => {
  let result = [...rawGroupsList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(g => g.name.toLowerCase().includes(q) || String(g.id).includes(q))
  }

  // Descending sort by ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredGroups.value.length / itemsPerPage.value) || 1)

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredGroups.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
})

const openViewModal = (g: FeatureGroup) => {
  viewingGroup.value = g
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingGroup.value = null
  isViewModalOpen.value = false
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

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="Feature Module Categories"
      subtitle="System module groupings and functional capability architecture"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search module categories..."
      :loading="loading"
      hideRefresh
    />

    <!-- System Module Architecture Banner -->
    <div class="alert border-0 rounded-4 shadow-2xs mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 px-4 py-3" style="background-color: rgba(67, 118, 108, 0.08); color: var(--amms-primary);">
      <div class="d-flex align-items-center gap-3">
        <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-2xs" style="width: 42px; height: 42px; background-color: var(--amms-primary); color: #fff;">
          <i class="bi bi-folder-fill fs-5"></i>
        </div>
        <div>
          <div class="fw-bold text-xs text-uppercase tracking-wider">System Module Architecture</div>
          <div class="text-xs text-secondary-amms">
            Feature groups categorize granular capabilities across AMMS. To inspect specific capabilities within each module, visit the Features Catalog or configure Role Permissions.
          </div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <NuxtLink to="/settings/features" class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 text-xs fw-semibold shadow-2xs d-flex align-items-center gap-1.5">
          <i class="bi bi-key"></i> Features Catalog
        </NuxtLink>
        <NuxtLink to="/settings/roles" class="btn btn-sm btn-primary rounded-pill px-3 py-1.5 text-xs fw-semibold shadow-2xs d-flex align-items-center gap-1.5">
          <i class="bi bi-sliders"></i> Role Matrix
        </NuxtLink>
      </div>
    </div>

    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading feature groups...</span>
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
      :columns="[{key: 'id', label: '# ID', width: '90px', headerClass: 'ps-4', cellClass: 'ps-4 font-monospace text-muted text-xs'}, {key: 'module-category-name', label: 'Module Category Name', cellClass: 'fw-semibold text-primary'}, {key: 'registered-date', label: 'Registered Date', cellClass: 'text-xs text-secondary-amms font-monospace'}, {key: 'actions', label: 'Actions', align: 'right', width: '100px', headerClass: 'pe-4', cellClass: 'pe-4'}]"
      :items="paginatedGroups"
      :loading="loading"
      emptyIcon="bi bi-folder-x"
      emptyTitle="No feature groups found"
      emptySubtitle="Try adjusting your search filter."

    >
      <template #cell-id="{ item }">
#{{ item.id }}
      </template>
      <template #cell-module-category-name="{ item }">

                <div class="d-flex align-items-center gap-2.5">
                  <div class="group-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-folder-fill text-primary text-xs"></i>
                  </div>
                  <span>{{ item.name }}</span>
                </div>
              
      </template>
      <template #cell-registered-date="{ item }">

                {{ formatDateDisplay(item.created_at) }}
              
      </template>
      <template #cell-actions="{ item }">

                <button 
                  class="btn btn-sm btn-light border rounded-pill px-2.5 py-1 text-xs fw-semibold text-primary d-inline-flex align-items-center gap-1.5 shadow-2xs" 
                  @click="openViewModal(item)" 
                  title="View Group Details"
                >
                  <i class="bi bi-eye-fill"></i> View
                </button>
              
      </template>
    </AppTable>

      <PaginationControl
        v-if="filteredGroups.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredGroups.length"
      />

    </div>

    <!-- View Detail Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewFeatureGroupModal"
      title="Feature Group Details"
      icon="bi bi-folder"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Group ID</span>
            <span class="font-monospace fw-bold text-primary text-xs">#{{ viewingGroup?.id }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Status</span>
            <span class="badge rounded-pill bg-success-subtle text-success text-xs fw-semibold">Active Module</span>
          </div>
          <div class="col-12">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Group Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingGroup?.name }}</span>
          </div>
          <div class="col-md-6" v-if="viewingGroup?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Created At</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ formatDateDisplay(viewingGroup.created_at) }}</span>
          </div>
          <div class="col-md-6" v-if="viewingGroup?.updated_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Last Updated</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ formatDateDisplay(viewingGroup.updated_at) }}</span>
          </div>
        </div>
      </div>
    </ViewDetailModal>

  </div>
</template>

<style scoped>
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


