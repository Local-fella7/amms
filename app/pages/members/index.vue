<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'

interface Member {
  id: number
  first_name: string
  last_name: string
  fathers_name?: string
  mothers_name?: string
  location_id: number | string
  date_of_birth: string
  member_status: 'active' | 'inactive' | string
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | string
  phone: string
  fee_exemption: 'yes' | 'no' | string
  age_group_id: number | string
  registration_date: string
  location?: { id: number; name: string }
  age_group?: { id: number; name: string }
  created_at?: string
  updated_at?: string
}

interface LocationItem {
  id: number
  name: string
}

interface AgeGroupItem {
  id: number
  name: string
}

const { data: membersResponse, loading, error, execute: fetchMembers, fetchWithAuth } = useApi<any>()
const { data: locations, execute: fetchLocations } = useApi<LocationItem[]>()
const { data: ageGroups, execute: fetchAgeGroups } = useApi<AgeGroupItem[]>()

const searchQuery = ref('')
const selectedLocationFilter = ref<string>('')
const selectedStatusFilter = ref<string>('')

const isSubmitting = ref(false)
const modalError = ref('')
const editingMember = ref<Member | null>(null)
const isModalOpen = ref(false)

// Form Fields
const firstName = ref('')
const lastName = ref('')
const fathersName = ref('')
const mothersName = ref('')
const locationId = ref<string | number>('')
const ageGroupId = ref<string | number>('')
const dateOfBirth = ref('')
const phone = ref('')
const memberStatus = ref<'active' | 'inactive'>('active')
const maritalStatus = ref<'single' | 'married' | 'divorced' | 'widowed'>('single')
const feeExemption = ref<'yes' | 'no'>('no')
const registrationDate = ref(new Date().toISOString().substring(0, 10))

// View Modal State
const viewingMember = ref<Member | null>(null)
const isViewModalOpen = ref(false)

// Delete Modal State
const itemToDelete = ref<Member | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const schema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  fathers_name: z.string().optional(),
  mothers_name: z.string().optional(),
  location_id: z.union([z.number(), z.string().min(1, 'Location branch is required')]),
  age_group_id: z.union([z.number(), z.string().min(1, 'Age group is required')]),
  date_of_birth: z.string().min(4, 'Date of birth is required'),
  phone: z.string()
    .length(12, 'Phone number must be exactly 12 digits (e.g. 255755555555)')
    .regex(/^255[0-9]{9}$/, 'Phone number must start with 255 followed by 9 digits'),
  member_status: z.enum(['active', 'inactive']),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed']),
  fee_exemption: z.enum(['yes', 'no']),
  registration_date: z.string().min(4, 'Registration date is required')
})

const loadData = async () => {
  try {
    await Promise.all([
      fetchMembers((api) => api('/api/members')),
      fetchLocations((api) => api('/api/locations')).catch(() => []),
      fetchAgeGroups((api) => api('/api/age-groups')).catch(() => [])
    ])
  } catch (err) {
    // Handled by composable
  }
}

const rawMembersList = computed<Member[]>(() => {
  if (!membersResponse.value) return []
  const res = membersResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const getLocationName = (locId: number | string) => {
  if (!locations.value) return '—'
  const found = locations.value.find(l => Number(l.id) === Number(locId))
  return found ? found.name : `Branch #${locId}`
}

const getAgeGroupName = (groupId: number | string) => {
  if (!ageGroups.value) return '—'
  const found = ageGroups.value.find(g => Number(g.id) === Number(groupId))
  return found ? found.name : `Bracket #${groupId}`
}

// Summary Metrics
const totalMembersCount = computed(() => rawMembersList.value.length)
const activeMembersCount = computed(() => rawMembersList.value.filter(m => m.member_status === 'active').length)
const exemptedMembersCount = computed(() => rawMembersList.value.filter(m => m.fee_exemption === 'yes').length)

const filteredMembers = computed(() => {
  let result = [...rawMembersList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(m => 
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.fathers_name && m.fathers_name.toLowerCase().includes(q))
    )
  }

  if (selectedLocationFilter.value) {
    result = result.filter(m => Number(m.location_id) === Number(selectedLocationFilter.value))
  }

  if (selectedStatusFilter.value) {
    result = result.filter(m => m.member_status === selectedStatusFilter.value)
  }

  // Descending sort by Member ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredMembers.value.length / itemsPerPage.value) || 1)

const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredMembers.value.slice(start, start + itemsPerPage.value)
})

interface AgeGroupItem {
  id: number
  name: string
  from_age?: number
  to_age?: number
}

const calculatedAge = ref<number | null>(null)

// Auto-calculate member age & auto-select matching Age Group
watch(dateOfBirth, (newDob) => {
  if (!newDob) {
    calculatedAge.value = null
    return
  }

  let dobDate: Date
  if (newDob instanceof Date) {
    dobDate = newDob
  } else {
    dobDate = new Date(newDob)
  }

  if (isNaN(dobDate.getTime())) {
    calculatedAge.value = null
    return
  }

  const today = new Date()
  let age = today.getFullYear() - dobDate.getFullYear()
  const monthDiff = today.getMonth() - dobDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
    age--
  }

  calculatedAge.value = age >= 0 ? age : 0

  // Match against loaded age groups [from_age, to_age]
  if (ageGroups.value && ageGroups.value.length > 0 && calculatedAge.value !== null) {
    const matched = ageGroups.value.find(g => {
      const min = g.from_age !== undefined ? Number(g.from_age) : 0
      const max = g.to_age !== undefined ? Number(g.to_age) : 999
      return calculatedAge.value! >= min && calculatedAge.value! <= max
    })

    if (matched) {
      ageGroupId.value = matched.id
    }
  }
}, { immediate: true })

// Auto-format & enforce 255 prefix, digits only, omit leading zero after 255, and max 12 characters
watch(phone, (val) => {
  if (!val) {
    phone.value = '255'
    return
  }

  // Strip all non-digit characters
  let digits = val.replace(/\D/g, '')

  // Ensure starts with 255
  if (!digits.startsWith('255')) {
    digits = '255' + digits.replace(/^255?/, '')
  }

  // Omit leading zero after 255 (e.g. 2550755555555 -> 255755555555)
  if (digits.startsWith('2550')) {
    digits = '255' + digits.slice(4).replace(/^0+/, '')
  }

  // Max 12 digits
  if (digits.length > 12) {
    digits = digits.slice(0, 12)
  }

  phone.value = digits
})

const openAddModal = () => {
  editingMember.value = null
  firstName.value = ''
  lastName.value = ''
  fathersName.value = ''
  mothersName.value = ''
  locationId.value = locations.value && locations.value.length > 0 ? locations.value[0].id : ''
  ageGroupId.value = ageGroups.value && ageGroups.value.length > 0 ? ageGroups.value[0].id : ''
  dateOfBirth.value = '1990-01-01'
  phone.value = '255'
  memberStatus.value = 'active'
  maritalStatus.value = 'single'
  feeExemption.value = 'no'
  registrationDate.value = new Date().toISOString().substring(0, 10)
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (m: Member) => {
  editingMember.value = m
  firstName.value = m.first_name
  lastName.value = m.last_name
  fathersName.value = m.fathers_name || ''
  mothersName.value = m.mothers_name || ''
  locationId.value = m.location_id
  ageGroupId.value = m.age_group_id
  dateOfBirth.value = m.date_of_birth
  phone.value = m.phone
  memberStatus.value = (m.member_status as any) || 'active'
  maritalStatus.value = (m.marital_status as any) || 'single'
  feeExemption.value = (m.fee_exemption as any) || 'no'
  registrationDate.value = m.registration_date || new Date().toISOString().substring(0, 10)
  modalError.value = ''
  isModalOpen.value = true
}

const openViewModal = (m: Member) => {
  viewingMember.value = m
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingMember.value = null
  isViewModalOpen.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

const formatDateToYMD = (val: any) => {
  if (!val) return new Date().toISOString().substring(0, 10)
  if (val instanceof Date) {
    const yyyy = val.getFullYear()
    const mm = String(val.getMonth() + 1).padStart(2, '0')
    const dd = String(val.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  if (typeof val === 'string') {
    return val.substring(0, 10)
  }
  return String(val)
}

const handleSave = async () => {
  modalError.value = ''
  const payload = {
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    fathers_name: fathersName.value.trim() || undefined,
    mothers_name: mothersName.value.trim() || undefined,
    location_id: Number(locationId.value),
    age_group_id: Number(ageGroupId.value),
    date_of_birth: formatDateToYMD(dateOfBirth.value),
    phone: phone.value.trim(),
    member_status: memberStatus.value,
    marital_status: maritalStatus.value,
    fee_exemption: feeExemption.value,
    registration_date: formatDateToYMD(registrationDate.value)
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    if (editingMember.value) {
      await fetchWithAuth(`/api/members/${editingMember.value.id}`, {
        method: 'PUT',
        body: payload
      })
      push.success(`Member "${firstName.value} ${lastName.value}" updated successfully!`)
    } else {
      await fetchWithAuth('/api/members', {
        method: 'POST',
        body: payload
      })
      push.success(`Member "${firstName.value} ${lastName.value}" registered successfully!`)
    }
    
    closeModal()
    await loadData()
  } catch (err: any) {
    console.error('Save member error:', err)
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save member details'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const promptDelete = (m: Member) => {
  itemToDelete.value = m
  isDeleteModalOpen.value = true
}

const cancelDelete = () => {
  itemToDelete.value = null
  isDeleteModalOpen.value = false
}

const confirmDelete = async () => {
  if (!itemToDelete.value) return
  
  isDeleting.value = true
  try {
    await fetchWithAuth(`/api/members/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success(`Member "${itemToDelete.value.first_name} ${itemToDelete.value.last_name}" deleted successfully!`)
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete member'
    push.error(msg)
  } finally {
    isDeleting.value = false
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
      title="Members Registry"
      subtitle="Comprehensive association member records, registrations, and demographic management"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search by member name, phone..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="Register New Member"
      @add="openAddModal"
    />

    <!-- Filter Control Bar -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 p-3 mb-4">
      <div class="row g-2 align-items-center">
        <div class="col-md-4">
          <label class="form-label text-xs fw-semibold text-muted text-uppercase mb-1">Filter by Location Branch</label>
          <select v-model="selectedLocationFilter" class="form-select form-select-sm rounded-pill text-xs">
            <option value="">All Location Branches</option>
            <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
          </select>
        </div>

        <div class="col-md-4">
          <label class="form-label text-xs fw-semibold text-muted text-uppercase mb-1">Filter by Membership Status</label>
          <select v-model="selectedStatusFilter" class="form-select form-select-sm rounded-pill text-xs">
            <option value="">All Membership Statuses</option>
            <option value="active">Active Members</option>
            <option value="inactive">Inactive Members</option>
          </select>
        </div>

        <div class="col-md-4 d-flex align-items-end justify-content-end" v-if="selectedLocationFilter || selectedStatusFilter || searchQuery">
          <button 
            type="button" 
            class="btn btn-sm btn-link text-danger text-xs text-decoration-none"
            @click="selectedLocationFilter = ''; selectedStatusFilter = ''; searchQuery = ''"
          >
            <i class="bi bi-x-circle me-1"></i> Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Main Data Table Container -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading members...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading member directory...</span>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="alert alert-danger rounded-0 mb-0 py-3 px-4 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <span>{{ error }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-pill" @click="loadData">Retry</button>
      </div>

      <div class="table-responsive">
        <table class="table align-middle mb-0 custom-amms-table">
          <thead>
            <tr>
              <th class="ps-4" style="width: 80px;"># ID</th>
              <th>Full Name</th>
              <th>Phone Number</th>
              <th>Location Branch</th>
              <th>Age Group</th>
              <th>Exemption</th>
              <th>Status</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && rawMembersList.length === 0">
              <tr v-for="i in 5" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-4"></span></td>
                <td><span class="placeholder col-4"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredMembers.length === 0">
              <td colspan="8" class="text-center py-5 text-muted">
                <i class="bi bi-person-x fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No members found matching criteria</p>
                <small>Click "Register New Member" above to add a member to the registry.</small>
              </td>
            </tr>

            <!-- Member Rows -->
            <tr v-for="m in paginatedMembers" :key="m.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ m.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="avatar-badge rounded-circle d-flex align-items-center justify-content-center text-primary font-monospace fw-bold text-xs">
                    {{ m.first_name[0] }}{{ m.last_name[0] }}
                  </div>
                  <div>
                    <span class="d-block">{{ m.first_name }} {{ m.last_name }}</span>
                  </div>
                </div>
              </td>
              <td class="font-monospace text-xs text-body">
                <i class="bi bi-telephone text-muted me-1"></i> {{ m.phone }}
              </td>
              <td class="text-xs fw-medium text-body">
                <i class="bi bi-geo-alt text-muted me-1"></i> {{ m.location?.name || getLocationName(m.location_id) }}
              </td>
              <td class="text-xs text-secondary-amms">
                {{ m.age_group?.name || getAgeGroupName(m.age_group_id) }}
              </td>
              <td>
                <span 
                  class="badge px-2 py-0.8 rounded-pill text-xs"
                  :class="m.fee_exemption === 'yes' ? 'bg-warning bg-opacity-15 text-warning border border-warning border-opacity-25' : 'bg-light text-muted'"
                >
                  {{ m.fee_exemption === 'yes' ? 'Exempted' : 'Standard' }}
                </span>
              </td>
              <td>
                <span 
                  class="badge px-2.5 py-1 rounded-pill text-xs fw-semibold"
                  :class="m.member_status === 'active' ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-20' : 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-20'"
                >
                  <i :class="m.member_status === 'active' ? 'bi bi-check-circle-fill me-1' : 'bi bi-dash-circle-fill me-1'"></i>
                  {{ m.member_status === 'active' ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openViewModal(m)"
                    title="View Member Profile"
                  >
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditModal(m)"
                    title="Edit Member Details"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDelete(m)"
                    title="Delete Member"
                  >
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Reusable Pagination Control Footer -->
      <PaginationControl
        v-if="filteredMembers.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredMembers.length"
      />

    </div>

    <!-- View Member Details Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewMemberModal"
      title="Member Profile Details"
      icon="bi bi-person-vcard"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Full Member Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingMember?.first_name }} {{ viewingMember?.last_name }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Phone Number</span>
            <span class="fw-bold font-monospace text-body">{{ viewingMember?.phone }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Father's Name</span>
            <span class="fw-medium text-body text-xs">{{ viewingMember?.fathers_name || '—' }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Mother's Name</span>
            <span class="fw-medium text-body text-xs">{{ viewingMember?.mothers_name || '—' }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Location Branch</span>
            <span class="fw-semibold text-body text-xs">{{ viewingMember ? getLocationName(viewingMember.location_id) : '—' }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Age Group</span>
            <span class="fw-semibold text-body text-xs">{{ viewingMember ? getAgeGroupName(viewingMember.age_group_id) : '—' }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Date of Birth</span>
            <span class="font-monospace text-xs text-body">{{ viewingMember?.date_of_birth }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Marital Status</span>
            <span class="text-capitalize text-xs text-body">{{ viewingMember?.marital_status }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Fee Exemption</span>
            <span class="badge px-2.5 py-1 rounded-pill text-xs" :class="viewingMember?.fee_exemption === 'yes' ? 'bg-warning bg-opacity-15 text-warning border border-warning border-opacity-25' : 'bg-light text-muted'">
              {{ viewingMember?.fee_exemption === 'yes' ? 'Exempted' : 'Standard' }}
            </span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Registration Date</span>
            <span class="font-monospace text-xs text-body">{{ viewingMember?.registration_date }}</span>
          </div>
        </div>
      </div>
    </ViewDetailModal>

    <!-- Custom Delete Confirmation Modal -->
    <div v-if="isDeleteModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <div 
      v-if="isDeleteModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      style="z-index: 1065;"
      @click.self="cancelDelete"
    >
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden text-center p-4">
          
          <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 mx-auto mb-3" style="width: 56px; height: 56px;">
            <i class="bi bi-trash3-fill fs-3"></i>
          </div>

          <h5 class="fw-bold text-primary text-sm mb-1">Confirm Deletion</h5>
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to permanently delete this member record?</p>
          
          <p class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1.5 px-3 rounded-3 d-inline-block mx-auto">
            "{{ itemToDelete?.first_name }} {{ itemToDelete?.last_name }}"
          </p>

          <div class="d-flex align-items-center justify-content-center gap-2">
            <button 
              type="button" 
              class="btn btn-sm btn-light border rounded-pill px-3.5 text-xs fw-semibold" 
              @click="cancelDelete"
            >
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-danger rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
              :disabled="isDeleting"
              @click="confirmDelete"
            >
              <span v-if="isDeleting" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Member' }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Create / Edit Member Vue Pure Modal -->
    <div v-if="isModalOpen" class="modal-backdrop fade show"></div>
    
    <div 
      v-if="isModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      @click.self="closeModal"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-person-plus me-1.5 amms-accent"></i>
              <span>{{ editingMember ? 'Edit Member Profile' : 'Register New Member' }}</span>
            </h5>
            <button 
              type="button" 
              class="btn-close position-absolute end-0 me-3" 
              @click="closeModal"
              aria-label="Close"
            ></button>
          </div>

          <form @submit.prevent="handleSave">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>

              <!-- Registration & Personal Identity -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-2">Registration & Personal Identity</h6>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="regDate" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Registration Date *</label>
                  <ClientOnly>
                    <VDatePicker v-model="registrationDate" mode="date" string-format="yyyy-MM-dd" :masks="{ input: 'DD-MM-YYYY' }">
                      <template #default="{ inputValue, inputEvents }">
                        <div class="input-group">
                          <span class="input-group-text bg-transparent border-end-0 text-muted">
                            <i class="bi bi-calendar-event text-primary"></i>
                          </span>
                          <input
                            :value="inputValue"
                            v-on="inputEvents"
                            class="form-control border-start-0 ps-1 py-2 text-sm bg-body font-monospace"
                            placeholder="DD-MM-YYYY"
                            readonly
                          />
                        </div>
                      </template>
                    </VDatePicker>
                  </ClientOnly>
                </div>

                <div class="col-md-6">
                  <div class="d-flex align-items-center justify-content-between mb-1">
                    <label for="dateOfBirth" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-0">Date of Birth *</label>
                    <span v-if="calculatedAge !== null" class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 rounded-pill text-xs">
                      Age: {{ calculatedAge }} Years
                    </span>
                  </div>
                  <ClientOnly>
                    <VDatePicker v-model="dateOfBirth" mode="date" string-format="yyyy-MM-dd" :masks="{ input: 'DD-MM-YYYY' }">
                      <template #default="{ inputValue, inputEvents }">
                        <div class="input-group">
                          <span class="input-group-text bg-transparent border-end-0 text-muted">
                            <i class="bi bi-calendar-heart text-primary"></i>
                          </span>
                          <input
                            :value="inputValue"
                            v-on="inputEvents"
                            class="form-control border-start-0 ps-1 py-2 text-sm bg-body font-monospace"
                            placeholder="DD-MM-YYYY"
                            readonly
                          />
                        </div>
                      </template>
                    </VDatePicker>
                  </ClientOnly>
                </div>

                <div class="col-md-6">
                  <label for="firstName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">First Name *</label>
                  <input id="firstName" v-model="firstName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Alice" required />
                </div>
                <div class="col-md-6">
                  <label for="lastName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Last Name *</label>
                  <input id="lastName" v-model="lastName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Smith" required />
                </div>

                <div class="col-md-6">
                  <label for="fathersName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Father's Name</label>
                  <input id="fathersName" v-model="fathersName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Bob Smith" />
                </div>
                <div class="col-md-6">
                  <label for="mothersName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Mother's Name</label>
                  <input id="mothersName" v-model="mothersName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Carol Smith" />
                </div>
              </div>

              <hr class="my-3 opacity-10" />

              <!-- Demographics & Classification Row -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-2">Demographics & Classification</h6>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="phone" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Phone Number *</label>
                  <input id="phone" v-model="phone" type="tel" maxlength="12" class="form-control py-2 text-sm font-monospace" placeholder="255755555555" required />
                </div>
                <div class="col-md-6">
                  <label for="maritalStatus" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Marital Status *</label>
                  <select id="maritalStatus" v-model="maritalStatus" class="form-select py-2 text-sm" required>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label for="locId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Location Branch *</label>
                  <select id="locId" v-model="locationId" class="form-select py-2 text-sm" required>
                    <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label for="ageGrpId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Age Group *</label>
                  <select id="ageGrpId" v-model="ageGroupId" class="form-select py-2 text-sm" required>
                    <option v-for="grp in ageGroups" :key="grp.id" :value="grp.id">{{ grp.name }}</option>
                  </select>
                </div>
              </div>

              <hr class="my-3 opacity-10" />

              <!-- System Status & Exemptions -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-2">Membership Status & Exemptions</h6>
              <div class="row g-3">
                <div class="col-md-6">
                  <label for="memStatus" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Membership Status *</label>
                  <select id="memStatus" v-model="memberStatus" class="form-select py-2 text-sm" required>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label for="feeExempt" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Fee Exemption *</label>
                  <select id="feeExempt" v-model="feeExemption" class="form-select py-2 text-sm" required>
                    <option value="no">No (Standard Fees)</option>
                    <option value="yes">Yes (Exempted from Fees)</option>
                  </select>
                </div>
              </div>

            </div>

            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-secondary rounded-pill px-3" 
                @click="closeModal"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                :disabled="isSubmitting"
              >
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Saving Member...' : (editingMember ? 'Update Member' : 'Register Member') }}</span>
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

/* Civic Registry Custom Table Styling */
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

.avatar-badge {
  width: 32px;
  height: 32px;
  background-color: rgba(27, 42, 74, 0.08);
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
