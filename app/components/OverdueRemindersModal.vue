<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  members: any[]
  locations: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'remind', memberId: number): void
  (e: 'remind-all', memberIds: number[]): void
}>()

const sendingReminderId = ref<number | null>(null)
const sendingAll = ref(false)

const getLocationName = (id: any) => props.locations.find((l: any) => Number(l.id) === Number(id))?.name ?? '—'

const handleRemind = async (m: any) => {
  sendingReminderId.value = m.id
  emit('remind', m.id)
  setTimeout(() => { sendingReminderId.value = null }, 1500)
}

const handleRemindAll = async () => {
  sendingAll.value = true
  emit('remind-all', props.members.map(m => m.id))
  setTimeout(() => { sendingAll.value = false }, 2000)
}
</script>

<template>
  <div>
    <div class="modal-backdrop fade show" style="z-index: 1050;" @click="emit('close')"></div>
    <div class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg rounded-4">
          <div class="modal-header border-bottom-0 pb-0 pt-4 px-4">
            <div class="d-flex align-items-center gap-3">
              <div class="bg-danger bg-opacity-10 text-danger p-2 rounded-3 d-flex align-items-center justify-content-center">
                <i class="bi bi-bell-fill fs-5"></i>
              </div>
              <div>
                <h5 class="modal-title fw-bold text-dark mb-0">Overdue Reminders</h5>
                <p class="text-muted small mb-0">{{ members.length }} members with outstanding fees</p>
              </div>
            </div>
            <button type="button" class="btn-close" @click="emit('close')"></button>
          </div>
          
          <div class="modal-body p-4">
            <div v-if="members.length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-check2-circle display-4 text-success mb-3 d-block"></i>
              <p>All members are up to date on their fees!</p>
            </div>
            
            <div v-else class="list-group list-group-flush rounded-3 border">
              <div v-for="m in members" :key="m.id" class="list-group-item d-flex justify-content-between align-items-center p-3">
                <div class="d-flex align-items-center gap-3">
                  <MemberAvatar :member="m" style="width: 45px; height: 45px;" />
                  <div>
                    <h6 class="mb-0 fw-semibold">{{ m.first_name }} {{ m.last_name }}</h6>
                    <small class="text-muted d-flex align-items-center gap-2">
                      <i class="bi bi-geo-alt"></i> {{ getLocationName(m.location_id) }}
                      <span class="text-muted opacity-50">|</span>
                      <i class="bi bi-telephone"></i> {{ m.phone || 'No phone' }}
                    </small>
                  </div>
                </div>
                <button 
                  class="btn btn-sm btn-outline-danger rounded-pill px-3 d-flex align-items-center gap-2"
                  @click="handleRemind(m)"
                  :disabled="sendingReminderId === m.id || sendingAll"
                >
                  <i class="bi" :class="sendingReminderId === m.id ? 'bi-hourglass-split spin' : 'bi-send'"></i>
                  {{ sendingReminderId === m.id ? 'Sending...' : 'Remind' }}
                </button>
              </div>
            </div>
          </div>
          
          <div class="modal-footer border-top-0 pt-0 pb-4 px-4" v-if="members.length > 0">
            <button type="button" class="btn btn-light rounded-pill px-4" @click="emit('close')">Close</button>
            <button 
              type="button" 
              class="btn btn-danger rounded-pill px-4 d-flex align-items-center gap-2" 
              @click="handleRemindAll"
              :disabled="sendingAll"
            >
              <i class="bi" :class="sendingAll ? 'bi-hourglass-split spin' : 'bi-broadcast'"></i>
              {{ sendingAll ? 'Sending to all...' : 'Remind All (' + members.length + ')' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spin { animation: sp2 1s linear infinite; }
@keyframes sp2 { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
</style>
