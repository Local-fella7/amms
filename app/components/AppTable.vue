<script setup lang="ts" generic="T = Record<string, unknown>">
import { computed } from 'vue'

const props = defineProps<{
  columns: { key: string, label: string, width?: string, align?: 'left' | 'center' | 'right', headerClass?: string, cellClass?: string }[]
  items: T[]
  loading?: boolean
  emptyIcon?: string
  emptyTitle?: string
  emptySubtitle?: string
  
  // Pagination
  currentPage?: number
  itemsPerPage?: number
  totalItems?: number
  totalPages?: number
}>()

const emit = defineEmits(['update:currentPage', 'update:itemsPerPage'])

const current = computed({
  get: () => props.currentPage || 1,
  set: (val) => emit('update:currentPage', val)
})

const perPage = computed({
  get: () => props.itemsPerPage || 10,
  set: (val) => emit('update:itemsPerPage', val)
})
</script>

<template>
  <div class="w-100 position-relative">
    
    <!-- Center Loading Spinner Overlay -->
    <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
      <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Optional Toolbar (Top) -->
    <slot name="toolbar"></slot>

    <div class="table-responsive">
      <table class="table align-middle mb-0 custom-amms-table">
        <thead>
          <tr>
            <th 
              v-for="col in columns" 
              :key="col.key" 
              :style="{ width: col.width }"
              :class="[
                { 'text-end': col.align === 'right', 'text-center': col.align === 'center' },
                col.headerClass
              ]"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading Skeleton -->
          <template v-if="loading && (!items || items.length === 0)">
            <tr v-for="i in 4" :key="i">
              <td v-for="col in columns" :key="col.key" :class="col.cellClass">
                <span class="placeholder col-8 rounded-2"></span>
              </td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="items.length === 0">
            <td :colspan="columns.length" class="text-center py-5 text-muted">
              <i :class="[emptyIcon || 'bi bi-inbox', 'fs-1 d-block mb-2 text-opacity-50']"></i>
              <p class="mb-0 fw-medium">{{ emptyTitle || 'No records found' }}</p>
              <small v-if="emptySubtitle">{{ emptySubtitle }}</small>
            </td>
          </tr>

          <!-- Data Rows -->
          <template v-else>
            <tr v-for="item in items" :key="item.id">
              <td 
                v-for="col in columns" 
                :key="col.key"
                :class="[
                  { 'text-end': col.align === 'right', 'text-center': col.align === 'center' },
                  col.cellClass
                ]"
              >
                <slot :name="'cell-' + col.key" :item="item">
                  {{ item[col.key] }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Reusable Pagination Control Footer -->
    <PaginationControl
      v-if="totalItems && totalItems > 0"
      v-model:currentPage="current"
      v-model:itemsPerPage="perPage"
      :totalPages="totalPages"
      :totalItems="totalItems"
    />
  </div>
</template>




<style scoped>
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
</style>

<style>
.text-xs { font-size: 0.775rem !important; }
.text-sm { font-size: 0.875rem !important; }
</style>

