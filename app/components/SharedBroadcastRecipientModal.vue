<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

interface NotificationOption {
  id: number
  name: string
  content?: string
  notification_template_id?: number | string
}

interface NotificationTemplateOption {
  id: number
  name: string
  content: string
}

interface MemberOption {
  id: number
  first_name: string
  last_name: string
  phone?: string
  gender?: string
  location_id?: number | string
  member_status?: string
  fee_exemption?: string
  location?: {
    id: number
    name: string
  }
}

interface LocationOption {
  id: number
  name: string
}

const { fetchWithAuth } = useApi<any>()
const { data: notifications, execute: fetchNotifications } = useApi<NotificationOption[]>()
const { data: templates, execute: fetchTemplates } = useApi<NotificationTemplateOption[]>()
const { data: members, execute: fetchMembers } = useApi<MemberOption[]>()
const { data: locations, execute: fetchLocations } = useApi<LocationOption[]>()
const { data: payments, execute: fetchPayments } = useApi<any[]>()
const { data: notificationMembersResponse, execute: fetchNotificationMembers } = useApi<any>()

const isSubmitting = ref(false)
const isBroadcasting = ref(false)
const modalError = ref('')

// Form / 2-Column Modal State
const notificationId = ref<number | string>('')
const selectedTemplateId = ref<number | string>('')
const messageContent = ref('')
const selectedMemberIds = ref<number[]>([])

// Broadcast Dispatch Channel State
const broadcastChannel = ref<'email' | 'sms' | 'both'>('both')

// Left Column Filters
const memberFilterSearch = ref('')
const memberFilterLocation = ref<string>('')
const audienceFilter = ref<'all' | 'active' | 'inactive' | 'deceased' | 'outstanding'>('all')

const availablePlaceholders = [
  { tag: '{{first_name}}', label: 'First Name' },
  { tag: '{{last_name}}', label: 'Last Name' },
  { tag: '{{fee_year}}', label: 'Fee Year' },
  { tag: '{{phone}}', label: 'Phone' },
  { tag: '{{outstanding_balance}}', label: 'Outstanding Balance' }
]

const loadData = async () => {
  try {
    await Promise.all([
      fetchNotifications((api) => api('/api/notifications')).catch(() => []),
      fetchTemplates((api) => api('/api/notification-templates')).catch(() => []),
      fetchMembers((api) => api('/api/members')).catch(() => []),
      fetchLocations((api) => api('/api/locations')).catch(() => []),
      fetchPayments((api) => api('/api/fee-payments')).catch(() => []),
      fetchNotificationMembers((api) => api('/api/notification-members')).catch(() => [])
    ])

    if (notifications.value && notifications.value.length > 0) {
      notificationId.value = notifications.value[0].id
      if (notifications.value[0].content) {
        messageContent.value = notifications.value[0].content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
      }
    }
  } catch (err) {
    // handled
  }
}

onMounted(loadData)

const rawNotificationMembers = computed<any[]>(() => {
  if (!notificationMembersResponse.value) return []
  const res = notificationMembersResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const getNotificationTitle = (nId: number | string) => {
  if (!notifications.value) return `Broadcast #${nId}`
  const found = notifications.value.find(n => Number(n.id) === Number(nId))
  return found ? found.name : `Broadcast #${nId}`
}

const getLocationName = (locId?: number | string) => {
  if (!locId || !locations.value) return 'Main Branch'
  const found = locations.value.find(l => Number(l.id) === Number(locId))
  return found ? found.name : 'Branch'
}

const currentYear = new Date().getFullYear()

const paidMemberIds = computed(() => {
  const ids = new Set<number>()
  const list = Array.isArray(payments.value) ? payments.value : (payments.value?.data || [])
  list.forEach((p: any) => {
    if ((p.date || p.created_at || '').startsWith(String(currentYear))) {
      ids.add(Number(p.member_id))
    }
  })
  return ids
})

const isMemberOutstanding = (m: MemberOption) => {
  return (m.member_status || 'active') === 'active' && m.fee_exemption !== 'yes' && !paidMemberIds.value.has(Number(m.id))
}

// Left Column Filtering for Available Members
const availableFilteredMembers = computed(() => {
  if (!members.value) return []
  return members.value.filter(m => {
    if (memberFilterSearch.value.trim()) {
      const q = memberFilterSearch.value.toLowerCase()
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
      const phone = (m.phone || '').toLowerCase()
      if (!fullName.includes(q) && !phone.includes(q)) return false
    }
    if (memberFilterLocation.value && String(m.location_id) !== String(memberFilterLocation.value)) {
      return false
    }
    if (audienceFilter.value === 'active') {
      if ((m.member_status || 'active') !== 'active') return false
    } else if (audienceFilter.value === 'inactive') {
      if (m.member_status !== 'inactive') return false
    } else if (audienceFilter.value === 'deceased') {
      if (m.member_status !== 'deceased') return false
    } else if (audienceFilter.value === 'outstanding') {
      if (!isMemberOutstanding(m)) return false
    }
    return true
  })
})

// Members assigned to the currently selected broadcast
const assignedMemberIdsForCurrentBroadcast = computed(() => {
  if (!notificationId.value) return new Set<number>()
  return new Set(
    rawNotificationMembers.value
      .filter(item => Number(item.notification_id) === Number(notificationId.value))
      .map(item => Number(item.member_id))
  )
})

const isMemberAlreadyAssigned = (mId: number) => {
  return assignedMemberIdsForCurrentBroadcast.value.has(Number(mId))
}

const toggleMemberSelection = (id: number) => {
  const idx = selectedMemberIds.value.indexOf(id)
  if (idx > -1) {
    selectedMemberIds.value.splice(idx, 1)
  } else {
    selectedMemberIds.value.push(id)
  }
}

const selectAllFiltered = () => {
  const ids = availableFilteredMembers.value
    .filter(m => !isMemberAlreadyAssigned(Number(m.id)))
    .map(m => Number(m.id))
  selectedMemberIds.value = Array.from(new Set([...selectedMemberIds.value, ...ids]))
}

const clearAllSelected = () => {
  selectedMemberIds.value = []
}

const previewSampleMessage = computed(() => {
  if (!messageContent.value) return 'Type message or select a template to preview...'
  return messageContent.value
    .replace(/\{\{first_name\}\}/g, 'Halima')
    .replace(/\{\{last_name\}\}/g, 'Said')
    .replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
    .replace(/\{\{phone\}\}/g, '+255 711 222 333')
    .replace(/\{\{outstanding_balance\}\}/g, 'TZS 50,000')
})

const smsCharCount = computed(() => messageContent.value.length)
const smsSegmentCount = computed(() => Math.ceil(messageContent.value.length / 160) || 1)

// Auto-fill message content when broadcast or template changes
watch(notificationId, (newNotifId) => {
  if (!newNotifId || !notifications.value) return
  const found = notifications.value.find(n => Number(n.id) === Number(newNotifId))
  if (found && found.content && !messageContent.value) {
    messageContent.value = found.content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
  }
})

watch(selectedTemplateId, (newTmplId) => {
  if (!newTmplId || !templates.value) return
  const found = templates.value.find(t => Number(t.id) === Number(newTmplId))
  if (found && found.content) {
    messageContent.value = found.content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
  }
})

const insertPlaceholder = (tag: string) => {
  const valueToInsert = tag === '{{fee_year}}' ? String(new Date().getFullYear()) : tag
  messageContent.value = messageContent.value ? `${messageContent.value} ${valueToInsert} ` : `${valueToInsert} `
}

const handleSaveBatch = async (alsoBroadcast = false) => {
  modalError.value = ''
  
  if (!notificationId.value) {
    modalError.value = 'Please select a broadcast campaign'
    push.error(modalError.value)
    return
  }

  if (selectedMemberIds.value.length === 0) {
    modalError.value = 'Please select at least one recipient member from the left column'
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  if (alsoBroadcast) isBroadcasting.value = true

  try {
    // 1. If message content was edited or selected from template, update broadcast content
    if (notificationId.value && messageContent.value.trim()) {
      const currentNotif = notifications.value?.find(n => Number(n.id) === Number(notificationId.value))
      const sanitizedContent = messageContent.value.trim().replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
      if (currentNotif && currentNotif.content !== sanitizedContent) {
        await fetchWithAuth(`/api/notifications/${notificationId.value}`, {
          method: 'PUT',
          body: {
            name: currentNotif.name ? currentNotif.name.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear())) : `Broadcast #${notificationId.value}`,
            content: sanitizedContent,
            notification_template_id: selectedTemplateId.value || currentNotif.notification_template_id
          }
        }).catch(() => {})
      }
    }

    // 2. Link unassigned members
    const toAssign = selectedMemberIds.value.filter(id => !assignedMemberIdsForCurrentBroadcast.value.has(id))
    let successCount = 0
    if (toAssign.length > 0) {
      for (const mId of toAssign) {
        await fetchWithAuth('/api/notification-members', {
          method: 'POST',
          body: {
            notification_id: Number(notificationId.value),
            member_id: Number(mId)
          }
        })
        successCount++
      }
    }

    // 3. If requested, trigger broadcast dispatch
    if (alsoBroadcast) {
      const res: any = await fetchWithAuth(`/api/notifications/${notificationId.value}/broadcast`, {
        method: 'POST',
        body: {
          channel: broadcastChannel.value
        }
      })

      const sentCount = res?.data?.sent ?? (successCount > 0 ? successCount : selectedMemberIds.value.length)
      push.success(`Broadcast successfully dispatched via ${broadcastChannel.value.toUpperCase()}! ${sentCount} delivered.`)
    } else {
      push.success(`Successfully assigned ${successCount} recipient(s) to the broadcast campaign!`)
    }

    emit('saved')
    emit('close')
  } catch (err: any) {
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to complete broadcast operation'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
    isBroadcasting.value = false
  }
}
</script>

<template>
  <div>
    <!-- BROADCAST DISPATCH STUDIO MODAL (SIDE-BY-SIDE) -->
    <div class="modal-backdrop fade show" style="z-index: 1060;" @click="emit('close')"></div>
    
    <div class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index: 1065;" @click.self="emit('close')">
      <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width: 1200px;">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden d-flex flex-column" style="max-height: 92vh;">
          
          <!-- Modal Header Banner -->
          <div class="modal-header border-0 px-4 py-3 bg-primary text-white d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-3">
              <div class="rounded-circle p-2 bg-white bg-opacity-15 text-white d-flex align-items-center justify-content-center flex-shrink-0" style="width: 40px; height: 40px;">
                <i class="bi bi-broadcast fs-5 text-white"></i>
              </div>
              <div>
                <h5 class="modal-title fw-bold text-white text-base mb-0">Broadcast Dispatch Studio</h5>
                <small class="text-white-50 text-xs">Configure message content & select target member recipients</small>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-white text-primary fw-semibold px-3 py-1.5 rounded-pill text-xs shadow-xs">
                <i class="bi bi-check2-circle me-1"></i>{{ selectedMemberIds.length }} Selected
              </span>
              <button type="button" class="btn-close btn-close-white" @click="emit('close')" aria-label="Close"></button>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="modalError" class="alert alert-danger py-2 px-4 mb-0 rounded-0 text-xs d-flex align-items-center gap-2 border-bottom">
            <i class="bi bi-exclamation-triangle-fill text-danger fs-6"></i>
            <span>{{ modalError }}</span>
          </div>

          <!-- Studio Body: Two Balanced Columns -->
          <div class="modal-body p-0 overflow-hidden d-flex flex-column flex-grow-1">
            <div class="row g-0 flex-grow-1" style="min-height: 520px; max-height: calc(90vh - 145px);">
              
              <!-- LEFT COLUMN (42%): TARGET RECIPIENTS DIRECTORY -->
              <div class="col-lg-5 border-end d-flex flex-column bg-body-tertiary bg-opacity-40 p-3 p-md-4 overflow-hidden">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge rounded-circle bg-primary text-white p-0 d-flex align-items-center justify-content-center" style="width: 22px; height: 22px; font-size: 0.75rem;">1</span>
                    <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-0">
                      Target Audience ({{ availableFilteredMembers.length }})
                    </h6>
                  </div>
                  <div class="d-flex align-items-center gap-1.5">
                    <button
                      type="button"
                      class="btn btn-xs btn-outline-primary rounded-pill px-2.5 py-1 text-xs fw-semibold"
                      @click="selectAllFiltered"
                    >
                      <i class="bi bi-check-all me-1"></i>Select All
                    </button>
                    <button
                      type="button"
                      class="btn btn-xs btn-outline-secondary rounded-pill px-2.5 py-1 text-xs"
                      @click="clearAllSelected"
                      :disabled="selectedMemberIds.length === 0"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <!-- Full-Width Search Bar -->
                <div class="position-relative mb-2.5">
                  <span class="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted pointer-events-none d-flex align-items-center">
                    <i class="bi bi-search text-primary opacity-75"></i>
                  </span>
                  <input
                    type="text"
                    v-model="memberFilterSearch"
                    class="form-control form-control-sm ps-5 pe-5 py-2 text-xs rounded-pill border bg-body shadow-2xs transition-all"
                    placeholder="Search member name or phone..."
                  />
                  <button
                    v-if="memberFilterSearch"
                    type="button"
                    class="btn btn-link p-0 position-absolute top-50 end-0 translate-middle-y me-3 text-muted text-decoration-none border-0 d-flex align-items-center"
                    @click="memberFilterSearch = ''"
                    title="Clear search"
                  >
                    <i class="bi bi-x-circle-fill text-muted"></i>
                  </button>
                </div>

                <!-- Branch Dropdown + Icon-Only Status Buttons -->
                <div class="d-flex align-items-center justify-content-between gap-2 mb-3">
                  <!-- Branch Dropdown -->
                  <div class="input-group input-group-sm flex-grow-1" style="max-width: 210px;">
                    <span class="input-group-text bg-body border-end-0 text-muted ps-2.5 py-1 rounded-start-pill text-xs">
                      <i class="bi bi-geo-alt-fill text-primary opacity-75"></i>
                    </span>
                    <select
                      v-model="memberFilterLocation"
                      class="form-select form-select-sm border-start-0 ps-1 py-1 text-xs rounded-end-pill bg-body shadow-2xs"
                      aria-label="Filter by branch"
                    >
                      <option value="">All Branches</option>
                      <option v-for="loc in locations" :key="loc.id" :value="String(loc.id)">
                        {{ loc.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Status Filter Buttons Group -->
                  <div class="d-flex align-items-center gap-1 bg-body p-1 border rounded-pill shadow-2xs flex-shrink-0">
                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'all' ? 'btn-primary text-white shadow-xs' : 'btn-light text-muted border-0'"
                      @click="audienceFilter = 'all'"
                      title="All Members"
                    >
                      <i class="bi bi-people-fill text-xs"></i>
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'active' ? 'btn-primary text-white shadow-xs' : 'btn-light text-success border-0'"
                      @click="audienceFilter = 'active'"
                      title="Active Members"
                    >
                      <i class="bi bi-check-circle-fill text-xs"></i>
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'inactive' ? 'btn-primary text-white shadow-xs' : 'btn-light text-muted border-0'"
                      @click="audienceFilter = 'inactive'"
                      title="Inactive Members"
                    >
                      <i class="bi bi-pause-circle-fill text-xs"></i>
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'deceased' ? 'btn-primary text-white shadow-xs' : 'btn-light text-danger border-0'"
                      @click="audienceFilter = 'deceased'"
                      title="Deceased Members"
                    >
                      <i class="bi bi-slash-circle-fill text-xs"></i>
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center transition-all"
                      style="width: 28px; height: 28px;"
                      :class="audienceFilter === 'outstanding' ? 'btn-warning text-dark shadow-xs' : 'btn-light text-warning border-0'"
                      @click="audienceFilter = 'outstanding'"
                      title="Members with Unpaid Fees"
                    >
                      <i class="bi bi-clock-history text-xs"></i>
                    </button>

                    <button
                      v-if="audienceFilter !== 'all' || memberFilterLocation || memberFilterSearch"
                      type="button"
                      class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center text-danger border-0 ms-0.5"
                      style="width: 28px; height: 28px;"
                      @click="audienceFilter = 'all'; memberFilterLocation = ''; memberFilterSearch = ''"
                      title="Reset all filters"
                    >
                      <i class="bi bi-arrow-counterclockwise text-xs"></i>
                    </button>
                  </div>
                </div>

                <!-- Member Directory Header -->
                <div class="d-flex align-items-center justify-content-between px-1 mb-2 text-2xs text-muted">
                  <span class="fw-semibold text-uppercase tracking-wider">
                    Directory ({{ availableFilteredMembers.length }})
                  </span>
                  <span class="badge bg-light text-secondary border text-2xs text-capitalize">
                    {{ audienceFilter }}
                  </span>
                </div>

                <!-- Member Cards Scrollable Directory -->
                <div class="member-list-scroll flex-grow-1 overflow-y-auto rounded-3 border bg-body p-2 d-flex flex-column gap-2">
                  <div
                    v-if="availableFilteredMembers.length === 0"
                    class="text-center py-5 text-muted text-xs"
                  >
                    <i class="bi bi-people fs-2 d-block mb-1 text-opacity-40"></i>
                    No members match the current filter criteria.
                  </div>

                  <div
                    v-for="m in availableFilteredMembers"
                    :key="m.id"
                    class="member-picker-row d-flex align-items-center justify-content-between p-2 rounded-3 transition-all cursor-pointer border"
                    :class="{
                      'bg-primary bg-opacity-10 border-primary': selectedMemberIds.includes(Number(m.id)),
                      'border-light bg-body': !selectedMemberIds.includes(Number(m.id)),
                      'opacity-50 pe-none bg-body-tertiary': isMemberAlreadyAssigned(Number(m.id))
                    }"
                    @click="!isMemberAlreadyAssigned(Number(m.id)) && toggleMemberSelection(Number(m.id))"
                  >
                    <div class="d-flex align-items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        class="form-check-input mt-0 flex-shrink-0 cursor-pointer"
                        :checked="selectedMemberIds.includes(Number(m.id)) || isMemberAlreadyAssigned(Number(m.id))"
                        :disabled="isMemberAlreadyAssigned(Number(m.id))"
                        @click.stop="!isMemberAlreadyAssigned(Number(m.id)) && toggleMemberSelection(Number(m.id))"
                      />
                      <div class="rounded-circle bg-primary text-white fw-bold text-xs d-flex align-items-center justify-content-center flex-shrink-0" style="width: 32px; height: 32px;">
                        {{ m.first_name[0] }}{{ m.last_name[0] }}
                      </div>
                      <div class="text-truncate">
                        <span class="d-block fw-semibold text-primary text-xs text-truncate">
                          {{ m.first_name }} {{ m.last_name }}
                        </span>
                        <small class="text-muted font-monospace text-xs d-block text-truncate">
                          <i class="bi bi-telephone me-1"></i>{{ m.phone || 'No phone' }} • {{ getLocationName(m.location_id) }}
                        </small>
                      </div>
                    </div>

                    <div class="flex-shrink-0 ms-2 text-end d-flex flex-column align-items-end gap-1">
                      <span v-if="isMemberAlreadyAssigned(Number(m.id))" class="badge bg-secondary-subtle text-secondary px-2 py-0.5 rounded-pill text-2xs border">
                        <i class="bi bi-check-circle me-0.5"></i>Assigned
                      </span>
                      <span v-else-if="selectedMemberIds.includes(Number(m.id))" class="badge bg-primary text-white px-2 py-0.5 rounded-pill text-2xs">
                        Selected
                      </span>
                      <span v-if="isMemberOutstanding(m)" class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-1.5 py-0.5 rounded-pill text-2xs">
                        <i class="bi bi-clock-history me-0.5"></i>Unpaid
                      </span>
                      <span v-else-if="m.member_status === 'deceased'" class="badge bg-danger-subtle text-danger border border-danger-subtle px-1.5 py-0.5 rounded-pill text-2xs">
                        Deceased
                      </span>
                      <span v-else-if="m.member_status === 'inactive'" class="badge bg-secondary-subtle text-secondary border px-1.5 py-0.5 rounded-pill text-2xs">
                        Inactive
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Queued Selection Info Bar -->
                <div class="pt-2 px-1 d-flex align-items-center justify-content-between text-xs text-muted">
                  <span>
                    Queued: <strong class="text-primary">{{ selectedMemberIds.length }}</strong> member(s)
                  </span>
                  <span v-if="selectedMemberIds.length > 0" class="text-2xs text-muted font-monospace">
                    Est. {{ selectedMemberIds.length * smsSegmentCount }} SMS dispatches
                  </span>
                </div>

              </div>

              <!-- RIGHT COLUMN (58%): MESSAGE COMPOSER & LIVE PREVIEW -->
              <div class="col-lg-7 d-flex flex-column bg-body p-3 p-md-4 overflow-y-auto">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge rounded-circle bg-primary text-white p-0 d-flex align-items-center justify-content-center" style="width: 22px; height: 22px; font-size: 0.75rem;">2</span>
                    <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-0">
                      Message Composer
                    </h6>
                  </div>
                  <span class="badge bg-body-secondary text-secondary border text-2xs px-2 py-0.5 rounded-pill font-monospace">
                    {{ smsCharCount }} chars • {{ smsSegmentCount }} SMS
                  </span>
                </div>

                <!-- Campaign & Template Selector Row -->
                <div class="row g-2 mb-3">
                  <div class="col-md-6">
                    <label for="scNotifId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-1">
                      Target Campaign *
                    </label>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text bg-transparent border-end-0 text-muted">
                        <i class="bi bi-megaphone"></i>
                      </span>
                      <select
                        id="scNotifId"
                        v-model="notificationId"
                        class="form-select border-start-0 ps-1 py-2 text-xs"
                        required
                      >
                        <option v-for="n in notifications" :key="n.id" :value="n.id">
                          {{ n.name }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="d-flex align-items-center justify-content-between mb-1">
                      <label for="scTmplId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-0">
                        Load Template
                      </label>
                      <small class="text-muted text-2xs">Auto-populates</small>
                    </div>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text bg-transparent border-end-0 text-muted">
                        <i class="bi bi-file-earmark-text"></i>
                      </span>
                      <select
                        id="scTmplId"
                        v-model="selectedTemplateId"
                        class="form-select border-start-0 ps-1 py-2 text-xs"
                      >
                        <option value="">Choose a template...</option>
                        <option v-for="t in templates" :key="t.id" :value="t.id">
                          {{ t.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Message Content & Placeholder Chips -->
                <div class="mb-3">
                  <label for="scMsg" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-1">
                    Message Content *
                  </label>
                  
                  <!-- Tag Chips -->
                  <div class="d-flex flex-wrap gap-1 mb-2">
                    <button
                      v-for="ph in availablePlaceholders"
                      :key="ph.tag"
                      type="button"
                      class="btn btn-xs btn-outline-primary rounded-pill px-2.5 py-0.5 text-2xs fw-semibold d-flex align-items-center gap-1 shadow-2xs"
                      @click="insertPlaceholder(ph.tag)"
                      :title="ph.tag"
                    >
                      <i class="bi bi-plus-circle"></i>
                      <span>{{ ph.tag }}</span>
                    </button>
                  </div>

                  <textarea
                    id="scMsg"
                    v-model="messageContent"
                    rows="4"
                    class="form-control text-xs font-monospace py-2"
                    placeholder="Type broadcast announcement message..."
                    required
                  ></textarea>
                </div>

                <!-- Step 3: Broadcast Delivery Channel -->
                <div class="mb-3">
                  <div class="d-flex align-items-center justify-content-between mb-1.5">
                    <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-0">
                      Step 3: Dispatch Channel *
                    </label>
                    <span class="badge bg-body-secondary text-secondary text-2xs font-monospace">Target Transport</span>
                  </div>
                  <div class="row g-2">
                    <div class="col-4">
                      <div 
                        class="channel-card p-2 rounded-3 border text-center cursor-pointer transition-all"
                        :class="broadcastChannel === 'email' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                        @click="broadcastChannel = 'email'"
                      >
                        <i class="bi bi-envelope-fill fs-5 d-block mb-0.5 text-primary"></i>
                        <span class="fw-bold text-xs d-block text-body">Email</span>
                        <small class="text-muted text-2xs">SendGrid SMTP</small>
                      </div>
                    </div>
                    <div class="col-4">
                      <div 
                        class="channel-card p-2 rounded-3 border text-center cursor-pointer transition-all"
                        :class="broadcastChannel === 'sms' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                        @click="broadcastChannel = 'sms'"
                      >
                        <i class="bi bi-chat-text-fill fs-5 d-block mb-0.5 text-success"></i>
                        <span class="fw-bold text-xs d-block text-body">SMS</span>
                        <small class="text-muted text-2xs">Beem Gateway</small>
                      </div>
                    </div>
                    <div class="col-4">
                      <div 
                        class="channel-card p-2 rounded-3 border text-center cursor-pointer transition-all"
                        :class="broadcastChannel === 'both' ? 'active-channel-card border-primary shadow-2xs' : 'bg-body border'"
                        @click="broadcastChannel = 'both'"
                      >
                        <i class="bi bi-broadcast fs-5 d-block mb-0.5 text-warning"></i>
                        <span class="fw-bold text-xs d-block text-body">Both</span>
                        <small class="text-muted text-2xs">Email + SMS</small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Live SMS Phone Bubble Preview -->
                <div class="mt-auto pt-3 border-top">
                  <div class="d-flex align-items-center gap-1.5 mb-2 text-xs text-muted fw-semibold">
                    <i class="bi bi-phone text-primary"></i>
                    <span>Live Recipient Preview</span>
                  </div>
                  <div class="p-3 rounded-3 bg-body-tertiary border position-relative">
                    <div class="d-flex align-items-center gap-2 mb-1.5">
                      <span class="badge bg-success-subtle text-success border border-success-subtle text-2xs rounded-pill">
                        SMS Bubble
                      </span>
                      <small class="text-muted text-2xs">Sample: Halima Said</small>
                    </div>
                    <div class="p-2.5 rounded-3 bg-white border shadow-2xs text-xs text-body font-monospace" style="white-space: pre-wrap; word-break: break-word; line-height: 1.45;">
                      {{ previewSampleMessage }}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Modal Action Footer -->
          <div class="modal-footer border-top px-4 py-3 bg-body-tertiary d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div class="text-xs text-muted">
              Campaign: <strong class="text-primary">{{ getNotificationTitle(notificationId) }}</strong> • Channel: <strong class="text-uppercase text-primary">{{ broadcastChannel }}</strong> • Queue: <strong class="text-primary">{{ selectedMemberIds.length }}</strong> recipient(s)
            </div>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3.5 text-xs" @click="emit('close')" :disabled="isSubmitting || isBroadcasting">
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary rounded-pill px-3.5 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-2xs"
                :disabled="isSubmitting || isBroadcasting || selectedMemberIds.length === 0 || !notificationId"
                @click="handleSaveBatch(false)"
              >
                <span v-if="isSubmitting && !isBroadcasting" class="spinner-border spinner-border-sm" role="status"></span>
                <i v-else class="bi bi-link-45deg"></i>
                <span>Assign Recipients Only</span>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-primary rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-2 shadow-sm"
                :disabled="isSubmitting || isBroadcasting || selectedMemberIds.length === 0 || !notificationId"
                @click="handleSaveBatch(true)"
              >
                <span v-if="isBroadcasting" class="spinner-border spinner-border-sm" role="status"></span>
                <i v-else class="bi bi-send-fill"></i>
                <span>{{ isBroadcasting ? 'Broadcasting Now...' : `Assign & Broadcast via ${broadcastChannel.toUpperCase()}` }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.member-picker-row:hover {
  border-color: var(--amms-primary) !important;
  background-color: rgba(67, 118, 108, 0.05) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.channel-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.channel-card:hover {
  border-color: var(--amms-primary, #43766C) !important;
  transform: translateY(-1px);
}

.channel-card.active-channel-card {
  background: linear-gradient(135deg, rgba(67, 118, 108, 0.08) 0%, rgba(67, 118, 108, 0.16) 100%) !important;
  border-color: var(--amms-primary, #43766C) !important;
  box-shadow: 0 2px 8px rgba(67, 118, 108, 0.14);
}

.text-2xs { font-size: 0.7rem; }
.shadow-2xs { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }
</style>
