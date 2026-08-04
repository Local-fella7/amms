<script setup lang="ts">
defineProps<{
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}>()

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'update:itemsPerPage', size: number): void
}>()

const changePage = (page: number) => {
  if (page >= 1) {
    emit('update:currentPage', page)
  }
}
</script>

<template>
  <div class="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 px-4 py-3 border-top bg-body-tertiary">
    <!-- Items Summary Info -->
    <div class="text-xs text-secondary-amms">
      Showing <span class="fw-semibold text-primary">{{ Math.min((currentPage - 1) * itemsPerPage + 1, totalItems) }}</span>
      to <span class="fw-semibold text-primary">{{ Math.min(currentPage * itemsPerPage, totalItems) }}</span>
      of <span class="fw-semibold text-primary">{{ totalItems }}</span> entries
    </div>

    <!-- Controls: Page Size Selector & Pagination Buttons -->
    <div class="d-flex align-items-center gap-3">
      <!-- Page Size Selector -->
      <div class="d-flex align-items-center gap-2">
        <label for="pageSizeSelect" class="text-xs text-muted mb-0">Per page:</label>
        <select
          id="pageSizeSelect"
          class="form-select form-select-sm text-xs py-1 px-2.5 rounded-pill border"
          style="width: 70px;"
          :value="itemsPerPage"
          @change="emit('update:itemsPerPage', Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>

      <!-- Pagination Buttons -->
      <nav aria-label="Table navigation">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button 
              class="page-item-btn rounded-circle me-1" 
              @click="changePage(currentPage - 1)" 
              :disabled="currentPage === 1"
              title="Previous Page"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>

          <li class="page-item">
            <span class="px-2 text-xs fw-semibold text-primary">
              Page {{ currentPage }} of {{ totalPages || 1 }}
            </span>
          </li>

          <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
            <button 
              class="page-item-btn rounded-circle ms-1" 
              @click="changePage(currentPage + 1)" 
              :disabled="currentPage >= totalPages"
              title="Next Page"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.text-xs { font-size: 0.775rem; }

.page-item-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--amms-border);
  background-color: var(--amms-surface);
  color: var(--amms-text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.page-item-btn:hover:not(:disabled) {
  background-color: var(--amms-primary);
  color: #FFFFFF;
  border-color: var(--amms-primary);
}

.page-item-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
