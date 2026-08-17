<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'
import { useReportPdf } from '~/composables/useReportPdf'

interface Member {
  id: number
  first_name: string
  last_name: string
  gender: 'male' | 'female' | string
  fathers_name?: string
  mothers_name?: string
  location_id: number | string
  picture?: string
  date_of_birth: string
  member_status: 'active' | 'inactive' | 'deceased' | string
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
  from_age?: number | string
  to_age?: number | string
}

const { data: membersResponse, loading, error, execute: fetchMembers, fetchWithAuth } = useApi<any>()
const { data: locations, execute: fetchLocations } = useApi<LocationItem[]>()
const { data: ageGroups, execute: fetchAgeGroups } = useApi<AgeGroupItem[]>()
const { downloadPdf, openPdfInNewTab, isGenerating: isDownloadingPdf } = useReportPdf()

const searchQuery = ref('')
const selectedLocationFilter = ref<string>('')
const selectedStatusFilter = ref<string>('')
const selectedGenderFilter = ref<string>('')

const isSubmitting = ref(false)
const modalError = ref('')
const editingMember = ref<Member | null>(null)
const isModalOpen = ref(false)

// Form Fields
const firstName = ref('')
const lastName = ref('')
const gender = ref<'male' | 'female'>('male')
const fathersName = ref('')
const mothersName = ref('')
const locationId = ref<string | number>('')
const ageGroupId = ref<string | number>('')
const dateOfBirth = ref('')
const phone = ref('')
const memberStatus = ref<'active' | 'inactive' | 'deceased'>('active')
const maritalStatus = ref<'single' | 'married' | 'divorced' | 'widowed'>('single')
const feeExemption = ref<'yes' | 'no'>('no')
const registrationDate = ref(new Date().toISOString().substring(0, 10))

// Photo Upload State
const photoFileInput = ref<HTMLInputElement | null>(null)
const selectedPhotoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const cropX = ref<number>(0)
const cropY = ref<number>(0)
const cropWidth = ref<number>(400)
const cropHeight = ref<number>(400)
const showCropSettings = ref(false)

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
  gender: z.enum(['male', 'female']),
  fathers_name: z.string().optional(),
  mothers_name: z.string().optional(),
  location_id: z.union([z.number(), z.string().min(1, 'Location branch is required')]),
  age_group_id: z.union([z.number(), z.string().min(1, 'Age group is required')]),
  date_of_birth: z.string().min(4, 'Date of birth is required'),
  phone: z.string()
    .length(12, 'Phone number must be exactly 12 digits (e.g. 255755555555)')
    .regex(/^255[0-9]{9}$/, 'Phone number must start with 255 followed by 9 digits'),
  member_status: z.enum(['active', 'inactive', 'deceased']),
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

  if (selectedGenderFilter.value) {
    result = result.filter(m => (m.gender || 'male') === selectedGenderFilter.value)
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
const updateAgeGroupFromDob = () => {
  if (!dateOfBirth.value) {
    calculatedAge.value = null
    return
  }

  let dobDate: Date
  if (dateOfBirth.value instanceof Date) {
    dobDate = dateOfBirth.value
  } else {
    dobDate = new Date(dateOfBirth.value)
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
      const min = g.from_age !== undefined && g.from_age !== null && g.from_age !== '' ? Number(g.from_age) : 0
      const max = g.to_age !== undefined && g.to_age !== null && g.to_age !== '' ? Number(g.to_age) : 999
      return calculatedAge.value! >= min && calculatedAge.value! <= max
    })

    if (matched) {
      ageGroupId.value = matched.id
    } else if (ageGroups.value.length > 0 && !ageGroupId.value) {
      ageGroupId.value = ageGroups.value[0].id
    }
  }
}

watch(dateOfBirth, updateAgeGroupFromDob, { immediate: true })
watch(ageGroups, updateAgeGroupFromDob)

const currentMatchedAgeGroupName = computed(() => {
  if (!ageGroupId.value || !ageGroups.value) return 'Auto-assigned from Age'
  const matched = ageGroups.value.find(g => Number(g.id) === Number(ageGroupId.value))
  return matched ? matched.name : 'Auto-assigned from Age'
})

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

const onPhotoSelected = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    selectedPhotoFile.value = file
    photoPreview.value = URL.createObjectURL(file)
  }
}

const clearPhoto = () => {
  selectedPhotoFile.value = null
  photoPreview.value = null
  if (photoFileInput.value) {
    photoFileInput.value.value = ''
  }
}

const openAddModal = () => {
  editingMember.value = null
  firstName.value = ''
  lastName.value = ''
  gender.value = 'male'
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
  clearPhoto()
  modalError.value = ''
  isModalOpen.value = true
}

const openEditModal = (m: Member) => {
  editingMember.value = m
  firstName.value = m.first_name
  lastName.value = m.last_name
  gender.value = (m.gender as any) || 'male'
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
  clearPhoto()
  if (m.picture) {
    photoPreview.value = m.picture.startsWith('http') ? m.picture : `/${m.picture}`
  }
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
  const payload = {
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    gender: gender.value,
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
      let requestBody: any = payload

      if (selectedPhotoFile.value) {
        const formData = new FormData()
        formData.append('first_name', payload.first_name)
        formData.append('last_name', payload.last_name)
        formData.append('gender', payload.gender)
        if (payload.fathers_name) formData.append('fathers_name', payload.fathers_name)
        if (payload.mothers_name) formData.append('mothers_name', payload.mothers_name)
        formData.append('location_id', String(payload.location_id))
        formData.append('age_group_id', String(payload.age_group_id))
        formData.append('date_of_birth', payload.date_of_birth)
        formData.append('phone', payload.phone)
        formData.append('member_status', payload.member_status)
        formData.append('marital_status', payload.marital_status)
        formData.append('fee_exemption', payload.fee_exemption)
        formData.append('registration_date', payload.registration_date)

        formData.append('photo', selectedPhotoFile.value)
        formData.append('crop_x', String(cropX.value || 0))
        formData.append('crop_y', String(cropY.value || 0))
        formData.append('crop_width', String(cropWidth.value || 400))
        formData.append('crop_height', String(cropHeight.value || 400))

        requestBody = formData
      }

      await fetchWithAuth('/api/members', {
        method: 'POST',
        body: requestBody
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

const getMemberPhotoUrl = (pic?: string) => {
  if (!pic) return ''
  if (pic.startsWith('http') || pic.startsWith('data:')) return pic
  return pic.startsWith('/') ? pic : `/${pic}`
}

const exportMemberProfilePdf = async (mId: number | string) => {
  try {
    await openPdfInNewTab(`/api/reports/profile/${mId}`)
    push.success('Opened member profile PDF in new tab')
  } catch (e) {
    push.error('Failed to open profile PDF')
  }
}

const exportMemberStatementPdf = async (mId: number | string) => {
  try {
    await openPdfInNewTab(`/api/reports/member-history/${mId}`)
    push.success('Opened member statement PDF in new tab')
  } catch (e) {
    push.error('Failed to open statement PDF')
  }
}

const exportMembersDirectoryPdf = async () => {
  try {
    await openPdfInNewTab('/api/reports/members')
    push.success('Opened member directory PDF in new tab')
  } catch (e) {
    push.error('Failed to open directory PDF')
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

    <!-- Integrated Table Container with Top Toolbar -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Top Table Toolbar with Integrated Filters -->
      <div class="card-header bg-body-tertiary border-bottom px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="text-xs fw-bold text-uppercase text-secondary-amms tracking-wider me-1">
            <i class="bi bi-funnel-fill text-primary me-1"></i> Quick Filters:
          </span>

          <!-- Location Branch Filter Pill -->
          <div style="min-width: 160px;">
            <select 
              v-model="selectedLocationFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedLocationFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Branches</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">Branch: {{ loc.name }}</option>
            </select>
          </div>

          <!-- Membership Status Filter Pill -->
          <div style="min-width: 150px;">
            <select 
              v-model="selectedStatusFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedStatusFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="inactive">Inactive Members</option>
              <option value="deceased">Deceased Members</option>
            </select>
          </div>

          <!-- Gender Filter Pill -->
          <div style="min-width: 130px;">
            <select 
              v-model="selectedGenderFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedGenderFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <!-- Clear Filters Link -->
          <button 
            v-if="selectedLocationFilter || selectedStatusFilter || selectedGenderFilter || searchQuery"
            type="button" 
            class="btn btn-xs btn-link text-danger text-xs text-decoration-none px-2 fw-semibold ms-1"
            @click="selectedLocationFilter = ''; selectedStatusFilter = ''; selectedGenderFilter = ''; searchQuery = ''"
          >
            <i class="bi bi-x-lg me-1"></i> Clear Filters
          </button>
        </div>

        <div class="d-flex align-items-center gap-3">
          <!-- Total Filtered Counter Badge -->
          <div class="text-xs text-muted font-monospace d-none d-sm-block">
            Showing <span class="fw-bold text-primary">{{ filteredMembers.length }}</span> members
          </div>

          <!-- Export Directory PDF Button -->
          <button
            type="button"
            class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-xs"
            :disabled="isDownloadingPdf"
            @click="exportMembersDirectoryPdf"
            title="Download PDF Member Directory"
          >
            <span v-if="isDownloadingPdf" class="spinner-border spinner-border-sm" role="status"></span>
            <i v-else class="bi bi-file-earmark-pdf-fill text-danger"></i>
            <span>{{ isDownloadingPdf ? 'Exporting...' : 'Export Directory' }}</span>
          </button>
        </div>
      </div>

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
              <th class="ps-4" style="width: 70px;"># ID</th>
              <th>Full Name & Gender</th>
              <th>Phone Number</th>
              <th>Location Branch</th>
              <th>Age Group</th>
              <th>Registration Date</th>
              <th>Exemption</th>
              <th>Status</th>
              <th class="text-end pe-4" style="width: 170px;">Actions</th>
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
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-4"></span></td>
                <td><span class="placeholder col-4"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredMembers.length === 0">
              <td colspan="9" class="text-center py-5 text-muted">
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
                  <div v-if="m.picture" class="avatar-badge rounded-circle overflow-hidden d-flex align-items-center justify-content-center">
                    <img :src="getMemberPhotoUrl(m.picture)" :alt="m.first_name" class="w-100 h-100 object-fit-cover" />
                  </div>
                  <div v-else class="avatar-badge rounded-circle d-flex align-items-center justify-content-center text-primary font-monospace fw-bold text-xs">
                    {{ m.first_name[0] }}{{ m.last_name[0] }}
                  </div>
                  <div>
                    <span class="d-block">{{ m.first_name }} {{ m.last_name }}</span>
                    <small class="text-muted text-xs text-capitalize">
                      <i :class="m.gender === 'female' ? 'bi bi-gender-female text-danger' : 'bi bi-gender-male text-primary'" class="me-1"></i>{{ m.gender || 'male' }}
                    </small>
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
              <td class="font-monospace text-xs text-body">
                {{ formatDateDisplay(m.registration_date) }}
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
                  :class="{
                    'bg-success bg-opacity-10 text-success border border-success border-opacity-20': m.member_status === 'active',
                    'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-20': m.member_status === 'inactive',
                    'bg-dark bg-opacity-10 text-dark border border-dark border-opacity-20': m.member_status === 'deceased'
                  }"
                >
                  <i :class="{
                    'bi bi-check-circle-fill me-1': m.member_status === 'active',
                    'bi bi-dash-circle-fill me-1': m.member_status === 'inactive',
                    'bi bi-slash-circle-fill me-1': m.member_status === 'deceased'
                  }"></i>
                  {{ m.member_status === 'deceased' ? 'Deceased' : (m.member_status === 'active' ? 'Active' : 'Inactive') }}
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
                    @click="exportMemberProfilePdf(m.id)"
                    title="Download Profile Dossier PDF"
                  >
                    <i class="bi bi-file-earmark-person text-danger"></i>
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
        
        <!-- Member Photo Banner if available -->
        <div v-if="viewingMember?.picture" class="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
          <div class="avatar-photo-frame rounded-circle overflow-hidden border border-2 border-primary shadow-xs" style="width: 64px; height: 64px;">
            <img :src="getMemberPhotoUrl(viewingMember.picture)" :alt="viewingMember.first_name" class="w-100 h-100 object-fit-cover" />
          </div>
          <div>
            <h6 class="fw-bold text-primary mb-0">{{ viewingMember.first_name }} {{ viewingMember.last_name }}</h6>
            <small class="text-muted text-xs font-monospace">Member ID: #{{ viewingMember.id }}</small>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Full Member Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingMember?.first_name }} {{ viewingMember?.last_name }}</span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Gender & Phone</span>
            <span class="fw-bold text-body text-xs text-capitalize">
              {{ viewingMember?.gender }} • <span class="font-monospace">{{ viewingMember?.phone }}</span>
            </span>
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
            <span class="font-monospace text-xs text-body">{{ formatDateDisplay(viewingMember?.date_of_birth) }}</span>
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
            <span class="font-monospace text-xs text-body">{{ formatDateDisplay(viewingMember?.registration_date) }}</span>
          </div>
        </div>
      </div>

      <!-- Modal Footer Quick Action Export Buttons -->
      <div class="d-flex justify-content-end gap-2 pt-2 border-top">
        <button
          v-if="viewingMember"
          type="button"
          class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-xs"
          @click="exportMemberStatementPdf(viewingMember.id)"
        >
          <i class="bi bi-receipt text-success"></i>
          <span>Financial Statement PDF</span>
        </button>
        <button
          v-if="viewingMember"
          type="button"
          class="btn btn-sm btn-primary rounded-pill px-3 py-1.5 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-xs"
          @click="exportMemberProfilePdf(viewingMember.id)"
        >
          <i class="bi bi-file-earmark-person-fill"></i>
          <span>Profile Dossier PDF</span>
        </button>
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

              <!-- Photo Upload & Cropping Section -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-2">
                <i class="bi bi-camera me-1"></i> Member Photograph (Optional)
              </h6>
              <div class="d-flex align-items-center gap-3 p-3 bg-body-tertiary rounded-3 border mb-3">
                <div class="position-relative" style="width: 64px; height: 64px;">
                  <img 
                    v-if="photoPreview" 
                    :src="photoPreview" 
                    class="w-100 h-100 rounded-circle object-fit-cover border border-2 border-primary" 
                    alt="Photo Preview"
                  />
                  <div 
                    v-else 
                    class="w-100 h-100 rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center text-muted"
                  >
                    <i class="bi bi-person fs-3"></i>
                  </div>
                </div>

                <div class="flex-grow-1">
                  <input
                    ref="photoFileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    class="form-control form-control-sm text-xs"
                    @change="onPhotoSelected"
                  />
                  <div class="d-flex align-items-center justify-content-between mt-1">
                    <small class="text-muted text-xs">JPG, PNG or WebP (Max 5MB). Processed into WebP by backend.</small>
                    <button 
                      v-if="photoPreview" 
                      type="button" 
                      class="btn btn-link btn-xs text-danger text-decoration-none p-0"
                      @click="clearPhoto"
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
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

                <div class="col-md-4">
                  <label for="firstName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">First Name *</label>
                  <input id="firstName" v-model="firstName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Alice" required />
                </div>
                <div class="col-md-4">
                  <label for="lastName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Last Name *</label>
                  <input id="lastName" v-model="lastName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Smith" required />
                </div>
                <div class="col-md-4">
                  <label for="memberGender" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Gender *</label>
                  <select id="memberGender" v-model="gender" class="form-select py-2 text-sm" required>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
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
                  <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                    Age Group
                    <span class="text-primary text-lowercase fw-normal">(auto-computed)</span>
                  </label>
                  <div class="form-control py-2 text-sm bg-body-tertiary d-flex align-items-center justify-content-between border shadow-xs" style="height: 38px;">
                    <span class="fw-semibold text-primary d-flex align-items-center gap-1.5">
                      <i class="bi bi-people-fill amms-accent"></i>
                      <span>{{ currentMatchedAgeGroupName }}</span>
                    </span>
                    <span v-if="calculatedAge !== null" class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 rounded-pill text-xs font-monospace">
                      {{ calculatedAge }} yrs
                    </span>
                  </div>
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
                    <option value="deceased">Deceased</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase d-block">
                    Fee Exemption
                  </label>
                  <div class="p-2.5 bg-body-tertiary rounded-3 border d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                      <i 
                        :class="feeExemption === 'yes' ? 'bi bi-shield-slash-fill text-warning' : 'bi bi-shield-check text-success'" 
                        class="fs-5"
                      ></i>
                      <div>
                        <span class="d-block fw-semibold text-xs text-body">
                          {{ feeExemption === 'yes' ? 'Fee Exempted' : 'Standard Fees' }}
                        </span>
                        <small class="text-muted" style="font-size: 0.725rem;">
                          {{ feeExemption === 'yes' ? 'Excluded from regular dues' : 'Applies standard fee schedule' }}
                        </small>
                      </div>
                    </div>

                    <div class="form-check form-switch m-0 ps-0 pe-1 d-flex align-items-center">
                      <input 
                        id="feeExemptionToggle" 
                        class="form-check-input ms-0 cursor-pointer" 
                        type="checkbox" 
                        role="switch"
                        style="width: 2.6em; height: 1.4em;"
                        :checked="feeExemption === 'yes'"
                        @change="feeExemption = ($event.target as HTMLInputElement).checked ? 'yes' : 'no'"
                      />
                    </div>
                  </div>
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
.filter-pill-select {
  height: 34px;
  line-height: 1.5;
  transition: all 0.2s ease;
}

.filter-pill-select:hover {
  border-color: var(--amms-primary) !important;
}

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
