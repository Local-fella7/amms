import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'
import { resolveAssetUrl } from '~/utils/image'
import type { Member, Location, AgeGroup } from '~/types'

const props = defineProps<{
  locations: Location[]
  ageGroups: AgeGroup[]
  editingMember?: Member | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const { fetchWithAuth } = useApi<Member>()

const isSubmitting = ref(false)
const modalError = ref('')

const firstName = ref('')
const lastName = ref('')
const gender = ref<'male' | 'female'>('male')
const fathersName = ref('')
const mothersName = ref('')
const locationId = ref<string | number>('')
const ageGroupId = ref<string | number>('')
const dateOfBirth = ref('1990-01-01')
const phone = ref('255')
const email = ref('')
const memberStatus = ref<'active' | 'inactive' | 'deceased'>('active')
const maritalStatus = ref<'single' | 'married' | 'divorced' | 'widowed'>('single')
const feeExemption = ref<'yes' | 'no'>('no')
const registrationDate = ref(new Date().toISOString().substring(0, 10))

const photoFileInput = ref<HTMLInputElement | null>(null)
const selectedPhotoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const cropX = ref<number>(0)
const cropY = ref<number>(0)
const cropWidth = ref<number>(400)
const cropHeight = ref<number>(400)

const calculatedAge = ref<number | null>(null)

const schema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Gender is required' }) }),
  location_id: z.union([z.number(), z.string().min(1, 'Location branch is required')]),
  age_group_id: z.union([z.number(), z.string().min(1, 'Age group is required')]),
  date_of_birth: z.string().min(4, 'Date of birth is required'),
  phone: z.string()
    .length(12, 'Phone number must be exactly 12 digits (e.g. 255755555555)')
    .regex(/^255[0-9]{9}$/, 'Phone number must start with 255 followed by 9 digits'),
  email: z.string().trim().email('Please enter a valid email address').optional().or(z.literal('')),
  member_status: z.enum(['active', 'inactive', 'deceased'], { errorMap: () => ({ message: 'Membership status is required' }) }),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed'], { errorMap: () => ({ message: 'Marital status is required' }) }),
  fee_exemption: z.enum(['yes', 'no'], { errorMap: () => ({ message: 'Fee exemption is required' }) }),
  registration_date: z.string().min(4, 'Registration date is required')
})

const getMemberPhotoUrl = (pic?: string) => {
  return resolveAssetUrl(pic)
}

// Initialize form when editing member changes
watch(() => props.editingMember, (member) => {
  if (member) {
    firstName.value = member.first_name || ''
    lastName.value = member.last_name || ''
    gender.value = member.gender || 'male'
    fathersName.value = member.fathers_name || ''
    mothersName.value = member.mothers_name || ''
    locationId.value = member.location_id || ''
    ageGroupId.value = member.age_group_id || ''
    dateOfBirth.value = member.date_of_birth ? member.date_of_birth.substring(0, 10) : '1990-01-01'
    phone.value = member.phone || '255'
    email.value = member.email || ''
    memberStatus.value = member.member_status || 'active'
    maritalStatus.value = member.marital_status || 'single'
    feeExemption.value = member.fee_exemption || 'no'
    registrationDate.value = member.registration_date ? member.registration_date.substring(0, 10) : new Date().toISOString().substring(0, 10)
    selectedPhotoFile.value = null
    const existingPhoto = member.photo || member.picture || member.photo_url || member.avatar || ''
    photoPreview.value = existingPhoto ? getMemberPhotoUrl(existingPhoto) : null
  } else {
    firstName.value = ''
    lastName.value = ''
    gender.value = 'male'
    fathersName.value = ''
    mothersName.value = ''
    locationId.value = props.locations?.length > 0 ? props.locations[0].id : ''
    ageGroupId.value = props.ageGroups?.length > 0 ? props.ageGroups[0].id : ''
    dateOfBirth.value = '1990-01-01'
    phone.value = '255'
    email.value = ''
    memberStatus.value = 'active'
    maritalStatus.value = 'single'
    feeExemption.value = 'no'
    registrationDate.value = new Date().toISOString().substring(0, 10)
    selectedPhotoFile.value = null
    photoPreview.value = null
  }
  modalError.value = ''
}, { immediate: true })

// Auto-calculate age & auto-select matching age group
const updateAgeGroupFromDob = () => {
  if (!dateOfBirth.value) { calculatedAge.value = null; return }
  let dobDate: Date
  if (dateOfBirth.value instanceof Date) {
    dobDate = dateOfBirth.value as Date
  } else {
    dobDate = new Date(dateOfBirth.value)
  }
  if (isNaN(dobDate.getTime())) { calculatedAge.value = null; return }

  const today = new Date()
  let age = today.getFullYear() - dobDate.getFullYear()
  const monthDiff = today.getMonth() - dobDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) { age-- }
  calculatedAge.value = age >= 0 ? age : 0

  if (props.ageGroups && props.ageGroups.length > 0 && calculatedAge.value !== null) {
    const matched = props.ageGroups.find((g: AgeGroup) => {
      const min = g.from_age !== undefined && g.from_age !== null && g.from_age !== '' ? Number(g.from_age) : 0
      const max = g.to_age !== undefined && g.to_age !== null && g.to_age !== '' ? Number(g.to_age) : 999
      return calculatedAge.value! >= min && calculatedAge.value! <= max
    })
    if (matched) { ageGroupId.value = matched.id }
    else if (props.ageGroups.length > 0 && !ageGroupId.value) { ageGroupId.value = props.ageGroups[0].id }
  }
}
watch(dateOfBirth, updateAgeGroupFromDob, { immediate: true })
watch(() => props.ageGroups, updateAgeGroupFromDob)

const currentMatchedAgeGroupName = computed(() => {
  if (!ageGroupId.value || !props.ageGroups) return 'Auto-assigned from Age'
  const matched = props.ageGroups.find((g: AgeGroup) => Number(g.id) === Number(ageGroupId.value))
  return matched ? matched.name : 'Auto-assigned from Age'
})

// Auto-format phone — enforce 255 prefix
watch(phone, (val) => {
  if (!val) { phone.value = '255'; return }
  let digits = val.replace(/\D/g, '')
  if (!digits.startsWith('255')) { digits = '255' + digits.replace(/^255?/, '') }
  if (digits.startsWith('2550')) { digits = '255' + digits.slice(4).replace(/^0+/, '') }
  if (digits.length > 12) { digits = digits.slice(0, 12) }
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
  if (photoFileInput.value) { photoFileInput.value.value = '' }
}

const formatDateToYMD = (val: string | Date | null | undefined): string => {
  if (!val) return new Date().toISOString().substring(0, 10)
  if (val instanceof Date) {
    const yyyy = val.getFullYear()
    const mm = String(val.getMonth() + 1).padStart(2, '0')
    const dd = String(val.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  if (typeof val === 'string') return val.substring(0, 10)
  return String(val)
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
    if (props.editingMember) {
      if (selectedPhotoFile.value) {
        const optimizedPhoto = await optimizeImageFile(selectedPhotoFile.value, 800, 0.85)
        const updateFormData = new FormData()
        // Method spoofing required by PHP/CodeIgniter 4 for multipart updates with file upload
        updateFormData.append('_method', 'PUT')
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) updateFormData.append(k, String(v))
        })
        updateFormData.append('photo', optimizedPhoto)

        try {
          await fetchWithAuth(`/api/members/${props.editingMember.id}`, {
            method: 'POST',
            body: updateFormData
          })
          push.success(`Member "${firstName.value} ${lastName.value}" and photo updated successfully!`)
        } catch (photoErr: unknown) {
          // Fallback to updating member text details via PUT JSON so textual edits are preserved
          await fetchWithAuth(`/api/members/${props.editingMember.id}`, {
            method: 'PUT',
            body: payload
          })
          const photoMsg = extractErrorMessage(photoErr, 'Photo could not be processed')
          push.warning(`Member profile saved, but photo could not be uploaded: ${photoMsg}`)
        }
      } else {
        await fetchWithAuth(`/api/members/${props.editingMember.id}`, {
          method: 'PUT',
          body: payload
        })
        push.success(`Member "${firstName.value} ${lastName.value}" updated successfully!`)
      }
    } else {
      let requestBody: Record<string, unknown> | FormData = payload
      if (selectedPhotoFile.value) {
        const optimizedPhoto = await optimizeImageFile(selectedPhotoFile.value, 800, 0.85)
        const formData = new FormData()
        Object.entries(payload).forEach(([k, v]) => { if (v !== undefined) formData.append(k, String(v)) })
        formData.append('photo', optimizedPhoto)
        requestBody = formData
      }
      await fetchWithAuth('/api/members', { method: 'POST', body: requestBody })
      push.success(`Member "${firstName.value} ${lastName.value}" registered successfully!`)
    }
    emit('saved')
    emit('close')
  } catch (err: unknown) {
    modalError.value = extractErrorMessage(err, 'Failed to save member details')
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="isSubmitting || true" class="modal-backdrop fade show" @click="emit('close')"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" @click.self="emit('close')">
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <form class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden" @submit.prevent="handleSave">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-person-plus me-1.5 amms-accent"></i>
              <span>{{ editingMember ? 'Edit Member Profile' : 'Register New Member' }}</span>
            </h5>
            <button type="button" class="btn-close position-absolute end-0 me-3" @click="emit('close')" aria-label="Close"></button>
          </div>

          <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>

              <!-- Photo Upload Section -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-2">
                <i class="bi bi-camera me-1"></i> Member Photograph (Optional)
              </h6>
              <div class="d-flex flex-column flex-sm-row align-items-center gap-3 p-3 bg-body-tertiary rounded-3 border mb-3 text-center text-sm-start">
                <div class="position-relative flex-shrink-0" style="width: 64px; height: 64px;">
                  <img 
                    v-if="photoPreview" 
                    :src="photoPreview" 
                    class="w-100 h-100 rounded-circle object-fit-cover border border-2 border-primary" 
                    alt="Photo Preview"
                    @error="photoPreview = null"
                  />
                  <div v-else class="w-100 h-100 rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center text-muted">
                    <i class="bi bi-person fs-3"></i>
                  </div>
                </div>
                <div class="flex-grow-1 w-100">
                  <input
                    ref="photoFileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    class="form-control form-control-sm text-xs"
                    @change="onPhotoSelected"
                  />
                  <div class="d-flex flex-column flex-sm-row align-items-center justify-content-between mt-1 gap-1">
                    <small class="text-muted text-xs">JPG, PNG or WebP (Max 5MB). Processed into WebP by backend.</small>
                    <button v-if="photoPreview" type="button" class="btn btn-link btn-xs text-danger text-decoration-none p-0" @click="clearPhoto">
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
                          <span class="input-group-text bg-transparent border-end-0 text-muted"><i class="bi bi-calendar-event text-primary"></i></span>
                          <input :value="inputValue" v-on="inputEvents" class="form-control border-start-0 ps-1 py-2 text-sm bg-body font-monospace" placeholder="DD-MM-YYYY" readonly />
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
                          <span class="input-group-text bg-transparent border-end-0 text-muted"><i class="bi bi-calendar-heart text-primary"></i></span>
                          <input :value="inputValue" v-on="inputEvents" class="form-control border-start-0 ps-1 py-2 text-sm bg-body font-monospace" placeholder="DD-MM-YYYY" readonly />
                        </div>
                      </template>
                    </VDatePicker>
                  </ClientOnly>
                </div>

                <div class="col-md-4">
                  <label for="smFirstName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">First Name *</label>
                  <input id="smFirstName" v-model="firstName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Alice" required />
                </div>
                <div class="col-md-4">
                  <label for="smLastName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Last Name *</label>
                  <input id="smLastName" v-model="lastName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Smith" required />
                </div>
                <div class="col-md-4">
                  <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Gender *</label>
                  <div class="d-flex align-items-stretch" style="gap: 12px; min-height: 38px;">
                    <label class="flex-fill d-flex align-items-center justify-content-center gap-2 px-2 py-1.5 rounded-3 border cursor-pointer mb-0 transition-all select-none"
                      :class="gender === 'male' ? 'border-primary bg-primary bg-opacity-10 text-primary fw-bold shadow-xs' : 'bg-body border-secondary border-opacity-25 text-muted fw-medium'">
                      <input v-model="gender" class="form-check-input m-0 cursor-pointer" type="radio" name="smGender" value="male" style="width: 1.15em; height: 1.15em;" required />
                      <i class="bi bi-gender-male fs-6"></i><span class="text-sm">Male</span>
                    </label>
                    <label class="flex-fill d-flex align-items-center justify-content-center gap-2 px-2 py-1.5 rounded-3 border cursor-pointer mb-0 transition-all select-none"
                      :class="gender === 'female' ? 'border-danger bg-danger bg-opacity-10 text-danger fw-bold shadow-xs' : 'bg-body border-secondary border-opacity-25 text-muted fw-medium'">
                      <input v-model="gender" class="form-check-input m-0 cursor-pointer" type="radio" name="smGender" value="female" style="width: 1.15em; height: 1.15em;" required />
                      <i class="bi bi-gender-female fs-6"></i><span class="text-sm">Female</span>
                    </label>
                  </div>
                </div>

                <div class="col-md-6">
                  <label for="smFathersName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Father's Name</label>
                  <input id="smFathersName" v-model="fathersName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Bob Smith" />
                </div>
                <div class="col-md-6">
                  <label for="smMothersName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Mother's Name</label>
                  <input id="smMothersName" v-model="mothersName" type="text" class="form-control py-2 text-sm" placeholder="e.g. Carol Smith" />
                </div>
              </div>

              <hr class="my-3 opacity-10" />

              <!-- Demographics & Classification -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-2">Demographics & Classification</h6>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="smPhone" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Phone Number *</label>
                  <input id="smPhone" v-model="phone" type="tel" maxlength="12" class="form-control py-2 text-sm font-monospace" placeholder="255755555555" required />
                </div>
                <div class="col-md-6">
                  <label for="smEmail" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                    Email Address <span class="text-muted text-lowercase fw-normal">(optional)</span>
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted"><i class="bi bi-envelope text-primary"></i></span>
                    <input id="smEmail" v-model="email" type="email" class="form-control border-start-0 ps-1 py-2 text-sm font-monospace" placeholder="member@example.com" />
                  </div>
                </div>

                <div class="col-md-4">
                  <label for="smMarital" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Marital Status *</label>
                  <select id="smMarital" v-model="maritalStatus" class="form-select py-2 text-sm" required>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>

                <div class="col-md-4">
                  <label for="smLocId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Location Branch *</label>
                  <select id="smLocId" v-model="locationId" class="form-select py-2 text-sm" required>
                    <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
                  </select>
                </div>

                <div class="col-md-4">
                  <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                    Age Group <span class="text-primary text-lowercase fw-normal">(auto-computed)</span>
                  </label>
                  <div class="form-control py-2 text-sm bg-body-tertiary d-flex align-items-center justify-content-between border shadow-xs" style="height: 38px;">
                    <span class="fw-semibold text-primary d-flex align-items-center gap-1.5 text-truncate">
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

              <!-- Membership Status & Exemptions -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-2">Membership Status & Exemptions</h6>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Membership Status *</label>
                  <div class="d-flex flex-wrap flex-sm-nowrap align-items-stretch" style="gap: 8px; min-height: 38px;">
                    <label class="flex-fill d-flex align-items-center justify-content-center gap-1.5 px-2 py-1.5 rounded-3 border cursor-pointer mb-0 transition-all select-none text-nowrap"
                      :class="memberStatus === 'active' ? 'border-primary bg-primary bg-opacity-10 text-primary fw-bold shadow-xs' : 'bg-body border-secondary border-opacity-25 text-muted fw-medium'">
                      <input v-model="memberStatus" class="form-check-input m-0 cursor-pointer" type="radio" name="smStatus" value="active" style="width: 1.1em; height: 1.1em;" required />
                      <i class="bi bi-check-circle-fill fs-6 text-success"></i><span class="text-xs">Active</span>
                    </label>
                    <label class="flex-fill d-flex align-items-center justify-content-center gap-1.5 px-2 py-1.5 rounded-3 border cursor-pointer mb-0 transition-all select-none text-nowrap"
                      :class="memberStatus === 'inactive' ? 'border-secondary bg-secondary bg-opacity-10 text-secondary fw-bold shadow-xs' : 'bg-body border-secondary border-opacity-25 text-muted fw-medium'">
                      <input v-model="memberStatus" class="form-check-input m-0 cursor-pointer" type="radio" name="smStatus" value="inactive" style="width: 1.1em; height: 1.1em;" required />
                      <i class="bi bi-dash-circle-fill fs-6"></i><span class="text-xs">Inactive</span>
                    </label>
                    <label class="flex-fill d-flex align-items-center justify-content-center gap-1.5 px-2 py-1.5 rounded-3 border cursor-pointer mb-0 transition-all select-none text-nowrap"
                      :class="memberStatus === 'deceased' ? 'border-dark bg-dark bg-opacity-10 text-dark fw-bold shadow-xs' : 'bg-body border-secondary border-opacity-25 text-muted fw-medium'">
                      <input v-model="memberStatus" class="form-check-input m-0 cursor-pointer" type="radio" name="smStatus" value="deceased" style="width: 1.1em; height: 1.1em;" required />
                      <i class="bi bi-slash-circle-fill fs-6"></i><span class="text-xs">Deceased</span>
                    </label>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Fee Exemption *</label>
                  <div class="d-flex align-items-stretch" style="gap: 12px; min-height: 38px;">
                    <label class="flex-fill d-flex align-items-center justify-content-center gap-2 px-2 py-1.5 rounded-3 border cursor-pointer mb-0 transition-all select-none"
                      :class="feeExemption === 'no' ? 'border-primary bg-primary bg-opacity-10 text-primary fw-bold shadow-xs' : 'bg-body border-secondary border-opacity-25 text-muted fw-medium'">
                      <input v-model="feeExemption" class="form-check-input m-0 cursor-pointer" type="radio" name="smExemption" value="no" style="width: 1.15em; height: 1.15em;" required />
                      <i class="bi bi-shield-check fs-6"></i><span class="text-sm">Standard (No)</span>
                    </label>
                    <label class="flex-fill d-flex align-items-center justify-content-center gap-2 px-2 py-1.5 rounded-3 border cursor-pointer mb-0 transition-all select-none"
                      :class="feeExemption === 'yes' ? 'border-warning bg-warning bg-opacity-10 text-warning fw-bold shadow-xs' : 'bg-body border-secondary border-opacity-25 text-muted fw-medium'">
                      <input v-model="feeExemption" class="form-check-input m-0 cursor-pointer" type="radio" name="smExemption" value="yes" style="width: 1.15em; height: 1.15em;" required />
                      <i class="bi bi-shield-slash fs-6"></i><span class="text-sm">Exempted (Yes)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3" @click="emit('close')">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Saving Member...' : (editingMember ? 'Update Member' : 'Register Member') }}</span>
              </button>
            </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }
</style>
