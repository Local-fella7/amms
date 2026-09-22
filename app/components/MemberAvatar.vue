<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Member } from '~/types'

const props = defineProps<{
  member?: Partial<Member> | null
}>()

const config = useRuntimeConfig()
const backendBase = computed(() => {
  const backendUrl = (config.public?.backendUrl as string) || ''
  if (backendUrl) return backendUrl.replace(/\/+$/, '')
  const api = (config.public?.apiBase as string) || ''
  if (/^https?:\/\//i.test(api)) {
    return api.replace(/\/api\/?$/, '')
  }
  return ''
})

const photoError = ref(false)

const getMemberPhotoPath = (m?: Partial<Member> | null): string => {
  if (!m) return ''
  return m.photo || m.picture || m.photo_url || m.avatar || ''
}

// Reset photo error when member or photo path changes
watch(
  () => [props.member?.id, getMemberPhotoPath(props.member), props.member?.updated_at],
  () => {
    photoError.value = false
  }
)

const getMemberPhotoUrl = (pic?: string) => {
  if (!pic) return ''
  if (pic.startsWith('data:') || pic.startsWith('blob:')) return pic
  let url = ''
  if (pic.startsWith('http')) {
    url = pic
  } else {
    const cleanPath = pic.replace(/^\/+/, '')
    const base = backendBase.value ? backendBase.value.replace(/\/+$/, '') : ''
    url = base ? `${base}/${cleanPath}` : `/${cleanPath}`
  }

  // Cache buster if updated_at is present so browser immediately reflects fresh uploads
  if (props.member?.updated_at) {
    const sep = url.includes('?') ? '&' : '?'
    url = `${url}${sep}v=${encodeURIComponent(props.member.updated_at)}`
  }
  return url
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
