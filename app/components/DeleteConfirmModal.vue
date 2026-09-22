<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title?: string
  message: string
  itemTitle?: string
  loading?: boolean
  confirmText?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

const close = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div v-if="modelValue" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <!-- Modal -->
    <div 
      v-if="modelValue" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      aria-hidden="true"
      style="z-index: 1065;"
      @click.self="close"
    >
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden text-center p-4">
          
          <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 mx-auto mb-3" style="width: 56px; height: 56px;">
            <i class="bi bi-trash3-fill fs-3"></i>
          </div>

          <h5 class="fw-bold text-primary text-sm mb-1">
            {{ title || 'Confirm Deletion' }}
          </h5>

          <p class="text-secondary-amms text-xs mb-1">
            {{ message }}
          </p>

          <p v-if="itemTitle" class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1 px-2 rounded-2 d-inline-block mx-auto">
            {{ itemTitle }}
          </p>
          <div v-else class="mb-3"></div>

          <div class="d-flex align-items-center justify-content-center gap-2">
            <button 
              type="button" 
              class="btn btn-sm btn-light border rounded-pill px-3.5 text-xs fw-semibold" 
              @click="close"
            >
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-danger rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
              :disabled="loading"
              @click="emit('confirm')"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ confirmText || 'Delete Item' }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.text-xs { font-size: 0.8rem; }
.text-sm { font-size: 0.95rem; }
</style>
