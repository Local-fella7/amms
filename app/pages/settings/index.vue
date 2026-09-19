<script setup lang="ts">
// Automatically redirect /settings to the first settings module
await navigateTo('/settings/users', { replace: true })
</script>

<template>
  <div class="d-flex align-items-center justify-content-center p-5">
    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
    <span class="text-muted text-sm">Loading System Settings...</span>
  </div>
</template>
