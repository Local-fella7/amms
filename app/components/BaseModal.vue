<script setup lang="ts">
defineProps<{
  id: string
  title: string
  loading?: boolean
  submitText?: string
}>()

const emit = defineEmits<{
  (e: 'submit'): void
}>()
</script>

<template>
  <div 
    :id="id" 
    class="modal fade" 
    tabindex="-1" 
    :aria-labelledby="`${id}Label`" 
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
        
        <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary">
          <h5 :id="`${id}Label`" class="modal-title fw-bold text-primary text-sm mb-0">
            {{ title }}
          </h5>
          <button 
            type="button" 
            class="btn-close" 
            data-bs-dismiss="modal" 
            aria-label="Close"
          ></button>
        </div>

        <form @submit.prevent="emit('submit')">
          <div class="modal-body p-4">
            <slot />
          </div>

          <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
            <button 
              type="button" 
              class="btn btn-sm btn-outline-secondary rounded-pill px-3" 
              data-bs-dismiss="modal"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2"
              :disabled="loading"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ submitText || 'Save Changes' }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  </div>
</template>

<style scoped>
.text-sm { font-size: 0.925rem; }
</style>
