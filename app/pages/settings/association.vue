<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { z } from 'zod'

interface Association {
  id?: number
  name: string
  address: string
  chairman_phone: string
  secretary_phone: string
  treasurer_phone: string
  registrar_phone: string
  logo?: string | null
  created_at?: string
  updated_at?: string
}

const { data: associationData, loading, error, execute: fetchAssociation, fetchWithAuth } = useApi<any>()
const config = useRuntimeConfig()
const backendBase = computed(() => {
  const api = (config.public?.apiBase as string) || ''
  return api.replace(/\/api\/?$/, '')
})

const isSaving = ref(false)
const formError = ref('')
const associationId = ref<number | null>(null)

// Form Fields
const name = ref('')
const address = ref('')
const chairmanPhone = ref('')
const secretaryPhone = ref('')
const treasurerPhone = ref('')
const registrarPhone = ref('')

// Logo State
const currentLogoPath = ref<string | null>(null)
const selectedLogoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const logoFileInput = ref<HTMLInputElement | null>(null)
const logoLoadError = ref(false)
const logoTimestamp = ref<number>(Date.now())

const getLogoUrl = (path?: string | null) => {
  if (!path) return ''
  if (path.startsWith('blob:') || path.startsWith('data:')) return path
  const cleanPath = path.replace(/^\/+/, '')
  const base = backendBase.value ? backendBase.value.replace(/\/+$/, '') : ''
  const fullUrl = base ? `${base}/${cleanPath}` : `/${cleanPath}`
  const separator = fullUrl.includes('?') ? '&' : '?'
  return `${fullUrl}${separator}t=${logoTimestamp.value}`
}

const onLogoError = () => {
  logoLoadError.value = true
}

const onLogoSelected = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    selectedLogoFile.value = file
    logoLoadError.value = false
    logoPreview.value = URL.createObjectURL(file)
  }
}

const clearLogoSelection = () => {
  selectedLogoFile.value = null
  logoLoadError.value = false
  logoPreview.value = currentLogoPath.value ? getLogoUrl(currentLogoPath.value) : null
  if (logoFileInput.value) {
    logoFileInput.value.value = ''
  }
}

const schema = z.object({
  name: z.string().min(2, 'Association name must be at least 2 characters'),
  address: z.string().min(2, 'Address is required'),
  chairman_phone: z.string().min(10, 'Chairman phone number must be at least 10 digits'),
  secretary_phone: z.string().min(10, 'Secretary phone number must be at least 10 digits'),
  treasurer_phone: z.string().min(10, 'Treasurer phone number must be at least 10 digits'),
  registrar_phone: z.string().min(10, 'Registrar phone number must be at least 10 digits')
})

const loadData = async () => {
  try {
    const res = await fetchAssociation((api) => api('/api/association'))
    const record = Array.isArray(res) ? res[0] : (res?.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : res)
    
    if (record) {
      associationId.value = record.id || 1
      name.value = record.name || ''
      address.value = record.address || ''
      chairmanPhone.value = record.chairman_phone || ''
      secretaryPhone.value = record.secretary_phone || ''
      treasurerPhone.value = record.treasurer_phone || ''
      registrarPhone.value = record.registrar_phone || ''
      currentLogoPath.value = record.logo || null
      logoLoadError.value = false
      logoTimestamp.value = Date.now()
      if (record.logo) {
        logoPreview.value = getLogoUrl(record.logo)
      } else {
        logoPreview.value = null
      }
    }
  } catch (err) {
    // Error handled by composable
  }
}

const handleSave = async () => {
  formError.value = ''

  const payload: Association = {
    name: name.value.trim(),
    address: address.value.trim(),
    chairman_phone: chairmanPhone.value.trim(),
    secretary_phone: secretaryPhone.value.trim(),
    treasurer_phone: treasurerPhone.value.trim(),
    registrar_phone: registrarPhone.value.trim()
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    formError.value = validation.error.issues[0].message
    push.error(formError.value)
    return
  }

  isSaving.value = true
  try {
    if (associationId.value) {
      if (selectedLogoFile.value) {
        const formData = new FormData()
        formData.append('name', payload.name)
        formData.append('address', payload.address)
        formData.append('chairman_phone', payload.chairman_phone)
        formData.append('secretary_phone', payload.secretary_phone)
        formData.append('treasurer_phone', payload.treasurer_phone)
        formData.append('registrar_phone', payload.registrar_phone)
        formData.append('logo', selectedLogoFile.value)
        formData.append('_method', 'PUT')

        await fetchWithAuth(`/api/association/${associationId.value}`, {
          method: 'POST',
          body: formData
        })
      } else {
        await fetchWithAuth(`/api/association/${associationId.value}`, {
          method: 'PUT',
          body: payload
        })
      }
    } else {
      if (selectedLogoFile.value) {
        const formData = new FormData()
        formData.append('name', payload.name)
        formData.append('address', payload.address)
        formData.append('chairman_phone', payload.chairman_phone)
        formData.append('secretary_phone', payload.secretary_phone)
        formData.append('treasurer_phone', payload.treasurer_phone)
        formData.append('registrar_phone', payload.registrar_phone)
        formData.append('logo', selectedLogoFile.value)

        await fetchWithAuth('/api/association', {
          method: 'POST',
          body: formData
        })
      } else {
        await fetchWithAuth('/api/association', {
          method: 'POST',
          body: payload
        })
      }
    }
    
    selectedLogoFile.value = null
    logoTimestamp.value = Date.now()
    push.success('Association profile updated successfully!')
    await loadData()
  } catch (err: any) {
    console.error('Save association error:', err)
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    formError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save association profile'
    push.error(formError.value)
  } finally {
    isSaving.value = false
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
      title="Association Profile"
      subtitle="Manage organization details and executive contact information"
      :loading="loading"
      hideRefresh
    />

    <div class="row justify-content-center">
      <div class="col-lg-10 col-xl-8">
        
        <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden position-relative">
          

          <!-- Card Header Banner -->
          <div class="card-header bg-primary text-white p-4 border-0">
            <div class="d-flex align-items-center gap-3">
              <div class="rounded-3 overflow-hidden bg-white bg-opacity-10 d-flex align-items-center justify-content-center shadow-sm" style="width: 56px; height: 56px; flex-shrink: 0;">
                <img
                  v-if="logoPreview && !logoLoadError"
                  :src="logoPreview"
                  alt="Association Logo"
                  class="w-100 h-100 object-fit-contain p-1 bg-white rounded-3"
                  @error="onLogoError"
                />
                <i v-else class="bi bi-building fs-2 amms-accent"></i>
              </div>
              <div>
                <h5 class="fw-bold mb-0 text-white">{{ name || 'Association Profile' }}</h5>
                <small class="text-white-50 text-xs">Official Association Registry & Leadership Contacts</small>
              </div>
            </div>
          </div>

          <!-- Card Body Form -->
          <div class="card-body p-4 p-md-5">
            
            <div v-if="formError" class="alert alert-danger py-2.5 px-3.5 mb-4 rounded-3 text-sm d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
              <span>{{ formError }}</span>
            </div>

            <form @submit.prevent="handleSave">
              
              <!-- Association Logo Section -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-3">
                <i class="bi bi-image me-1.5 amms-accent"></i> Association Logo
              </h6>

              <div class="p-3 mb-4 rounded-3 border bg-body-tertiary d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3">
                <div class="d-flex align-items-center gap-3">
                  <!-- Logo Preview Box -->
                  <div
                    class="rounded-3 border bg-white d-flex align-items-center justify-content-center shadow-xs overflow-hidden position-relative"
                    style="width: 80px; height: 80px; flex-shrink: 0;"
                  >
                    <img
                      v-if="logoPreview && !logoLoadError"
                      :src="logoPreview"
                      alt="Logo Preview"
                      class="w-100 h-100 object-fit-contain p-1"
                      @error="onLogoError"
                    />
                    <div v-else class="text-muted d-flex flex-column align-items-center justify-content-center">
                      <i class="bi bi-building fs-2 text-secondary opacity-50"></i>
                      <span class="text-2xs text-muted mt-1">No Logo</span>
                    </div>
                  </div>

                  <!-- Logo Info & Path Details -->
                  <div>
                    <div class="d-flex align-items-center gap-2 mb-1">
                      <span class="fw-bold text-sm text-body">Organization Logo</span>
                      <span v-if="selectedLogoFile" class="badge bg-success-subtle text-success border border-success-subtle text-xs">New Selected</span>
                      <span v-else-if="currentLogoPath" class="badge bg-primary-subtle text-primary border border-primary-subtle text-xs">Current Logo</span>
                      <span v-else class="badge bg-secondary-subtle text-secondary border border-secondary-subtle text-xs">None</span>
                    </div>
                    <div class="text-xs text-muted">
                      <span v-if="selectedLogoFile" class="text-primary fw-medium font-monospace">{{ selectedLogoFile.name }} ({{ (selectedLogoFile.size / 1024).toFixed(1) }} KB)</span>
                      <span v-else-if="currentLogoPath" class="font-monospace text-secondary">{{ currentLogoPath }}</span>
                      <span v-else>No logo uploaded yet. Supports PNG, JPG, JPEG, WEBP or SVG.</span>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <input
                    ref="logoFileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    class="d-none"
                    @change="onLogoSelected"
                  />
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5 shadow-xs"
                    @click="logoFileInput?.click()"
                  >
                    <i class="bi bi-cloud-arrow-up-fill"></i>
                    <span>{{ logoPreview ? 'Change Logo' : 'Upload Logo' }}</span>
                  </button>
                  <button
                    v-if="selectedLogoFile"
                    type="button"
                    class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
                    @click="clearLogoSelection"
                    title="Revert to current logo"
                  >
                    <i class="bi bi-x-circle"></i>
                    <span>Cancel</span>
                  </button>
                </div>
              </div>

              <hr class="my-4 opacity-10" />

              <!-- General Info Section -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-3">
                <i class="bi bi-info-circle me-1.5 amms-accent"></i> General Information
              </h6>

              <div class="row g-3 mb-4">
                <!-- Association Name -->
                <div class="col-md-6">
                  <label for="assocName" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    Association Name *
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted">
                      <i class="bi bi-building"></i>
                    </span>
                    <input
                      id="assocName"
                      v-model="name"
                      type="text"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm"
                      placeholder="e.g. Civic Association Tanzania"
                      required
                    />
                  </div>
                </div>

                <!-- Office Address -->
                <div class="col-md-6">
                  <label for="assocAddr" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    Headquarter Address *
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted">
                      <i class="bi bi-geo-alt"></i>
                    </span>
                    <input
                      id="assocAddr"
                      v-model="address"
                      type="text"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm"
                      placeholder="e.g. Dar es Salaam, Tanzania"
                      required
                    />
                  </div>
                </div>
              </div>

              <hr class="my-4 opacity-10" />

              <!-- Executive Contacts Section -->
              <h6 class="fw-bold text-primary text-uppercase text-xs tracking-wider mb-3">
                <i class="bi bi-telephone-outbound me-1.5 amms-accent"></i> Executive Leadership Contacts
              </h6>

              <div class="row g-3 mb-4">
                <!-- Chairman Phone -->
                <div class="col-md-6">
                  <label for="chairmanPhone" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    Chairman Phone *
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted">
                      <i class="bi bi-person-badge"></i>
                    </span>
                    <input
                      id="chairmanPhone"
                      v-model="chairmanPhone"
                      type="tel"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm font-monospace"
                      placeholder="255888999111"
                      required
                    />
                  </div>
                </div>

                <!-- Secretary Phone -->
                <div class="col-md-6">
                  <label for="secretaryPhone" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    Secretary Phone *
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted">
                      <i class="bi bi-file-earmark-person"></i>
                    </span>
                    <input
                      id="secretaryPhone"
                      v-model="secretaryPhone"
                      type="tel"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm font-monospace"
                      placeholder="255722222223"
                      required
                    />
                  </div>
                </div>

                <!-- Treasurer Phone -->
                <div class="col-md-6">
                  <label for="treasurerPhone" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    Treasurer Phone *
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted">
                      <i class="bi bi-wallet2"></i>
                    </span>
                    <input
                      id="treasurerPhone"
                      v-model="treasurerPhone"
                      type="tel"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm font-monospace"
                      placeholder="255733333333"
                      required
                    />
                  </div>
                </div>

                <!-- Registrar Phone -->
                <div class="col-md-6">
                  <label for="registrarPhone" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                    Registrar Phone *
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted">
                      <i class="bi bi-person-vcard"></i>
                    </span>
                    <input
                      id="registrarPhone"
                      v-model="registrarPhone"
                      type="tel"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm font-monospace"
                      placeholder="255755474789"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- Submit Action Button -->
              <div class="pt-3 border-top d-flex justify-content-end">
                <button
                  type="submit"
                  class="btn btn-primary rounded-pill px-4 py-2.5 fw-semibold text-sm d-flex align-items-center gap-2 shadow-sm"
                  :disabled="isSaving"
                >
                  <span v-if="isSaving" class="spinner-border spinner-border-sm" role="status"></span>
                  <span>{{ isSaving ? 'Saving Profile...' : 'Save Profile Changes' }}</span>
                  <i v-if="!isSaving" class="bi bi-check2-circle fs-5"></i>
                </button>
              </div>

            </form>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.text-2xs { font-size: 0.7rem; }
.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }
</style>
