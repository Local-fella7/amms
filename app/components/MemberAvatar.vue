<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  member: any
}>()

const config = useRuntimeConfig()
const backendBase = computed(() => {
  const api = (config.public?.apiBase as string) || ''
  return api.replace(/\/api\/?$/, '')
})

const photoError = ref(false)

const getMemberPhotoPath = (m?: any): string => {
  if (!m) return ''
  return m.photo || m.picture || m.photo_url || m.avatar || m.image || ''
}

const getMemberPhotoUrl = (pic?: string) => {
  if (!pic) return ''
  if (pic.startsWith('http') || pic.startsWith('data:') || pic.startsWith('blob:')) return pic
  const cleanPath = pic.replace(/^\/+/, '')
  const base = backendBase.value ? backendBase.value.replace(/\/+$/, '') : ''
  return base ? `${base}/${cleanPath}` : `/${cleanPath}`
}

const hasValidPhoto = computed(() => {
  return !photoError.value && !!getMemberPhotoPath(props.member)
})

const initials = computed(() => {
  if (!props.member) return 'MB'
  const f = props.member.first_name || ''
  const l = props.member.last_name || ''
  return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || 'MB'
})

const onPhotoError = () => {
  photoError.value = true
}
</script>

<template>
  <div v-if="hasValidPhoto" class="avatar-badge rounded-circle overflow-hidden d-flex align-items-center justify-content-center flex-shrink-0">
    <img 
      :src="getMemberPhotoUrl(getMemberPhotoPath(member))" 
      :alt="member?.first_name" 
      class="w-100 h-100 object-fit-cover" 
      @error="onPhotoError"
    />
  </div>
  <div v-else class="avatar-badge flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center text-primary font-monospace fw-bold text-xs">
    {{ initials }}
  </div>
</template>

<style scoped>
.avatar-badge {
  width: 42px;
  height: 42px;
  background-color: var(--bs-primary-bg-subtle, #e0f2fe);
  border: 2px solid #ffffff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}
</style>
