<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { z } from 'zod'
import { useAuthStore } from '~/stores/useAuthStore'
import type { User } from '~/types'

interface LoginResponse {
  data?: {
    token?: string
    jwt_token?: string
    user?: User
    requires_password_change?: boolean
  }
  token?: string
  jwt_token?: string
  user?: User
  requires_password_change?: boolean
  message?: string
  error?: string
}

definePageMeta({
  layout: 'auth'
})

const config = useRuntimeConfig()
const authStore = useAuthStore()
const email = ref('admin@amms.local')
const password = ref('admin123')
const rememberMe = ref(true)
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const currentTheme = ref('light')

const logoPath = ref<string | null>(null)
const logoLoadError = ref(false)

const backendBase = computed(() => {
  const api = (config.public?.apiBase as string) || ''
  return api.replace(/\/api\/?$/, '')
})

const logoUrl = computed(() => {
  if (logoLoadError.value) return ''
  const path = logoPath.value || 'uploads/logos/logo.jpg'
  const cleanPath = path.replace(/^\/+/, '')
  const base = backendBase.value ? backendBase.value.replace(/\/+$/, '') : ''
  return base ? `${base}/${cleanPath}` : `/${cleanPath}`
})

const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-bs-theme', currentTheme.value)
}

const fillCredentials = (role: 'admin' | 'staff') => {
  if (role === 'admin') {
    email.value = 'admin@amms.local'
    password.value = 'admin123'
  } else {
    email.value = 'staff@amms.local'
    password.value = 'staff123'
  }
}

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

// Mandatory Password Change State
const isChangePasswordModalOpen = ref(false)
const currentPasswordInput = ref('')
const newPasswordInput = ref('')
const confirmPasswordInput = ref('')
const changePasswordError = ref('')
const isChangingPassword = ref(false)

const handleLogin = async () => {
  errorMessage.value = ''
  
  const validation = schema.safeParse({ email: email.value, password: password.value })
  if (!validation.success) {
    errorMessage.value = validation.error.issues[0].message
    return
  }

  loading.value = true
  try {
    console.log('Sending login request via proxy to: /api/auth/login')
    
    const response = await $fetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })

    console.log('Login response received:', response)

    const token = response?.data?.token || response?.token || response?.data?.jwt_token
    const user = response?.data?.user || response?.user
    const requiresPasswordChange = response?.data?.requires_password_change ?? response?.requires_password_change ?? false

    if (token) {
      authStore.setToken(token, user)

      if (requiresPasswordChange) {
        currentPasswordInput.value = password.value
        isChangePasswordModalOpen.value = true
      } else {
        await navigateTo('/', { replace: true })
      }
    } else {
      errorMessage.value = response?.message || response?.error || 'Login failed. Please check your credentials.'
    }
  } catch (err: unknown) {
    console.error('Login submit error:', err)
    errorMessage.value = extractErrorMessage(err, 'An error occurred during authentication.')
  } finally {
    loading.value = false
  }
}

const submitPasswordChange = async () => {
  changePasswordError.value = ''

  if (newPasswordInput.value.length < 6) {
    changePasswordError.value = 'New password must be at least 6 characters long'
    return
  }

  if (newPasswordInput.value !== confirmPasswordInput.value) {
    changePasswordError.value = 'New password and confirmation do not match'
    return
  }

  if (newPasswordInput.value === currentPasswordInput.value) {
    changePasswordError.value = 'New password must be different from current password'
    return
  }

  isChangingPassword.value = true
  try {
    const token = authStore.token
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        current_password: currentPasswordInput.value,
        new_password: newPasswordInput.value
      }
    })

    isChangePasswordModalOpen.value = false
    await navigateTo('/', { replace: true })
  } catch (err: unknown) {
    changePasswordError.value = extractErrorMessage(err, 'Failed to update password')
  } finally {
    isChangingPassword.value = false
  }
}
</script>

<template>
  <div class="container-fluid p-0 flex-grow-1 d-flex flex-column" style="min-height: 0;">
    <div class="row g-0 flex-grow-1" style="min-height: 0;">
      
      <!-- Left Hero Banner Section -->
      <div class="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative left-banner" style="overflow-y: auto; overflow-x: hidden;">
        
        <!-- Brand Header (Enlarged & Centered) -->
        <div class="position-relative z-1 text-center w-100 py-3 mt-4">
          <div class="mb-4">
            <img v-if="logoUrl" :src="logoUrl" @error="logoLoadError = true" alt="Logo" class="login-logo shadow-sm" />
            <div v-else class="brand-icon-wrapper rounded-4 d-inline-flex align-items-center justify-content-center shadow-sm">
              <i class="bi bi-shield-check display-4"></i>
            </div>
          </div>
          <div>
            <h1 class="display-3 fw-bold mb-1 text-white tracking-tight">ASA</h1>
            <p class="fs-4 fw-normal mb-0 text-white-50">Arusha Somali Association</p>
          </div>
        </div>

        <!-- Hero Content -->
        <div class="position-relative z-1 my-auto py-5 px-4 text-center">
          <div class="badge amms-badge-accent mb-4 px-4 py-2 rounded-pill fw-semibold text-uppercase tracking-wider">
            Enterprise Registry Platform
          </div>
          <h1 class="display-5 fw-bold mb-4 leading-tight">
            Empowering Associations with Intelligent Governance.
          </h1>
          <p class="fs-5 text-white-50 mb-5 mx-auto max-w-md">
            Streamline membership administration, automate fee collection, send targeted communications, and track audit trails seamlessly.
          </p>


        </div>

        <!-- Footer / Quote -->
        <div class="position-relative z-1 pt-4 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center">
          <small class="text-white-50">&copy; {{ new Date().getFullYear() }} ASA Civic Registry</small>
        </div>
      </div>

      <!-- Right Form Section -->
      <div class="col-lg-6 d-flex flex-column align-items-center justify-content-center p-4 p-xl-5 amms-surface position-relative right-section" style="overflow-y: auto; overflow-x: hidden;">
        
        <!-- Top Toolbar (Theme toggle) -->
        <div class="position-absolute top-0 end-0 p-4">
          <button 
            type="button" 
            class="btn btn-sm btn-outline-secondary rounded-circle theme-toggle-btn d-flex align-items-center justify-content-center" 
            @click="toggleTheme"
            :title="`Switch to ${currentTheme === 'light' ? 'Dark' : 'Light'} Mode`"
          >
            <i :class="currentTheme === 'light' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill'"></i>
          </button>
        </div>

        <!-- Main Form Container -->
        <div class="auth-form-wrapper w-100 mx-auto bg-transparent">
          
          <!-- Mobile Brand Logo -->
          <div class="d-lg-none text-center mb-5">
            <img v-if="logoUrl" :src="logoUrl" @error="logoLoadError = true" alt="Logo" class="mobile-login-logo shadow-sm mb-3" />
            <div v-else class="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 p-3 rounded-circle mb-3">
              <i class="bi bi-shield-check fs-1 text-primary"></i>
            </div>
            <h2 class="fw-bold text-primary mb-0">ASA Portal</h2>
          </div>

          <div class="mb-4 text-center text-lg-start">
            <h2 class="fw-bold text-primary mb-2 display-6">Sign In</h2>
            <p class="fs-5 text-secondary-amms">Please enter your details to continue.</p>
          </div>

          <div v-if="errorMessage" class="alert alert-danger d-flex align-items-center py-3 px-3 mb-4 rounded-3 border-0 shadow-sm">
            <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
            <div>{{ errorMessage }}</div>
          </div>

          <form @submit.prevent="handleLogin">
            <div class="mb-4">
              <label for="email" class="form-label fs-6 fw-semibold text-secondary-amms mb-2">Email Address</label>
              <div class="input-group input-group-lg custom-input-group">
                <span class="input-group-text px-4 bg-transparent border-0 text-muted">
                  <i class="bi bi-envelope fs-5"></i>
                </span>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  class="form-control ps-2 py-3 fs-6 bg-transparent border-0"
                  placeholder="admin@amms.local"
                  required
                />
              </div>
            </div>

            <div class="mb-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label for="password" class="form-label fs-6 fw-semibold text-secondary-amms mb-0">Password</label>
              </div>
              <div class="input-group input-group-lg custom-input-group">
                <span class="input-group-text px-4 bg-transparent border-0 text-muted">
                  <i class="bi bi-lock fs-5"></i>
                </span>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-control px-2 py-3 fs-6 bg-transparent border-0"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  class="input-group-text px-4 bg-transparent border-0 text-muted cursor-pointer toggle-pw"
                  @click.prevent="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'bi bi-eye-slash fs-5' : 'bi bi-eye fs-5'"></i>
                </button>
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-between mb-5">
              <div class="form-check custom-checkbox">
                <input id="remember" v-model="rememberMe" type="checkbox" class="form-check-input" />
                <label for="remember" class="form-check-label fs-6 ms-2 text-secondary-amms">Remember me</label>
              </div>
              <a href="#" class="text-decoration-none fw-semibold fs-6 text-primary">Forgot Password?</a>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 py-3 fs-5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-pill shadow login-btn"
              :disabled="loading"
              @click="handleLogin"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ loading ? 'Authenticating...' : 'Sign In' }}</span>
            </button>
          </form>
          
          <!-- Right Footer (Mobile mainly) -->
          <div class="w-100 text-center mt-5 pt-4 d-lg-none">
            <small class="text-muted">&copy; {{ new Date().getFullYear() }} ASA — Arusha Somali Association</small>
          </div>

        </div>
      </div>

    </div>

    <!-- Mandatory Password Change Modal -->
    <div v-if="isChangePasswordModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <div 
      v-if="isChangePasswordModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      style="z-index: 1065;"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-shield-lock-fill text-warning fs-5"></i>
              <h5 class="modal-title fw-bold text-primary text-sm mb-0">
                Password Change Required
              </h5>
            </div>
          </div>

          <form @submit.prevent="submitPasswordChange">
            <div class="modal-body p-4">
              <p class="text-secondary-amms text-xs mb-4">
                Your account requires a password change before you can access the system. Please choose a new secure password.
              </p>

              <div v-if="changePasswordError" class="alert alert-danger py-2 px-3 mb-4 rounded-3 text-xs border-0 shadow-sm">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ changePasswordError }}
              </div>

              <div class="mb-4">
                <label class="form-label text-xs fw-bold text-uppercase text-secondary-amms">Current Password</label>
                <input
                  v-model="currentPasswordInput"
                  type="password"
                  class="form-control text-sm font-monospace py-2 custom-modal-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div class="mb-4">
                <label class="form-label text-xs fw-bold text-uppercase text-secondary-amms">New Password (Min 6 Characters)</label>
                <input
                  v-model="newPasswordInput"
                  type="password"
                  class="form-control text-sm font-monospace py-2 custom-modal-input"
                  placeholder="••••••••"
                  minlength="6"
                  required
                />
              </div>

              <div class="mb-2">
                <label class="form-label text-xs fw-bold text-uppercase text-secondary-amms">Confirm New Password</label>
                <input
                  v-model="confirmPasswordInput"
                  type="password"
                  class="form-control text-sm font-monospace py-2 custom-modal-input"
                  placeholder="••••••••"
                  minlength="6"
                  required
                />
              </div>
            </div>

            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button
                type="submit"
                class="btn btn-primary rounded-pill w-100 py-2.5 fw-bold text-sm d-flex align-items-center justify-content-center gap-2 shadow-sm login-btn"
                :disabled="isChangingPassword"
              >
                <span v-if="isChangingPassword" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isChangingPassword ? 'Updating Password...' : 'Change Password & Proceed' }}</span>
                <i v-if="!isChangingPassword" class="bi bi-check2-circle fs-5"></i>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.login-logo {
  width: 90px;
  height: 90px;
  object-fit: contain;
  background-color: white;
  border-radius: 1rem;
}

.mobile-login-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  background-color: white;
  border-radius: 50%;
}

.left-banner {
  background: linear-gradient(135deg, var(--amms-primary) 0%, var(--amms-secondary) 100%);
  background-size: cover;
  overflow: hidden;
}

.brand-icon-wrapper {
  width: 90px;
  height: 90px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.amms-accent {
  color: var(--amms-accent) !important;
}
.amms-badge-accent {
  background-color: var(--amms-accent);
  color: #fff;
}



.auth-form-wrapper {
  max-width: 440px;
}

.theme-toggle-btn {
  width: 36px;
  height: 36px;
}

.custom-input-group {
  background: var(--bs-body-bg);
  border: 1.5px solid var(--bs-border-color);
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}
.custom-input-group:focus-within {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 4px rgba(var(--bs-primary-rgb), 0.15);
}
.custom-input-group input:focus {
  box-shadow: none !important;
}

.custom-modal-input {
  border: 1.5px solid var(--bs-border-color);
  border-radius: 0.5rem;
}
.custom-modal-input:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 4px rgba(var(--bs-primary-rgb), 0.15);
}

.custom-checkbox .form-check-input {
  cursor: pointer;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.15rem;
}
.custom-checkbox .form-check-input:focus {
  box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.2);
}

.login-btn {
  transition: all 0.2s ease;
}
.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(var(--bs-primary-rgb), 0.2) !important;
}
.login-btn:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: none !important;
}

.tracking-wider {
  letter-spacing: 0.05em;
}
.tracking-tight {
  letter-spacing: -0.02em;
}
.leading-tight {
  line-height: 1.2;
}
.max-w-md {
  max-width: 28rem;
}
</style>
