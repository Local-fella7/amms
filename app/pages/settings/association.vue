<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { z } from 'zod'

interface Association {
  id?: number
  name: string
  address: string
  chairman_phone: string
  secretary_phone: string
  treasurer_phone: string
  created_at?: string
  updated_at?: string
}

const { data: associationData, loading, error, execute: fetchAssociation, fetchWithAuth } = useApi<any>()

const isSaving = ref(false)
const formError = ref('')
const associationId = ref<number | null>(null)

// Form Fields
const name = ref('')
const address = ref('')
const chairmanPhone = ref('')
const secretaryPhone = ref('')
const treasurerPhone = ref('')

const schema = z.object({
  name: z.string().min(2, 'Association name must be at least 2 characters'),
  address: z.string().min(2, 'Address is required'),
  chairman_phone: z.string().min(10, 'Chairman phone number must be at least 10 digits'),
  secretary_phone: z.string().min(10, 'Secretary phone number must be at least 10 digits'),
  treasurer_phone: z.string().min(10, 'Treasurer phone number must be at least 10 digits')
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
    treasurer_phone: treasurerPhone.value.trim()
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
      await fetchWithAuth(`/api/association/${associationId.value}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      await fetchWithAuth('/api/association', {
        method: 'POST',
        body: payload
      })
    }
    
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
          
          <!-- Center Loading Spinner Overlay -->
          <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
            <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
              <span class="visually-hidden">Loading association details...</span>
            </div>
            <span class="text-xs fw-semibold text-primary mt-2">Loading profile data...</span>
          </div>

          <!-- Card Header Banner -->
          <div class="card-header bg-primary text-white p-4 border-0">
            <div class="d-flex align-items-center gap-3">
              <div class="p-3 bg-white bg-opacity-10 rounded-circle text-white">
                <i class="bi bi-building fs-2 amms-accent"></i>
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
                <div class="col-md-4">
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
                      placeholder="255711111111"
                      required
                    />
                  </div>
                </div>

                <!-- Secretary Phone -->
                <div class="col-md-4">
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
                      placeholder="255722222222"
                      required
                    />
                  </div>
                </div>

                <!-- Treasurer Phone -->
                <div class="col-md-4">
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
.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }
</style>
