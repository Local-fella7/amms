<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'
import { useReportPdf } from '~/composables/useReportPdf'

type Gender = 'male' | 'female'
type MemberStatus = 'active' | 'inactive' | 'deceased'
type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
type FeeExemption = 'yes' | 'no'

interface Member {
  id: number
  first_name: string
  last_name: string
  gender: Gender | string
  fathers_name?: string
  mothers_name?: string
  location_id: number | string
  picture?: string
  photo?: string
  photo_url?: string
  avatar?: string
  image?: string
  email?: string
  date_of_birth: string
  member_status: MemberStatus | string
  marital_status: MaritalStatus | string
  phone: string
  fee_exemption: FeeExemption | string
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

const { data: membersResponse, loading, error, execute: fetchMembers, fetchWithAuth } = useApi<Member[] | { data: Member[] }>()
const { data: locations, execute: fetchLocations } = useApi<LocationItem[]>()
const { data: ageGroups, execute: fetchAgeGroups } = useApi<AgeGroupItem[]>()
const { downloadPdf, openPdfInNewTab, isGenerating: isDownloadingPdf } = useReportPdf()
const config = useRuntimeConfig()
const backendBase = computed(() => {
  const api = (config.public?.apiBase as string) || ''
  return api.replace(/\/api\/?$/, '')
})

const failedImageMemberIds = ref<Set<number>>(new Set())
const onMemberPhotoError = (memberId: number) => {
  failedImageMemberIds.value.add(memberId)
}
const hasValidMemberPhoto = (m?: Member | null): boolean => {
  if (!m || !getMemberPhotoPath(m)) return false
  return !failedImageMemberIds.value.has(m.id)
}
const viewingPhotoError = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const route = useRoute()
const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')
watch(() => route.query.search, (val) => {
  searchQuery.value = typeof val === 'string' ? val : ''
  currentPage.value = 1
}, { immediate: true })
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
const email = ref('')
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

const schema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  gender: z.enum(['male', 'female'], {
    errorMap: () => ({ message: 'Gender is required' })
  }),
  fathers_name: z.string().optional(),
  mothers_name: z.string().optional(),
  location_id: z.union([z.number(), z.string().min(1, 'Location branch is required')]),
  age_group_id: z.union([z.number(), z.string().min(1, 'Age group is required')]),
  date_of_birth: z.string().min(4, 'Date of birth is required'),
  phone: z.string()
    .length(12, 'Phone number must be exactly 12 digits (e.g. 255755555555)')
    .regex(/^255[0-9]{9}$/, 'Phone number must start with 255 followed by 9 digits'),
  email: z.string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  member_status: z.enum(['active', 'inactive', 'deceased'], {
    errorMap: () => ({ message: 'Membership status is required' })
  }),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed'], {
    errorMap: () => ({ message: 'Marital status is required' })
  }),
  fee_exemption: z.enum(['yes', 'no'], {
    errorMap: () => ({ message: 'Fee exemption is required' })
  }),
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
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter(m => {
      const fn = (m.first_name || '').toLowerCase()
      const ln = (m.last_name || '').toLowerCase()
      const fullName = `${fn} ${ln}`.trim()
      const reverseFullName = `${ln} ${fn}`.trim()
      const phone = (m.phone || '').toLowerCase()
      const email = (m.email || '').toLowerCase()
      const fathers = (m.fathers_name || '').toLowerCase()
      const mothers = (m.mothers_name || '').toLowerCase()
      const idStr = String(m.id)

      return fullName.includes(q) ||
        reverseFullName.includes(q) ||
        fn.includes(q) ||
        ln.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        fathers.includes(q) ||
        mothers.includes(q) ||
        idStr === q
    })
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

watch([searchQuery, selectedLocationFilter, selectedStatusFilter, selectedGenderFilter], () => {
  currentPage.value = 1
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

const getMemberPhotoPath = (m?: Member | null): string => {
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
  email.value = ''
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
  gender.value = m.gender === 'female' ? 'female' : 'male'
  fathersName.value = m.fathers_name || ''
  mothersName.value = m.mothers_name || ''
  locationId.value = m.location_id
  ageGroupId.value = m.age_group_id
  dateOfBirth.value = m.date_of_birth
  phone.value = m.phone
  email.value = m.email || ''
  memberStatus.value = (m.member_status === 'inactive' || m.member_status === 'deceased') ? m.member_status : 'active'
  maritalStatus.value = (m.marital_status === 'married' || m.marital_status === 'divorced' || m.marital_status === 'widowed') ? m.marital_status : 'single'
  feeExemption.value = m.fee_exemption === 'yes' ? 'yes' : 'no'
  registrationDate.value = m.registration_date || new Date().toISOString().substring(0, 10)
  clearPhoto()
  if (m.picture) {
    photoPreview.value = getMemberPhotoUrl(m.picture)
  }
  modalError.value = ''
  isModalOpen.value = true
}

const openViewModal = (m: Member) => {
  viewingMember.value = m
  viewingPhotoError.value = false
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingMember.value = null
  isViewModalOpen.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

const formatDateToYMD = (val: string | Date | null | undefined): string => {
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
    email: email.value.trim().toLowerCase(),
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

      if (selectedPhotoFile.value) {
        const photoFormData = new FormData()
        photoFormData.append('photo', selectedPhotoFile.value)
        photoFormData.append('crop_x', String(cropX.value || 0))
        photoFormData.append('crop_y', String(cropY.value || 0))
        photoFormData.append('crop_width', String(cropWidth.value || 400))
        photoFormData.append('crop_height', String(cropHeight.value || 400))

        await fetchWithAuth(`/api/members/${editingMember.value.id}`, {
          method: 'POST',
          body: photoFormData
        }).catch(err => {
          console.warn('Failed to upload updated member photo via POST /members/{id}:', err)
        })
      }

      push.success(`Member "${firstName.value} ${lastName.value}" updated successfully!`)
    } else {
      let requestBody: Record<string, unknown> | FormData = payload

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
        formData.append('email', payload.email)
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
  } catch (err: unknown) {
    console.error('Save member error:', err)
    modalError.value = extractErrorMessage(err, 'Failed to save member details')
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
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
    
    const success = await mutate(api => api(`/api/members/${itemToDelete.value.id}`, { method: 'DELETE' }), {
      successMessage: `Member "${itemToDelete.value.first_name} ${itemToDelete.value.last_name}" deleted successfully!`
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
        { key: 'full-name-gender', label: 'Full Name & Gender', cellClass: 'fw-semibold text-primary' },
        { key: 'contact-info', label: 'Contact Info', headerClass: 'd-none d-md-table-cell', cellClass: 'text-xs text-body d-none d-md-table-cell' },
        { key: 'location-branch', label: 'Location Branch', headerClass: 'd-none d-lg-table-cell', cellClass: 'text-xs fw-medium text-body d-none d-lg-table-cell' },
        { key: 'age-group', label: 'Age Group', headerClass: 'd-none d-lg-table-cell', cellClass: 'text-xs text-secondary-amms d-none d-lg-table-cell' },
        { key: 'registration-date', label: 'Registration Date', headerClass: 'd-none d-xl-table-cell', cellClass: 'font-monospace text-xs text-body d-none d-xl-table-cell' },
        { key: 'exemption', label: 'Exemption', headerClass: 'd-none d-sm-table-cell', cellClass: 'd-none d-sm-table-cell' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: 'Actions', align: 'right', width: '130px', headerClass: 'pe-4', cellClass: 'pe-4' }
      ]"
      :items="paginatedMembers"
      :loading="loading"
      emptyIcon="bi bi-person-x"
      emptyTitle="No members found matching criteria"
      emptySubtitle="Click 'Register New Member' above to add a member to the registry."

    >
      <template #cell-id="{ item }">
#{{ item.id }}
      </template>
      <template #cell-full-name-gender="{ item }">

                <div class="d-flex align-items-center gap-2.5">
                  <MemberAvatar :member="item" />
                  <div>
                    <span class="d-block">{{ item.first_name }} {{ item.last_name }}</span>
                    <small class="text-muted text-xs text-capitalize">
                      <i :class="item.gender === 'female' ? 'bi bi-gender-female text-danger' : 'bi bi-gender-male text-primary'" class="me-1"></i>{{ item.gender || 'male' }}
                    </small>
                  </div>
                </div>
              
      </template>
      <template #cell-contact-info="{ item }">

                <div class="font-monospace">
                  <i class="bi bi-telephone text-muted me-1"></i>{{ item.phone }}
                </div>
                <div v-if="item.email" class="text-muted text-xs text-truncate font-monospace" style="max-width: 170px;" :title="item.email">
                  <i class="bi bi-envelope text-primary me-1"></i>{{ item.email }}
                </div>
              
      </template>
      <template #cell-location-branch="{ item }">

                <i class="bi bi-geo-alt text-muted me-1"></i> {{ item.location?.name || getLocationName(item.location_id) }}
              
      </template>
      <template #cell-age-group="{ item }">

                {{ item.age_group?.name || getAgeGroupName(item.age_group_id) }}
              
      </template>
      <template #cell-registration-date="{ item }">

                {{ formatDateDisplay(item.registration_date) }}
              
      </template>
      <template #cell-exemption="{ item }">

                <span 
                  class="badge px-2.5 py-1 rounded-pill text-xs fw-semibold"
                  :class="item.fee_exemption === 'yes' ? 'badge-exempted' : 'bg-light text-muted border'"
                >
                  {{ item.fee_exemption === 'yes' ? 'Exempted' : 'Standard' }}
                </span>
              
      </template>
      <template #cell-status="{ item }">

                <span 
                  class="badge px-2.5 py-1 rounded-pill text-xs fw-semibold"
                  :class="{
                    'bg-success bg-opacity-10 text-success border border-success border-opacity-20': item.member_status === 'active',
                    'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-20': item.member_status === 'inactive',
                    'bg-dark bg-opacity-10 text-dark border border-dark border-opacity-20': item.member_status === 'deceased'
                  }"
                >
                  <i :class="{
                    'bi bi-check-circle-fill me-1': item.member_status === 'active',
                    'bi bi-dash-circle-fill me-1': item.member_status === 'inactive',
                    'bi bi-slash-circle-fill me-1': item.member_status === 'deceased'
                  }"></i>
                  {{ item.member_status === 'deceased' ? 'Deceased' : (item.member_status === 'active' ? 'Active' : 'Inactive') }}
                </span>
              
      </template>
      <template #cell-actions="{ item }">

                <div class="d-flex align-items-center justify-content-end gap-2">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openViewModal(item)"
                    title="View Member Profile"
                  >
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="exportMemberProfilePdf(item.id)"
                    title="Download Profile Dossier PDF"
                  >
                    <i class="bi bi-file-earmark-person text-danger"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openEditModal(item)"
                    title="Edit Member Details"
                  >
                    <i class="bi bi-pencil-fill text-muted"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDelete(item)"
                    title="Delete Member"
                  >
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              
      </template>
    </AppTable>

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
        <div v-if="getMemberPhotoPath(viewingMember) && !viewingPhotoError" class="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
          <div class="avatar-photo-frame rounded-circle overflow-hidden border border-2 border-primary shadow-xs" style="width: 64px; height: 64px;">
            <img 
              :src="getMemberPhotoUrl(getMemberPhotoPath(viewingMember))" 
              :alt="viewingMember?.first_name" 
              class="w-100 h-100 object-fit-cover" 
              @error="viewingPhotoError = true"
            />
          </div>
          <div>
            <h6 class="fw-bold text-primary mb-0">{{ viewingMember?.first_name }} {{ viewingMember?.last_name }}</h6>
            <small class="text-muted text-xs font-monospace">Member ID: #{{ viewingMember?.id }}</small>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Full Member Name</span>
            <span class="fw-bold text-primary fs-6">{{ viewingMember?.first_name }} {{ viewingMember?.last_name }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Gender & Phone</span>
            <span class="fw-bold text-body text-xs text-capitalize">
              {{ viewingMember?.gender }} • <span class="font-monospace">{{ viewingMember?.phone }}</span>
            </span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Email Address</span>
            <span class="fw-bold text-primary text-xs font-monospace">
              {{ viewingMember?.email || '—' }}
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
            <span class="badge px-2.5 py-1 rounded-pill text-xs fw-semibold" :class="viewingMember?.fee_exemption === 'yes' ? 'badge-exempted' : 'bg-light text-muted border'">
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

    <DeleteConfirmModal
      v-model="isDeleteModalOpen"
      message="Are you sure you want to permanently delete this member record?"
        :itemTitle="itemToDelete ? `&quot;${itemToDelete.first_name} ${itemToDelete.last_name}&quot;` : ''"
      :loading="isDeleting"
      confirmText="Delete Member"
      @confirm="confirmDelete"
    />

    <!-- Shared Member Modal Component -->
    <SharedMemberModal
      v-if="isModalOpen"
      :locations="locations || []"
      :age-groups="ageGroups || []"
      :editing-member="editingMember"
      @close="closeModal"
      @saved="loadData"
    />

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


