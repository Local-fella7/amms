<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/useAuthStore'

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { data: associationData, execute: fetchAssociation } = useApi<any>()
const isSidebarCollapsed = ref(false)
const isSettingsOpen = ref(false)
const isProfileMenuOpen = ref(false)
const currentTheme = ref('light')

const associationName = ref('')
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

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value
}

const toggleProfileMenu = () => {
  isProfileMenuOpen.value = !isProfileMenuOpen.value
}

const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-bs-theme', currentTheme.value)
  if (import.meta.client) {
    localStorage.setItem('amms_theme', currentTheme.value)
  }
}

const loadAssociation = async () => {
  try {
    const res = await fetchAssociation((api) => api('/api/association'))
    const record = Array.isArray(res) ? res[0] : (res?.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : res)
    if (record) {
      associationName.value = record.name || ''
      if (record.logo) {
        logoPath.value = record.logo
      }
    }
  } catch {
    // Fallback to defaults
  }
}

onMounted(() => {
  const savedTheme = import.meta.client ? localStorage.getItem('amms_theme') : null
  const theme = savedTheme || document.documentElement.getAttribute('data-bs-theme') || 'light'
  currentTheme.value = theme
  document.documentElement.setAttribute('data-bs-theme', theme)
  if (route.path.startsWith('/settings')) {
    isSettingsOpen.value = true
  }
  loadAssociation()
})
</script>

<template>
  <div class="app-layout d-flex" style="height: 100vh; width: 100vw; overflow: hidden;">

    <!-- 1. Full-Height Enterprise Sidebar (100vh) -->
    <aside 
      class="amms-sidebar d-flex flex-column justify-content-between border-end transition-all h-100 flex-shrink-0"
      :class="{ 'collapsed': isSidebarCollapsed }"
    >
      <!-- Single Unified Sidebar Brand Header (Always 57px) -->
      <div 
        class="sidebar-brand-header border-bottom border-white border-opacity-10 d-flex align-items-center flex-shrink-0"
        :class="isSidebarCollapsed ? 'justify-content-center px-2' : 'justify-content-between px-3'"
        style="height: 57px;"
      >
        <!-- Expanded View: Logo + Name with generous spacing + Collapse Toggle -->
        <template v-if="!isSidebarCollapsed">
          <NuxtLink to="/" class="d-flex align-items-center gap-3 text-decoration-none overflow-hidden pe-2">
            <div class="brand-logo-box rounded-3 overflow-hidden d-flex align-items-center justify-content-center flex-shrink-0 shadow-2xs">
              <img 
                v-if="logoUrl && !logoLoadError" 
                :src="logoUrl" 
                alt="Logo" 
                class="w-100 h-100 object-fit-cover"
                @error="logoLoadError = true"
              />
              <div v-else class="brand-badge rounded-3 d-flex align-items-center justify-content-center text-white w-100 h-100">
                <i class="bi bi-shield-check fs-5 text-white"></i>
              </div>
            </div>
            <div class="overflow-hidden" style="line-height: 1.25;">
              <h6 class="fw-bold mb-0 text-white text-sm tracking-tight text-truncate" style="max-width: 130px;">
                {{ associationName || 'AMMS' }}
              </h6>
              <small class="text-white-50 fs-7">Member System</small>
            </div>
          </NuxtLink>

          <button 
            class="btn btn-sm btn-white-glass border-0 rounded-circle d-flex align-items-center justify-content-center sidebar-toggle flex-shrink-0"
            @click="toggleSidebar"
            title="Collapse Navigation"
          >
            <i class="bi bi-layout-sidebar-inset fs-6 text-white"></i>
          </button>
        </template>

        <!-- Collapsed View: Brand Logo centered + Click to Expand with smooth hover overlay -->
        <template v-else>
          <div 
            class="brand-logo-box brand-logo-interactive position-relative rounded-3 overflow-hidden d-flex align-items-center justify-content-center cursor-pointer shadow-2xs"
            @click="toggleSidebar"
            title="Click to expand navigation"
          >
            <img 
              v-if="logoUrl && !logoLoadError" 
              :src="logoUrl" 
              alt="Logo" 
              class="w-100 h-100 object-fit-cover"
              @error="logoLoadError = true"
            />
            <div v-else class="brand-badge rounded-3 d-flex align-items-center justify-content-center text-white w-100 h-100">
              <i class="bi bi-shield-check fs-5 text-white"></i>
            </div>
            
            <!-- Hover Overlay revealing Expand icon -->
            <div class="expand-hover-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
              <i class="bi bi-layout-sidebar text-white fs-6"></i>
            </div>
          </div>
        </template>
      </div>

      <!-- Scrollable Navigation Area -->
      <div class="sidebar-nav flex-grow-1 overflow-y-auto p-3">
        
        <!-- Operations Section Header -->
        <div class="nav-section-title text-uppercase text-xs fw-semibold px-2 mb-2 text-white-50" v-if="!isSidebarCollapsed">
          Main Menu
        </div>

        <ul class="nav nav-pills flex-column gap-1 mb-4">
          <li class="nav-item">
            <NuxtLink to="/" class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3" active-class="active">
              <i class="bi bi-grid-1x2-fill fs-5"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Dashboard</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink to="/members" class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3" active-class="active">
              <i class="bi bi-people-fill fs-5"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Members</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink to="/fee-payments" class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3" active-class="active">
              <i class="bi bi-cash-stack fs-5"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Fee Payments</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink to="/notifications" class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3" active-class="active">
              <i class="bi bi-send-fill fs-5"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Broadcasts</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink to="/notification-members" class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3" active-class="active">
              <i class="bi bi-person-lines-fill fs-5"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Broadcast Recipients</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink to="/reports" class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3" active-class="active">
              <i class="bi bi-file-earmark-pdf-fill fs-5"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Reports Center</span>
            </NuxtLink>
          </li>
        </ul>

        <!-- System Settings Accordion -->
        <div class="nav-section-title text-uppercase text-xs fw-semibold px-2 mb-2 text-white-50" v-if="!isSidebarCollapsed">
          Configuration
        </div>

        <ul class="nav nav-pills flex-column gap-1">
          <li class="nav-item mb-2">
            <div 
              class="nav-link w-100 d-flex align-items-center justify-content-between px-3 py-2.5 rounded-3 cursor-pointer"
              @click="toggleSettings"
            >
              <div class="d-flex align-items-center gap-3">
                <i class="bi bi-gear-fill fs-5 me-1"></i>
                <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Settings</span>
              </div>
              <i v-if="!isSidebarCollapsed" class="bi bi-chevron-down text-xs transition-transform" :class="{ 'rotate-180': isSettingsOpen }"></i>
            </div>

            <!-- Collapsable Submenu -->
            <div v-if="isSettingsOpen && !isSidebarCollapsed" class="sub-menu-box ps-3 mt-1.5 d-flex flex-column gap-1.5 border-start border-white border-opacity-20 ms-3 py-1">
              <NuxtLink to="/settings/users" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-person-badge fs-6 text-white-50 flex-shrink-0"></i>
                <span>System Users</span>
              </NuxtLink>
              <NuxtLink to="/settings/association" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-building fs-6 text-white-50 flex-shrink-0"></i>
                <span>Association Profile</span>
              </NuxtLink>
              <NuxtLink to="/settings/roles" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-shield-lock fs-6 text-white-50 flex-shrink-0"></i>
                <span>Roles & Permissions</span>
              </NuxtLink>
              <NuxtLink to="/settings/feature-groups" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-folder fs-6 text-white-50 flex-shrink-0"></i>
                <span>Feature Groups</span>
              </NuxtLink>
              <NuxtLink to="/settings/features" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-key fs-6 text-white-50 flex-shrink-0"></i>
                <span>System Features</span>
              </NuxtLink>
              <NuxtLink to="/settings/locations" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-geo-alt fs-6 text-white-50 flex-shrink-0"></i>
                <span>Locations & Regions</span>
              </NuxtLink>
              <NuxtLink to="/settings/age-groups" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-people fs-6 text-white-50 flex-shrink-0"></i>
                <span>Age Groups</span>
              </NuxtLink>
              <NuxtLink to="/settings/fees" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-receipt fs-6 text-white-50 flex-shrink-0"></i>
                <span>Fee Schedules</span>
              </NuxtLink>
              <NuxtLink to="/settings/payment-modes" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-credit-card fs-6 text-white-50 flex-shrink-0"></i>
                <span>Payment Modes</span>
              </NuxtLink>
              <NuxtLink to="/settings/notification-templates" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                <i class="bi bi-file-text fs-6 text-white-50 flex-shrink-0"></i>
                <span>SMS / Email Templates</span>
              </NuxtLink>
            </div>
          </li>
        </ul>
      </div>

      <!-- Sidebar Footer & Audit Trail -->
      <div class="sidebar-footer p-3 border-top border-white border-opacity-10 mt-auto flex-shrink-0">
        <ul class="nav nav-pills flex-column gap-1 mb-1">
          <li class="nav-item">
            <NuxtLink 
              to="/audit-logs" 
              class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3" 
              active-class="active"
              :title="isSidebarCollapsed ? 'Audit Trail' : ''"
            >
              <i class="bi bi-journal-text fs-5 flex-shrink-0"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Audit Trail</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link w-100 border-0 bg-transparent text-start d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-danger cursor-pointer" 
              @click="authStore.logout()"
              :title="isSidebarCollapsed ? 'Sign Out' : ''"
            >
              <i class="bi bi-box-arrow-right fs-5 flex-shrink-0"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Log Out</span>
            </button>
          </li>
        </ul>
        <div class="text-center pt-1.5" v-if="!isSidebarCollapsed">
          <small class="text-white-50 text-xs">&copy; {{ associationName || 'ASA' }}</small>
        </div>
      </div>
    </aside>

    <!-- 2. Workspace Column (Top Workspace Navbar + Main Content) -->
    <div class="d-flex flex-column flex-grow-1 h-100 overflow-hidden" style="min-width: 0;">

      <!-- Top Workspace Navbar -->
      <header class="workspace-header border-bottom bg-body px-4 py-2.5 d-flex align-items-center justify-content-between z-3 shadow-2xs flex-shrink-0" style="height: 57px;">
        
        <!-- Global Search Bar -->
        <div class="header-search-container">
          <div class="input-group input-group-sm rounded-pill border overflow-hidden">
            <span class="input-group-text bg-transparent border-0 text-muted ps-3">
              <i class="bi bi-search"></i>
            </span>
            <input 
              type="search" 
              class="form-control border-0 bg-transparent ps-1 text-xs shadow-none" 
              placeholder="Search members or receipts..."
            />
          </div>
        </div>

        <!-- Right Header Actions & User Profile -->
        <div class="d-flex align-items-center gap-2">
          
          <!-- Theme Switcher -->
          <button 
            type="button" 
            class="btn btn-sm btn-outline-secondary rounded-circle theme-btn d-flex align-items-center justify-content-center"
            @click="toggleTheme"
            :title="`Switch to ${currentTheme === 'light' ? 'Dark' : 'Light'} Mode`"
          >
            <i :class="currentTheme === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun'"></i>
          </button>

          <!-- Profile Dropdown -->
          <div class="dropdown position-relative">
            <button 
              class="btn btn-sm btn-light border-0 rounded-pill d-flex align-items-center gap-2 px-2 py-1 cursor-pointer"
              type="button"
              @click="toggleProfileMenu"
            >
              <div class="avatar-circle rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold text-xs">
                {{ authStore.user?.first_name ? authStore.user.first_name[0] : 'A' }}
              </div>
              <span class="d-none d-md-inline small fw-semibold text-body">
                {{ authStore.user?.first_name || 'Admin' }}
              </span>
              <i class="bi bi-chevron-down text-muted text-xs me-1 transition-transform" :class="{ 'rotate-180': isProfileMenuOpen }"></i>
            </button>

            <ul v-if="isProfileMenuOpen" class="dropdown-menu dropdown-menu-end show shadow-lg rounded-3 border mt-2 position-absolute end-0" style="min-width: 220px; z-index: 1070;">
              <li class="px-3 py-2 border-bottom bg-body-tertiary">
                <p class="mb-0 fw-bold text-primary text-sm">{{ authStore.user?.first_name }} {{ authStore.user?.last_name }}</p>
                <small class="text-muted d-block text-truncate font-monospace text-xs">{{ authStore.user?.email || 'admin@amms.local' }}</small>
              </li>
              <li>
                <NuxtLink to="/settings/association" class="dropdown-item d-flex align-items-center gap-2 py-2 text-xs fw-medium" @click="isProfileMenuOpen = false">
                  <i class="bi bi-gear text-primary"></i> System Settings
                </NuxtLink>
              </li>
              <li><hr class="dropdown-divider my-1"></li>
              <li>
                <button class="dropdown-item d-flex align-items-center gap-2 py-2 text-xs fw-semibold text-danger cursor-pointer" @click="isProfileMenuOpen = false; authStore.logout()">
                  <i class="bi bi-box-arrow-right"></i> Sign Out
                </button>
              </li>
            </ul>
          </div>

        </div>
      </header>

      <!-- Main Workspace Page Content -->
      <main class="main-content flex-grow-1 p-3 p-md-4 overflow-auto" style="min-height: 0;">
        <slot />
      </main>

    </div>

  </div>
</template>

<style scoped>
.brand-logo-box {
  width: 34px;
  height: 34px;
  background-color: var(--amms-primary, #43766C);
}

.brand-badge {
  width: 100%;
  height: 100%;
  background-color: var(--amms-primary, #43766C);
}

.brand-logo-interactive {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.brand-logo-interactive:hover {
  transform: scale(1.08);
}

.expand-hover-overlay {
  background-color: rgba(67, 118, 108, 0.88);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.brand-logo-interactive:hover .expand-hover-overlay {
  opacity: 1;
}

.header-search-container {
  width: 260px;
}

.avatar-circle {
  width: 28px;
  height: 28px;
}

.sidebar-toggle, .theme-btn {
  width: 34px;
  height: 34px;
}

.amms-sidebar {
  width: 250px;
  height: 100vh;
  overflow: hidden;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-white-glass {
  background-color: rgba(255, 255, 255, 0.12);
  color: #FFFFFF;
}

.btn-white-glass:hover {
  background-color: rgba(255, 255, 255, 0.22);
  color: #FFFFFF;
}

.amms-sidebar.collapsed {
  width: 72px;
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}

.amms-sidebar.collapsed .nav-link {
  justify-content: center !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  gap: 0 !important;
}

.amms-sidebar.collapsed .nav-link i {
  margin: 0 !important;
}

.rotate-180 {
  transform: rotate(180deg);
}

.text-xs {
  font-size: 0.775rem;
}

.text-sm {
  font-size: 0.875rem;
}

.fs-7 {
  font-size: 0.8rem;
}

.cursor-pointer {
  cursor: pointer;
}

.sub-menu-box .nav-link {
  color: #C7CFE3;
}

.sub-menu-box .nav-link:hover,
.sub-menu-box .nav-link.active {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.12);
}

.sub-menu-box .nav-link i {
  font-size: 0.95rem;
}
</style>
