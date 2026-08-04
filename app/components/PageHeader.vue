<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  loading?: boolean
  searchQuery?: string
  searchPlaceholder?: string
  showAddButton?: boolean
  addButtonText?: string
  hideRefresh?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'add'): void
  (e: 'refresh'): void
}>()
</script>

<template>
  <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
    <div>
      <h3 class="fw-bold text-primary mb-1">{{ title }}</h3>
      <p v-if="subtitle" class="text-secondary-amms mb-0 text-sm">{{ subtitle }}</p>
    </div>

    <div class="d-flex align-items-center gap-2">
      <!-- Search Input -->
      <div v-if="searchQuery !== undefined" class="input-group input-group-sm rounded-pill border overflow-hidden bg-body" style="width: 240px;">
        <span class="input-group-text bg-transparent border-0 text-muted ps-3">
          <i class="bi bi-search"></i>
        </span>
        <input 
          type="search" 
          class="form-control border-0 bg-transparent ps-1 text-xs shadow-none" 
          :placeholder="searchPlaceholder || 'Search...'"
          :value="searchQuery"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Refresh Button -->
      <button 
        v-if="!hideRefresh"
        class="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center" 
        style="width: 32px; height: 32px;"
        :disabled="loading"
        @click="emit('refresh')"
        title="Refresh Data"
      >
        <i class="bi bi-arrow-clockwise" :class="{ 'spin': loading }"></i>
      </button>

      <!-- Add Button -->
      <button 
        v-if="showAddButton" 
        class="btn btn-primary btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
        @click="emit('add')"
      >
        <i class="bi bi-plus-lg"></i>
        <span>{{ addButtonText || 'Add New' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
