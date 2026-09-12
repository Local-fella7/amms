<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  members: any[]
  locations: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'dispatched'): void
}>()

const { fetchWithAuth } = useApi<any>()

const sendingReminderId = ref<number | null>(null)
const isBroadcastingAll = ref(false)
const modalError = ref('')
const currentYear = new Date().getFullYear()

// Channel state
const selectedChannel = ref<'email' | 'sms' | 'both'>('both')

// Custom message customization
const reminderMessage = ref(
  `Dear {{first_name}}, your annual membership fee for ${currentYear} is still outstanding. Kindly settle it at your earliest convenience.`
)

// Search & filter members within modal
const searchQuery = ref('')
const selectedLocationFilter = ref<string>('')
const selectedMemberIds = ref<number[]>([])

// Pagination state for handling large numbers of overdue members
const currentPage = ref(1)
const itemsPerPage = ref(8)

const getLocationName = (id: any) => props.locations.find((l: any) => Number(l.id) === Number(id))?.name ?? '—'

const filteredMembers = computed(() => {
  return props.members.filter(m => {
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
      const phone = (m.phone || '').toLowerCase()
      if (!fullName.includes(q) && !phone.includes(q)) return false
    }
    if (selectedLocationFilter.value && String(m.location_id) !== String(selectedLocationFilter.value)) {
      return false
    }
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredMembers.value.length / itemsPerPage.value) || 1)

const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredMembers.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, selectedLocationFilter, itemsPerPage], () => {
  currentPage.value = 1
})

// Bulk selection helpers
const isAllFilteredSelected = computed(() => {
  if (filteredMembers.value.length === 0) return false
  return filteredMembers.value.every(m => selectedMemberIds.value.includes(Number(m.id)))
})

const toggleSelectAllFiltered = () => {
  if (isAllFilteredSelected.value) {
    const idsToRemove = new Set(filteredMembers.value.map(m => Number(m.id)))
    selectedMemberIds.value = selectedMemberIds.value.filter(id => !idsToRemove.has(id))
  } else {
    const idsToAdd = filteredMembers.value.map(m => Number(m.id))
    selectedMemberIds.value = Array.from(new Set([...selectedMemberIds.value, ...idsToAdd]))
  }
}

const toggleMemberSelection = (id: number) => {
  const numId = Number(id)
  const idx = selectedMemberIds.value.indexOf(numId)
  if (idx > -1) {
    selectedMemberIds.value.splice(idx, 1)
  } else {
    selectedMemberIds.value.push(numId)
  }
}

// Target members to remind when hitting dispatch
const targetMembersToDispatch = computed(() => {
  if (selectedMemberIds.value.length > 0) {
    const idSet = new Set(selectedMemberIds.value)
    return filteredMembers.value.filter(m => idSet.has(Number(m.id)))
  }
  return filteredMembers.value
})

const previewMessage = (name = 'Member') => {
  return reminderMessage.value.replace(/\{\{first_name\}\}/g, name)
}

// Send reminder to a single member
const handleRemindSingle = async (m: any) => {
  sendingReminderId.value = m.id
  modalError.value = ''
  try {
    const personalizedContent = reminderMessage.value.replace(/\{\{first_name\}\}/g, m.first_name || 'Member')
    
    // 1. Create notification record
    const notifRes: any = await fetchWithAuth('/api/notifications', {
      method: 'POST',
      body: {
        name: `Fee Reminder — ${m.first_name} ${m.last_name} (${currentYear})`,
        content: personalizedContent
      }
    })

    const createdNotifId = notifRes?.data?.id || notifRes?.id
    if (createdNotifId) {
      // 2. Link member
      await fetchWithAuth('/api/notification-members', {
        method: 'POST',
        body: {
          notification_id: Number(createdNotifId),
          member_id: Number(m.id)
        }
      }).catch(() => {})

      // 3. Dispatch via selected channel
      await fetchWithAuth(`/api/notifications/${createdNotifId}/broadcast`, {
        method: 'POST',
        body: {
          channel: selectedChannel.value
        }
      }).catch(() => {})
    }

    push.success(`Reminder sent to ${m.first_name} ${m.last_name} via ${selectedChannel.value.toUpperCase()}!`)
    emit('dispatched')
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Failed to send reminder'
    modalError.value = msg
    push.error(msg)
  } finally {
    sendingReminderId.value = null
  }
}

// Dispatch reminders to target members (selected or all filtered)
const handleDispatchBatch = async () => {
  const targets = targetMembersToDispatch.value
  if (targets.length === 0) return
  isBroadcastingAll.value = true
  modalError.value = ''

  try {
    // 1. Create broadcast notification campaign
    const campaignRes: any = await fetchWithAuth('/api/notifications', {
      method: 'POST',
      body: {
        name: `Overdue Fee Reminder — ${currentYear} (${targets.length} Members)`,
        content: reminderMessage.value
      }
    })

    const campaignId = campaignRes?.data?.id || campaignRes?.id
    if (!campaignId) throw new Error('Failed to create reminder campaign')

    // 2. Link target overdue members
    let linkedCount = 0
    for (const m of targets) {
      await fetchWithAuth('/api/notification-members', {
        method: 'POST',
        body: {
          notification_id: Number(campaignId),
          member_id: Number(m.id)
        }
      }).catch(() => {})
      linkedCount++
    }

    // 3. Dispatch broadcast via selected channel
    const broadcastRes: any = await fetchWithAuth(`/api/notifications/${campaignId}/broadcast`, {
      method: 'POST',
      body: {
        channel: selectedChannel.value
      }
    }).catch(() => ({}))

    const sentCount = broadcastRes?.data?.sent ?? linkedCount
    push.success(`Reminders dispatched to ${sentCount} members via ${selectedChannel.value.toUpperCase()}!`)
    emit('dispatched')
    emit('close')
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Failed to dispatch reminders'
    modalError.value = msg
    push.error(msg)
  } finally {
    isBroadcastingAll.value = false
  }
}
</script>

<template>
  <div>
    <!-- Backdrop -->
    <div class="modal-backdrop fade show" style="z-index: 1060;" @click="emit('close')"></div>
    
    <!-- Modal Dialog -->
    <div class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index: 1065;" @click.self="emit('close')">
      <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width: 1140px;">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden d-flex flex-column modal-studio-container">
          
          <!-- Modal Header Banner -->
          <div class="modal-header border-0 px-4 py-3 bg-danger text-white d-flex align-items-center justify-content-between flex-shrink-0">
            <div class="d-flex align-items-center gap-3">
              <div class="rounded-circle p-2 bg-white bg-opacity-20 text-white d-flex align-items-center justify-content-center flex-shrink-0" style="width: 42px; height: 42px;">
                <i class="bi bi-bell-fill fs-5 text-white"></i>
              </div>
              <div>
                <h5 class="modal-title fw-bold text-white text-base mb-0">Overdue Reminders Studio</h5>
                <small class="text-white-50 text-xs">
                  {{ members.length }} active member(s) with outstanding {{ currentYear }} membership fees
                </small>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-white text-danger fw-semibold px-3 py-1.5 rounded-pill text-xs shadow-xs">
                <i class="bi bi-exclamation-triangle-fill me-1"></i>{{ members.length }} Outstanding
              </span>
              <button type="button" class="btn-close btn-close-white" @click="emit('close')" aria-label="Close"></button>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="modalError" class="alert alert-danger py-2 px-4 mb-0 rounded-0 text-xs d-flex align-items-center gap-2 border-bottom flex-shrink-0">
            <i class="bi bi-exclamation-triangle-fill text-danger fs-6"></i>
            <span>{{ modalError }}</span>
          </div>

          <!-- Studio Body: 2-Column Responsive Split -->
          <div class="modal-body p-0 overflow-y-auto overflow-x-hidden d-flex flex-column flex-grow-1">
            <div class="row g-0 flex-grow-1">
              
              <!-- LEFT COLUMN: TARGET OVERDUE MEMBERS DIRECTORY -->
              <div class="col-12 col-lg-6 border-bottom border-lg-bottom-0 border-lg-end d-flex flex-column bg-body-tertiary bg-opacity-40 p-3 p-md-4">
                
                <!-- Section Header with Select All / Clear -->
                <div class="d-flex align-items-center justify-content-between mb-3 flex-shrink-0">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge rounded-circle bg-danger text-white p-0 d-flex align-items-center justify-content-center" style="width: 22px; height: 22px; font-size: 0.75rem;">1</span>
                    <h6 class="fw-bold text-danger text-uppercase text-xs tracking-wider mb-0">
                      Overdue Members ({{ filteredMembers.length }})
                    </h6>
                  </div>
                  <div class="d-flex align-items-center gap-1.5" v-if="filteredMembers.length > 0">
                    <button
                      type="button"
                      class="btn btn-xs btn-outline-danger rounded-pill px-2.5 py-1 text-xs fw-semibold"
                      @click="toggleSelectAllFiltered"
                    >
                      <i class="bi" :class="isAllFilteredSelected ? 'bi-dash-circle' : 'bi-check-all'"></i>
                      <span class="ms-1">{{ isAllFilteredSelected ? 'Deselect All' : 'Select All' }}</span>
                    </button>
                    <button
                      v-if="selectedMemberIds.length > 0"
                      type="button"
                      class="btn btn-xs btn-outline-secondary rounded-pill px-2.5 py-1 text-xs"
                      @click="selectedMemberIds = []"
                    >
                      Clear ({{ selectedMemberIds.length }})
                    </button>
                  </div>
                </div>

                <!-- Search & Branch Filter Controls -->
                <div class="row g-2 mb-3 flex-shrink-0">
                  <div class="col-sm-7">
                    <div class="position-relative">
                      <span class="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted pointer-events-none d-flex align-items-center">
                        <i class="bi bi-search text-danger opacity-75"></i>
                      </span>
                      <input
                        type="text"
                        v-model="searchQuery"
                        class="form-control form-control-sm ps-5 pe-4 py-2 text-xs rounded-pill border bg-body shadow-2xs"
                        placeholder="Search member name or phone..."
                      />
                      <button
                        v-if="searchQuery"
                        type="button"
                        class="btn btn-link p-0 position-absolute top-50 end-0 translate-middle-y me-3 text-muted text-decoration-none border-0 d-flex align-items-center"
                        @click="searchQuery = ''"
                      >
                        <i class="bi bi-x-circle-fill text-muted"></i>
                      </button>
                    </div>
                  </div>
                  <div class="col-sm-5">
                    <select
                      v-model="selectedLocationFilter"
                      class="form-select form-select-sm py-2 text-xs rounded-pill bg-body shadow-2xs"
                    >
                      <option value="">All Branches</option>
                      <option v-for="loc in locations" :key="loc.id" :value="String(loc.id)">
                        {{ loc.name }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Scrollable Members List -->
                <div class="flex-grow-1 overflow-y-auto rounded-3 border bg-body p-2 d-flex flex-column gap-2 mb-2">
                  <div v-if="members.length === 0" class="text-center py-5 text-muted my-auto">
                    <i class="bi bi-check2-circle display-4 text-success mb-2 d-block"></i>
                    <h6 class="fw-bold text-success mb-1">All Members Up to Date!</h6>
                    <small class="text-muted text-xs">No active members have unpaid fees for {{ currentYear }}.</small>
                  </div>

                  <div v-else-if="filteredMembers.length === 0" class="text-center py-5 text-muted my-auto">
                    <i class="bi bi-funnel fs-2 text-muted mb-2 d-block"></i>
                    <p class="text-xs mb-0">No overdue members match your filter criteria.</p>
                  </div>

                  <div
                    v-else
                    v-for="m in paginatedMembers"
                    :key="m.id"
                    class="d-flex align-items-center justify-content-between p-2.5 rounded-3 border transition-all cursor-pointer"
                    :class="{
                      'bg-danger bg-opacity-10 border-danger': selectedMemberIds.includes(Number(m.id)),
                      'bg-body border-light hover-row': !selectedMemberIds.includes(Number(m.id))
                    }"
                    @click="toggleMemberSelection(Number(m.id))"
                  >
                    <div class="d-flex align-items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        class="form-check-input mt-0 flex-shrink-0 cursor-pointer"
                        :checked="selectedMemberIds.includes(Number(m.id))"
                        @click.stop="toggleMemberSelection(Number(m.id))"
                      />
                      <MemberAvatar :member="m" style="width: 38px; height: 38px; font-size: 0.78rem;" />
                      <div class="text-truncate">
                        <span class="d-block fw-semibold text-body text-xs text-truncate">
                          {{ m.first_name }} {{ m.last_name }}
                        </span>
                        <small class="text-muted text-2xs d-block text-truncate">
                          <i class="bi bi-telephone me-1"></i>{{ m.phone || 'No phone' }} • <i class="bi bi-geo-alt me-0.5"></i>{{ getLocationName(m.location_id) }}
                        </small>
                      </div>
                    </div>

                    <div class="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
                      <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0.5 rounded-pill text-2xs">
                        Unpaid
                      </span>
                      <button
                        type="button"
                        class="btn btn-xs btn-outline-danger rounded-pill px-2.5 py-1 text-2xs fw-semibold d-flex align-items-center gap-1"
                        @click.stop="handleRemindSingle(m)"
                        :disabled="sendingReminderId === m.id || isBroadcastingAll"
                        title="Send individual reminder"
                      >
                        <i class="bi" :class="sendingReminderId === m.id ? 'bi-hourglass-split spin' : 'bi-send-fill'"></i>
                        <span>{{ sendingReminderId === m.id ? '...' : 'Remind' }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Integrated Pagination Footer for Long Lists -->
                <div class="d-flex align-items-center justify-content-between pt-2 border-top flex-shrink-0 text-xs text-muted">
                  <div>
                    Showing <strong class="text-danger">{{ Math.min((currentPage - 1) * itemsPerPage + 1, filteredMembers.length) }}-{{ Math.min(currentPage * itemsPerPage, filteredMembers.length) }}</strong> of {{ filteredMembers.length }}
                  </div>

                  <div class="d-flex align-items-center gap-1.5">
                    <button
                      type="button"
                      class="btn btn-xs btn-outline-secondary rounded-circle p-0 d-flex align-items-center justify-content-center"
                      style="width: 26px; height: 26px;"
                      :disabled="currentPage === 1"
                      @click="currentPage--"
                    >
                      <i class="bi bi-chevron-left text-2xs"></i>
                    </button>
                    <span class="font-monospace text-2xs px-1">
                      {{ currentPage }} / {{ totalPages }}
                    </span>
                    <button
                      type="button"
                      class="btn btn-xs btn-outline-secondary rounded-circle p-0 d-flex align-items-center justify-content-center"
                      style="width: 26px; height: 26px;"
                      :disabled="currentPage >= totalPages"
                      @click="currentPage++"
                    >
                      <i class="bi bi-chevron-right text-2xs"></i>
                    </button>
                  </div>
                </div>

              </div>

              <!-- RIGHT COLUMN: CHANNEL SELECTION & MESSAGE COMPOSER -->
              <div class="col-12 col-lg-6 d-flex flex-column bg-body p-3 p-md-4">
                
                <!-- STEP 2: CHANNEL SELECTION -->
                <div class="mb-4">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge rounded-circle bg-danger text-white p-0 d-flex align-items-center justify-content-center" style="width: 22px; height: 22px; font-size: 0.75rem;">2</span>
                      <h6 class="fw-bold text-danger text-uppercase text-xs tracking-wider mb-0">
                        Select Delivery Channel *
                      </h6>
                    </div>
                    <span class="badge bg-body-secondary text-secondary text-2xs font-monospace">Transport</span>
                  </div>

                  <div class="row g-2">
                    <div class="col-12 col-sm-4">
                      <div 
                        class="channel-card p-2.5 rounded-3 border text-center cursor-pointer transition-all"
                        :class="selectedChannel === 'email' ? 'active-channel-card border-danger shadow-xs' : 'bg-body border'"
                        @click="selectedChannel = 'email'"
                      >
                        <i class="bi bi-envelope-fill fs-4 d-block mb-1 text-primary"></i>
                        <span class="fw-bold text-xs d-block text-body">Email</span>
                        <small class="text-muted text-2xs">SendGrid</small>
                      </div>
                    </div>

                    <div class="col-12 col-sm-4">
                      <div 
                        class="channel-card p-2.5 rounded-3 border text-center cursor-pointer transition-all"
                        :class="selectedChannel === 'sms' ? 'active-channel-card border-danger shadow-xs' : 'bg-body border'"
                        @click="selectedChannel = 'sms'"
                      >
                        <i class="bi bi-chat-text-fill fs-4 d-block mb-1 text-success"></i>
                        <span class="fw-bold text-xs d-block text-body">SMS</span>
                        <small class="text-muted text-2xs">Beem SMS</small>
                      </div>
                    </div>

                    <div class="col-12 col-sm-4">
                      <div 
                        class="channel-card p-2.5 rounded-3 border text-center cursor-pointer transition-all"
                        :class="selectedChannel === 'both' ? 'active-channel-card border-danger shadow-xs' : 'bg-body border'"
                        @click="selectedChannel = 'both'"
                      >
                        <i class="bi bi-broadcast fs-4 d-block mb-1 text-warning"></i>
                        <span class="fw-bold text-xs d-block text-body">Both</span>
                        <small class="text-muted text-2xs">Email + SMS</small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- STEP 3: MESSAGE COMPOSER -->
                <div class="mb-4">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge rounded-circle bg-danger text-white p-0 d-flex align-items-center justify-content-center" style="width: 22px; height: 22px; font-size: 0.75rem;">3</span>
                      <h6 class="fw-bold text-danger text-uppercase text-xs tracking-wider mb-0">
                        Notice Message Content *
                      </h6>
                    </div>
                    <small class="text-muted text-2xs">Use <code class="text-danger">&#123;&#123;first_name&#125;&#125;</code></small>
                  </div>

                  <textarea 
                    id="reminderMsg"
                    v-model="reminderMessage"
                    rows="4"
                    class="form-control text-xs font-monospace py-2.5"
                    placeholder="Enter reminder notice message..."
                    required
                  ></textarea>
                </div>

                <!-- LIVE PREVIEW CARD -->
                <div class="mt-auto pt-3 border-top">
                  <div class="d-flex align-items-center gap-1.5 mb-2 text-xs text-muted fw-semibold">
                    <i class="bi bi-phone text-danger"></i>
                    <span>Live Recipient Preview</span>
                  </div>

                  <div class="p-3 rounded-3 bg-body-tertiary border">
                    <div class="d-flex align-items-center justify-content-between mb-1.5">
                      <span class="badge bg-success-subtle text-success border border-success-subtle text-2xs rounded-pill">
                        <i class="bi bi-chat-dots me-1"></i>Sample Notification
                      </span>
                      <small class="text-muted text-2xs">Sample: {{ paginatedMembers[0]?.first_name || 'Member' }}</small>
                    </div>
                    <div class="p-2.5 rounded-3 bg-white border shadow-2xs text-xs text-body font-monospace" style="white-space: pre-wrap; word-break: break-word; line-height: 1.45;">
                      {{ previewMessage(paginatedMembers[0]?.first_name || 'Member') }}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
          
          <!-- Modal Action Footer -->
          <div class="modal-footer border-top px-4 py-3 bg-body-tertiary d-flex align-items-center justify-content-between flex-shrink-0" v-if="members.length > 0">
            <div class="text-xs text-muted font-monospace">
              Channel: <strong class="text-uppercase text-danger">{{ selectedChannel }}</strong> • 
              Targets: <strong class="text-danger">{{ targetMembersToDispatch.length }}</strong> 
              <span v-if="selectedMemberIds.length > 0" class="text-primary fw-semibold"> ({{ selectedMemberIds.length }} manually selected)</span>
            </div>

            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3.5 text-xs" @click="emit('close')" :disabled="isBroadcastingAll">
                Cancel
              </button>
              <button 
                type="button" 
                class="btn btn-sm btn-danger rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-2 shadow-sm" 
                @click="handleDispatchBatch"
                :disabled="isBroadcastingAll || targetMembersToDispatch.length === 0"
              >
                <span v-if="isBroadcastingAll" class="spinner-border spinner-border-sm" role="status"></span>
                <i v-else class="bi bi-broadcast"></i>
                <span>
                  {{ isBroadcastingAll ? 'Broadcasting Reminders...' : `Dispatch Reminders via ${selectedChannel.toUpperCase()} (${targetMembersToDispatch.length})` }}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.channel-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.channel-card:hover {
  border-color: #dc3545 !important;
  transform: translateY(-1px);
}

.channel-card.active-channel-card {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.08) 0%, rgba(220, 53, 69, 0.16) 100%) !important;
  border-color: #dc3545 !important;
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.14);
}

.hover-row:hover {
  border-color: rgba(220, 53, 69, 0.4) !important;
  background-color: rgba(220, 53, 69, 0.02) !important;
}

.text-2xs { font-size: 0.7rem; }
.shadow-2xs { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }

.modal-studio-container {
  height: 90vh;
  max-height: 820px;
}

@media (max-width: 991.98px) {
  .modal-studio-container {
    height: auto !important;
    max-height: 92vh !important;
  }
}

.spin { animation: sp2 1s linear infinite; }
@keyframes sp2 { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
</style>
