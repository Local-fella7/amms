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


