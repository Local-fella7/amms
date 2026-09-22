<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'
import type { NotificationItem, NotificationTemplate } from '~/types'

const props = defineProps<{
  editingNotification?: NotificationItem | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const { fetchWithAuth } = useApi<unknown>()
const { data: templates, execute: fetchTemplates } = useApi<NotificationTemplate[]>()

const isSubmitting = ref(false)
const modalError = ref('')

const name = ref('')
const notificationTemplateId = ref<number | string>('')
const content = ref('')

const availablePlaceholders = [
  { tag: '{{first_name}}', label: 'First Name', tooltip: "Replaced with recipient member's first name" },
  { tag: '{{last_name}}', label: 'Last Name', tooltip: "Replaced with recipient member's last name" },
  { tag: '{{fee_year}}', label: 'Fee Year', tooltip: 'Replaced with current fee schedule year' },
  { tag: '{{phone}}', label: 'Phone Number', tooltip: "Replaced with recipient member's phone number" },
  { tag: '{{outstanding_balance}}', label: 'Outstanding Balance', tooltip: "Replaced with recipient member's outstanding balance" }
]

const schema = z.object({
  name: z.string().min(2, 'Broadcast title is required'),
  content: z.string().min(5, 'Broadcast message content is required')
})

// Auto-fill content when template is selected
watch(notificationTemplateId, (newId) => {
  if (newId && templates.value) {
    const selectedTmpl = templates.value.find(t => Number(t.id) === Number(newId))
    if (selectedTmpl?.content) {
      content.value = selectedTmpl.content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
    }
  }
})

const insertPlaceholder = (tag: string) => {
  const valueToInsert = tag === '{{fee_year}}' ? String(new Date().getFullYear()) : tag
  content.value += ` ${valueToInsert} `
}

// Initialize when editingNotification changes
watch(() => props.editingNotification, (n) => {
  if (n) {
    name.value = n.name || ''
    notificationTemplateId.value = n.notification_template_id || ''
    content.value = n.content || ''
  } else {
    name.value = ''
    notificationTemplateId.value = ''
    content.value = ''
  }
  modalError.value = ''
}, { immediate: true })

onMounted(async () => {
  await fetchTemplates((api) => api('/api/notification-templates')).catch(() => [])
})

const handleSave = async () => {
  modalError.value = ''
  const payload: {
    name: string
    content: string
    notification_template_id?: number
  } = {
    name: name.value.trim().replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear())),
    content: content.value.trim().replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
  }
  if (notificationTemplateId.value) {
    payload.notification_template_id = Number(notificationTemplateId.value)
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (props.editingNotification) {
      await fetchWithAuth(`/api/notifications/${props.editingNotification.id}`, { method: 'PUT', body: payload })
      push.success('Broadcast notification updated successfully!')
    } else {
      await fetchWithAuth('/api/notifications', { method: 'POST', body: payload })
      push.success('Broadcast notification created & dispatched successfully!')
    }
    emit('saved')
    emit('close')
  } catch (err: unknown) {
    modalError.value = extractErrorMessage(err, 'Failed to save broadcast notification')
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <div class="modal-backdrop fade show" @click="emit('close')"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" @click.self="emit('close')">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-broadcast me-1.5 amms-accent"></i>
              <span>{{ editingNotification ? 'Edit Broadcast' : 'Create Broadcast' }}</span>
            </h5>
            <button type="button" class="btn-close position-absolute end-0 me-3" @click="emit('close')" aria-label="Close"></button>
          </div>

          <form @submit.prevent="handleSave">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>

              <!-- Broadcast Title -->
              <div class="mb-3">
                <label for="sbTitle" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                  Broadcast Title *
                </label>
                <input id="sbTitle" v-model="name" type="text" class="form-control py-2.5 text-sm" placeholder="e.g. Annual General Meeting Notice" required />
              </div>

              <!-- Template Selector -->
              <div class="mb-3">
                <label for="sbTmpl" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                  Select Template (Optional)
                </label>
                <select id="sbTmpl" v-model="notificationTemplateId" class="form-select py-2.5 text-sm">
                  <option value="">Custom Message (No Template)</option>
                  <option v-for="t in templates" :key="t.id" :value="t.id">
                    {{ t.name }}
                  </option>
                </select>
              </div>

              <!-- Message Content & Placeholder Chips -->
              <div class="mb-3">
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <label for="sbContent" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-0">
                    Message Content *
                  </label>
                  <span class="text-xs text-muted">Click chip to insert placeholder:</span>
                </div>

                <!-- Interactive Placeholder Tag Chips -->
                <div class="d-flex flex-wrap gap-1.5 mb-2">
                  <button
                    v-for="p in availablePlaceholders"
                    :key="p.tag"
                    type="button"
                    class="btn btn-xs btn-outline-primary rounded-pill px-2.5 py-1 text-xs fw-semibold placeholder-chip d-flex align-items-center gap-1"
                    @click="insertPlaceholder(p.tag)"
                    :title="p.tooltip"
                  >
                    <i class="bi bi-plus-circle text-xs"></i>
                    <span>{{ p.tag }}</span>
                  </button>
                </div>

                <textarea
                  id="sbContent"
                  v-model="content"
                  rows="4"
                  class="form-control py-2 text-sm font-monospace"
                  placeholder="Type broadcast announcement message..."
                  required
                ></textarea>
              </div>
            </div>

            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3" @click="emit('close')">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Dispatching...' : (editingNotification ? 'Update Broadcast' : 'Dispatch Broadcast') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }
.placeholder-chip { transition: all 0.15s ease; }
.placeholder-chip:hover { background-color: var(--amms-primary, #43766C) !important; color: #ffffff !important; }
</style>
