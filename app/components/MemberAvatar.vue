<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Member } from '~/types'
import { resolveAssetUrl } from '~/utils/image'

const props = defineProps<{
  member?: Partial<Member> | null
}>()

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

const photoUrl = computed(() => {
  const path = getMemberPhotoPath(props.member)
  if (!path || photoError.value) return ''
  return resolveAssetUrl(path, { updatedAt: props.member?.updated_at })
})

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
      :src="photoUrl" 
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
