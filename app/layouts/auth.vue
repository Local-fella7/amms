<template>
  <div class="auth-layout">
    <slot />
  </div>
</template>

<style scoped>
.auth-layout {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--amms-body-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

