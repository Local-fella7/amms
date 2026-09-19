<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface NotificationItem {
  id: number
  name: string
  notification_template_id?: number | string
  content: string
  template?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string
}

interface NotificationTemplateOption {
  id: number
  name: string
  content: string
}

const { data: notificationsResponse, loading, error, execute: fetchNotifications, fetchWithAuth } = useApi<NotificationItem[] | { data: NotificationItem[] }>()
const { data: templates, execute: fetchTemplates } = useApi<NotificationTemplateOption[]>()

const searchQuery = ref('')
const isSubmitting = ref(false)
const modalError = ref('')
const editingNotification = ref<NotificationItem | null>(null)
const isModalOpen = ref(false)

// Form Fields
const name = ref('')
const notificationTemplateId = ref<number | string>('')
const content = ref('')

// View Modal State
const viewingNotification = ref<NotificationItem | null>(null)
const isViewModalOpen = ref(false)

// Delete Modal State
const itemToDelete = ref<NotificationItem | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const availablePlaceholders = [
  { tag: '{{first_name}}', label: 'First Name', tooltip: 'Replaced with recipient member\'s first name' },
  { tag: '{{last_name}}', label: 'Last Name', tooltip: 'Replaced with recipient member\'s last name' },
  { tag: '{{fee_year}}', label: 'Fee Year', tooltip: 'Replaced with current fee schedule year' },
  { tag: '{{phone}}', label: 'Phone Number', tooltip: 'Replaced with recipient member\'s phone number' },
  { tag: '{{outstanding_balance}}', label: 'Outstanding Balance', tooltip: 'Replaced with recipient member\'s outstanding balance' }
]

const schema = z.object({
  name: z.string().min(2, 'Broadcast title is required'),
  content: z.string().min(5, 'Broadcast message content is required')
})

const loadData = async () => {
  try {
    await Promise.all([
      fetchNotifications((api) => api('/api/notifications')),
      fetchTemplates((api) => api('/api/notification-templates')).catch(() => [])
    ])
  } catch (err) {
    // Handled by composable
  }
}

const rawNotificationsList = computed<NotificationItem[]>(() => {
  if (!notificationsResponse.value) return []
  const res = notificationsResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const getTemplateName = (tId?: number | string) => {
  if (!tId) return 'Custom Broadcast'
  if (!templates.value) return `Template #${tId}`
  const found = templates.value.find(t => Number(t.id) === Number(tId))
  return found ? found.name : `Template #${tId}`
}

const filteredNotifications = computed(() => {
  let result = [...rawNotificationsList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(n => n.name.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || String(n.id).includes(q))
  }

  // Descending sort by ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredNotifications.value.length / itemsPerPage.value) || 1)

const paginatedNotifications = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredNotifications.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, itemsPerPage], () => {
  currentPage.value = 1
})

// Auto-fill content when template is selected
watch(notificationTemplateId, (newId) => {
  if (newId && templates.value) {
    const selectedTmpl = templates.value.find(t => Number(t.id) === Number(newId))
    if (selectedTmpl && selectedTmpl.content) {
      content.value = selectedTmpl.content.replace(/\{\{fee_year\}\}/g, String(new Date().getFullYear()))
    }
  }
})

const insertPlaceholder = (tag: string) => {
  const valueToInsert = tag === '{{fee_year}}' ? String(new Date().getFullYear()) : tag
  content.value += ` ${valueToInsert} `
}

const openAddModal = () => {
  editingNotification.value = null
  name.value = ''
  notificationTemplateId.value = ''
  content.value = ''
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (n: NotificationItem) => {
  editingNotification.value = n
  name.value = n.name
  notificationTemplateId.value = n.notification_template_id || ''
  content.value = n.content
  modalError.value = ''
  isModalOpen.value = true
}

const openViewModal = (n: NotificationItem) => {
  viewingNotification.value = n
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingNotification.value = null
  isViewModalOpen.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

const formatDateDisplay = (val?: string) => {
  if (!val) return '—'
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-')
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return str
}

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
    if (editingNotification.value) {
      await fetchWithAuth(`/api/notifications/${editingNotification.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success('Broadcast notification updated successfully!')
    } else {
      await fetchWithAuth('/api/notifications', {
        method: 'POST',
        body: payload
      })
      push.success('Broadcast notification created & dispatched successfully!')
    }
    
    closeModal()
    await loadData()
  } catch (err: unknown) {
    modalError.value = extractErrorMessage(err, 'Failed to save broadcast notification')
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const promptDelete = (n: NotificationItem) => {
  itemToDelete.value = n
  isDeleteModalOpen.value = true
}

const cancelDelete = () => {
  itemToDelete.value = null
  isDeleteModalOpen.value = false
}

const confirmDelete = async () => {
    if (!itemToDelete.value) return
    
    const success = await mutate(api => api(`/api/notifications/${itemToDelete.value.id}`, { method: 'DELETE' }), {
      successMessage: 'Broadcast notification log deleted successfully!'
    })
    
    if (success) {
      cancelDelete()
      await loadData()
    }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="Broadcasts Templates"
      subtitle="Manage broadcast message templates and dispatch logs"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search broadcast title or content..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="Create Template"
      @add="openAddModal"
    />

    <!-- Integrated Table Container with Top Toolbar -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Top Table Toolbar with Live Counter -->
      <div class="card-header bg-body-tertiary border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <span class="text-xs fw-bold text-uppercase text-secondary-amms tracking-wider">
            <i class="bi bi-send-fill text-primary me-1"></i> Dispatch Logs History
          </span>
        </div>

        <div class="text-xs text-muted font-monospace">
          Showing <span class="fw-bold text-primary">{{ filteredNotifications.length }}</span> broadcasts
        </div>
      </div>


      <!-- Error Alert -->
      <div v-if="error" class="alert alert-danger rounded-0 mb-0 py-3 px-4 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <span>{{ error }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-pill" @click="loadData">Retry</button>
      </div>

      
    <!-- Replaced by AppTable Component -->
    <AppTable
      :columns="[
        { key: 'id', label: '# ID', width: '70px', headerClass: 'ps-4 d-none d-xl-table-cell', cellClass: 'ps-4 font-monospace text-muted text-xs d-none d-xl-table-cell' },
        { key: 'broadcast-title', label: 'Broadcast Title', cellClass: 'fw-semibold text-primary' },
        { key: 'template-used', label: 'Template Used', headerClass: 'd-none d-md-table-cell', cellClass: 'd-none d-md-table-cell' },
        { key: 'message-content-snippet', label: 'Message Content Snippet', headerClass: 'd-none d-lg-table-cell', cellClass: 'text-xs text-body text-truncate d-none d-lg-table-cell' },
        { key: 'dispatch-date', label: 'Dispatch Date', headerClass: 'd-none d-sm-table-cell', cellClass: 'font-monospace text-xs text-body d-none d-sm-table-cell' },
        { key: 'actions', label: 'Actions', align: 'right', width: '120px', headerClass: 'pe-4', cellClass: 'pe-4' }
      ]"
      :items="paginatedNotifications"
      :loading="loading"
      emptyIcon="bi bi-broadcast"
      emptyTitle="No broadcast notifications found"
      emptySubtitle="Click 'Create Broadcast' above to send an SMS or Email announcement."

    >
      <template #cell-id="{ item }">
#{{ item.id }}
      </template>
      <template #cell-broadcast-title="{ item }">

                <div class="d-flex align-items-center gap-2.5">
                  <div class="broadcast-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-megaphone-fill text-primary text-xs"></i>
                  </div>
                  <span>{{ item.name }}</span>
                </div>
              
      </template>
      <template #cell-template-used="{ item }">

                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs">
                  <i class="bi bi-file-text me-1"></i>
                  {{ item.template?.name || getTemplateName(item.notification_template_id) }}
                </span>
              
      </template>
      <template #cell-message-content-snippet="{ item }">

                {{ item.content }}
              
      </template>
      <template #cell-dispatch-date="{ item }">

                {{ formatDateDisplay(item.created_at) }}
              
      </template>
      <template #cell-actions="{ item }">

                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openViewModal(item)"
                    title="View Broadcast Log Details"
                  >
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditModal(item)"
                    title="Edit Broadcast"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDelete(item)"
                    title="Delete Broadcast Log"
                  >
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              
      </template>
    </AppTable>

      <!-- Reusable Pagination Control Footer -->
      <PaginationControl
        v-if="filteredNotifications.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredNotifications.length"
      />

    </div>

    <!-- View Broadcast Details Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewBroadcastModal"
      title="Broadcast Dispatch Details"
      icon="bi bi-broadcast"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Broadcast Title</span>
            <span class="fw-bold text-primary fs-6">{{ viewingNotification?.name }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Template Used</span>
            <span class="fw-semibold text-body text-xs">{{ viewingNotification ? (viewingNotification.template?.name || getTemplateName(viewingNotification.notification_template_id)) : '—' }}</span>
          </div>
          <div class="col-md-12">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block mb-1">Dispatched Message Content</span>
            <div class="p-3 bg-body rounded-3 border text-xs font-monospace text-body leading-relaxed">
              {{ viewingNotification?.content }}
            </div>
          </div>
          <div class="col-md-6" v-if="viewingNotification?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Dispatch Date</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ formatDateDisplay(viewingNotification.created_at) }}</span>
          </div>
          <div class="col-md-6" v-if="viewingNotification?.updated_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Last Modified</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ formatDateDisplay(viewingNotification.updated_at) }}</span>
          </div>
        </div>
      </div>
    </ViewDetailModal>

    <DeleteConfirmModal
      v-model="isDeleteModalOpen"
      message="Are you sure you want to permanently delete this notification?"
        :itemTitle="itemToDelete ? `&quot;${itemToDelete.subject}&quot;` : ''"
      :loading="isDeleting"
      confirmText="Delete Notification"
      @confirm="confirmDelete"
    />


    <!-- Shared Broadcast Modal Component -->
    <SharedBroadcastModal
      v-if="isModalOpen"
      :editing-notification="editingNotification"
      @close="closeModal"
      @saved="loadData"
    />

  </div>
</template>

<style scoped>
.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }

.custom-amms-table {
  --bs-table-bg: transparent;
  --bs-table-hover-bg: rgba(27, 42, 74, 0.03);
}

.custom-amms-table thead {
  background-color: var(--amms-primary) !important;
}

.custom-amms-table thead th {
  color: #FFFFFF !important;
  border-bottom: 2px solid var(--amms-accent);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}

.broadcast-icon-badge {
  width: 28px;
  height: 28px;
  background-color: rgba(27, 42, 74, 0.08);
}

.placeholder-chip {
  transition: all 0.15s ease;
}

.placeholder-chip:hover {
  background-color: var(--amms-primary) !important;
  color: #ffffff !important;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.hover-danger:hover {
  background-color: rgba(220, 53, 69, 0.12) !important;
}
</style>


