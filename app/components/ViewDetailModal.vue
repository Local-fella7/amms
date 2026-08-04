<script setup lang="ts">
defineProps<{
  id: string
  title: string
  icon?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div class="modal-backdrop fade show" style="z-index: 1060;"></div>
  
  <div 
    :id="id" 
    class="modal fade show d-block" 
    tabindex="-1" 
    role="dialog"
    style="z-index: 1065;"
    @click.self="emit('close')"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
        
        <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
          <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
            <i v-if="icon" :class="`${icon} me-1.5 amms-accent`"></i>
            <span>{{ title }}</span>
          </h5>
          <button 
            type="button" 
            class="btn-close position-absolute end-0 me-3" 
            @click="emit('close')"
            aria-label="Close"
          ></button>
        </div>

        <div class="modal-body p-4">
          <slot />
        </div>

        <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
          <button 
            type="button" 
            class="btn btn-sm btn-outline-secondary rounded-pill px-4" 
            @click="emit('close')"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.text-sm { font-size: 0.925rem; }
</style>
