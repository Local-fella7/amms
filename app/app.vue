<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- Notivue Toast Notifications Viewport -->
  <ClientOnly>
    <Notivue v-slot="item">
      <Notification :item="item" />
    </Notivue>
  </ClientOnly>
</template>

<style>
/* VueDatePicker Custom Civic Navy Theme Overrides */
.dp__main {
  --dp-font-family: var(--bs-font-sans-serif);
  --dp-border-radius: 0.75rem;
  --dp-cell-border-radius: 0.5rem;
  --dp-primary-color: var(--amms-primary);
  --dp-primary-text-color: #ffffff;
  --dp-border-color: rgba(27, 42, 74, 0.18);
  --dp-menu-border-color: rgba(27, 42, 74, 0.15);
  --dp-action-button-height: 32px;
}

.dp__input {
  font-size: 0.875rem !important;
  padding-top: 0.45rem !important;
  padding-bottom: 0.45rem !important;
  border-radius: 0.5rem !important;
}

.dp__theme_light {
  --dp-background-color: #ffffff;
  --dp-text-color: var(--amms-primary);
}
</style>
