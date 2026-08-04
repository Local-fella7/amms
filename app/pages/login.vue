<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { z } from 'zod'
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'auth'
})

const authStore = useAuthStore()
const email = ref('admin@amms.local')
const password = ref('admin123')
const rememberMe = ref(true)
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const currentTheme = ref('light')

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
    
    const response: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })

    console.log('Login response received:', response)

    const token = response?.data?.token || response?.token || response?.data?.jwt_token
    const user = response?.data?.user || response?.user

    if (token) {
      authStore.setToken(token, user)
      await navigateTo('/', { replace: true })
    } else {
      errorMessage.value = response?.message || response?.error || 'Login failed. Please check your credentials.'
    }
  } catch (err: any) {
    console.error('Login submit error:', err)
    errorMessage.value = err.data?.message || err.response?._data?.message || err.message || 'An error occurred during authentication.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container-fluid p-0 min-vh-100 d-flex">
    <div class="row g-0 w-100 min-vh-100">
      
      <!-- Left Hero Banner Section -->
      <div class="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative left-banner">
        
        <!-- Brand Header (Enlarged & Centered) -->
        <div class="position-relative z-1 text-center w-100 py-3">
          <div class="brand-icon-wrapper rounded-4 d-inline-flex align-items-center justify-content-center mb-3 shadow">
            <i class="bi bi-shield-check display-4 amms-accent"></i>
          </div>
          <div>
            <h1 class="display-3 fw-bold mb-1 text-white tracking-tight">AMMS</h1>
            <p class="fs-4 text-white-50 fw-normal mb-0">Association Membership Management System</p>
          </div>
        </div>

        <!-- Hero Content -->
        <div class="position-relative z-1 my-auto py-5">
          <div class="badge amms-badge-accent mb-3 px-3 py-2 rounded-pill fw-semibold text-uppercase tracking-wider">
            Enterprise Registry Platform
          </div>
          <h1 class="display-5 fw-bold mb-4 leading-tight">
            Empowering Associations with Intelligent Governance.
          </h1>
          <p class="fs-6 text-white-50 mb-4 max-w-md">
            Streamline membership administration, automate fee collection, send targeted communications, and track audit trails seamlessly.
          </p>

          <div class="row g-3 mt-4">
            <div class="col-6">
              <div class="feature-card p-3 rounded-3">
                <i class="bi bi-people-fill fs-4 amms-accent mb-2 d-block"></i>
                <h6 class="fw-semibold mb-1">Member Registry</h6>
                <small class="text-white-50">Comprehensive demographics & status tracking</small>
              </div>
            </div>
            <div class="col-6">
              <div class="feature-card p-3 rounded-3">
                <i class="bi bi-cash-stack fs-4 amms-accent mb-2 d-block"></i>
                <h6 class="fw-semibold mb-1">Financial Management</h6>
                <small class="text-white-50">Fee structures & payment audit trails</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer / Quote -->
        <div class="position-relative z-1 pt-4 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center">
          <small class="text-white-50">&copy; {{ new Date().getFullYear() }} AMMS Civic Registry</small>
          <div class="d-flex gap-3 text-white-50 small">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>

      <!-- Right Form Section (Enhanced UI) -->
      <div class="col-lg-6 d-flex flex-column align-items-center justify-content-between p-4 p-md-5 amms-surface position-relative">
        
        <!-- Top Toolbar (Theme toggle) -->
        <div class="w-100 d-flex align-items-center justify-content-end mb-4">
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
        <div class="auth-form-wrapper w-100 mx-auto my-auto p-4 p-sm-5 rounded-4 shadow-sm bg-body border">
          
          <!-- Mobile Brand Logo -->
          <div class="d-lg-none text-center mb-4">
            <div class="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 p-3 rounded-circle mb-2">
              <i class="bi bi-shield-check fs-1 amms-accent"></i>
            </div>
            <h3 class="fw-bold text-primary mb-0">AMMS Portal</h3>
          </div>

          <div class="mb-4 text-center text-lg-start">
            <h2 class="fw-bold text-primary mb-1">Sign In to Your Account</h2>
            <p class="text-secondary-amms fs-6">Enter your credentials below to access the portal</p>
          </div>

          <div v-if="errorMessage" class="alert alert-danger d-flex align-items-center py-3 px-3 mb-4 rounded-3">
            <i class="bi bi-exclamation-triangle-fill me-2 fs-4"></i>
            <div>{{ errorMessage }}</div>
          </div>

          <form @submit.prevent="handleLogin">
            <div class="mb-4">
              <label for="email" class="form-label fs-6 fw-semibold text-secondary-amms mb-2">Email Address</label>
              <div class="input-group input-group-lg custom-input-group">
                <span class="input-group-text bg-transparent border-end-0 text-muted px-3">
                  <i class="bi bi-envelope fs-5"></i>
                </span>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  class="form-control border-start-0 ps-1 py-3 fs-6"
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
                <span class="input-group-text bg-transparent border-end-0 text-muted px-3">
                  <i class="bi bi-lock fs-5"></i>
                </span>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-control border-start-0 border-end-0 ps-1 py-3 fs-6"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  class="input-group-text bg-transparent border-start-0 text-muted px-3 cursor-pointer"
                  @click.prevent="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'bi bi-eye-slash fs-5' : 'bi bi-eye fs-5'"></i>
                </button>
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-between mb-4">
              <div class="form-check">
                <input id="remember" v-model="rememberMe" type="checkbox" class="form-check-input p-2" />
                <label for="remember" class="form-check-label fs-6 text-secondary-amms ms-1">Remember me</label>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 py-3 fs-5 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-pill shadow-sm login-btn"
              :disabled="loading"
              @click="handleLogin"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ loading ? 'Authenticating...' : 'Sign In' }}</span>
              <i v-if="!loading" class="bi bi-arrow-right fs-4"></i>
            </button>
          </form>

        </div>

        <!-- Right Footer -->
        <div class="w-100 text-center pt-3">
          <small class="text-muted">&copy; {{ new Date().getFullYear() }} AMMS — Association Membership Management System</small>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.left-banner {
  background: linear-gradient(135deg, var(--amms-primary) 0%, var(--amms-secondary) 100%);
  overflow: hidden;
}

.brand-icon-wrapper {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.feature-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}

.auth-form-wrapper {
  max-width: 460px;
}

.theme-toggle-btn {
  width: 36px;
  height: 36px;
}

.quick-fill-box {
  background-color: rgba(0, 0, 0, 0.02);
}

.custom-input-group {
  border-radius: 50rem;
  border: 1px solid var(--amms-border);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.custom-input-group .form-control {
  border: none !important;
}

.custom-input-group .input-group-text {
  border: none !important;
}

.custom-input-group:focus-within {
  border-color: var(--amms-primary) !important;
  box-shadow: 0 0 0 0.25rem rgba(27, 42, 74, 0.15);
}

.cursor-pointer {
  cursor: pointer;
}

.login-btn {
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.login-btn:hover {
  transform: translateY(-1px);
}
</style>
