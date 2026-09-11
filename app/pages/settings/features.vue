<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

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

const { data: featuresResponse, loading, error, execute: fetchFeatures } = useApi<any>()
const { data: featureGroups, execute: fetchGroups } = useApi<FeatureGroupOption[]>()

const searchQuery = ref('')
const selectedGroupFilter = ref<string>('')

// View Modal State
const viewingFeature = ref<Feature | null>(null)
const isViewModalOpen = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

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

const openViewModal = (f: Feature) => {
  viewingFeature.value = f
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingFeature.value = null
  isViewModalOpen.value = false
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="System Features Catalog"
      subtitle="System-managed granular capabilities and functional permissions"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search capabilities or permission names..."
      :loading="loading"
      hideRefresh
    />

    <!-- System Catalog Informational Banner -->
    <div class="alert border-0 rounded-4 shadow-2xs mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 px-4 py-3" style="background-color: rgba(67, 118, 108, 0.08); color: var(--amms-primary);">
      <div class="d-flex align-items-center gap-3">
        <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-2xs" style="width: 42px; height: 42px; background-color: var(--amms-primary); color: #fff;">
          <i class="bi bi-shield-lock-fill fs-5"></i>
        </div>
        <div>
          <div class="fw-bold text-xs text-uppercase tracking-wider">System-Managed Capability Catalog</div>
          <div class="text-xs text-secondary-amms">
            Feature definitions are core system capabilities. To grant or restrict these capabilities for portal users, configure them in the Role Permissions Matrix.
          </div>
        </div>
      </div>
      <NuxtLink to="/settings/roles" class="btn btn-sm btn-primary rounded-pill px-3 py-1.5 text-xs fw-semibold shadow-2xs d-flex align-items-center gap-1.5">
        <i class="bi bi-sliders"></i> Role Permissions Matrix
      </NuxtLink>
    </div>

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
          Showing <span class="fw-bold text-primary">{{ filteredFeatures.length }}</span> capabilities
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

      
    <!-- Replaced by AppTable Component -->
    <AppTable
      :columns="[{key: 'id', label: '# ID', width: '90px', headerClass: 'ps-4', cellClass: 'ps-4 font-monospace text-muted text-xs'}, {key: 'capability-name', label: 'Capability Name', cellClass: 'fw-semibold text-primary'}, {key: 'parent-feature-module', label: 'Parent Feature Module'}, {key: 'actions', label: 'Actions', align: 'right', width: '100px', headerClass: 'pe-4', cellClass: 'pe-4'}]"
      :items="paginatedFeatures"
      :loading="loading"
      emptyIcon="bi bi-shield-slash"
      emptyTitle="No capabilities found"
      emptySubtitle="Try adjusting your filters."

    >
      <template #cell-id="{ item }">
#{{ item.id }}
      </template>
      <template #cell-capability-name="{ item }">

                <div class="d-flex align-items-center gap-2.5">
                  <div class="feat-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-key-fill text-primary text-xs"></i>
                  </div>
                  <span>{{ item.name }}</span>
                </div>
              
      </template>
      <template #cell-parent-feature-module="{ item }">

                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs">
                  <i class="bi bi-folder me-1"></i>
                  {{ item.group?.name || getGroupName(item.features_group_id) }}
                </span>
              
      </template>
      <template #cell-actions="{ item }">

                <button 
                  class="btn btn-sm btn-light border rounded-pill px-2.5 py-1 text-xs fw-semibold text-primary d-inline-flex align-items-center gap-1.5 shadow-2xs" 
                  @click="openViewModal(item)" 
                  title="View Capability Details"
                >
                  <i class="bi bi-eye-fill"></i> View
                </button>
              
      </template>
    </AppTable>

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
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Capability ID</span>
            <span class="font-monospace fw-bold text-primary text-xs">#{{ viewingFeature?.id }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Assigned Module</span>
            <span class="fw-semibold text-body text-xs">{{ viewingFeature ? (viewingFeature.group?.name || getGroupName(viewingFeature.features_group_id)) : '—' }}</span>
          </div>
          <div class="col-12">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Capability Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingFeature?.name }}</span>
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


