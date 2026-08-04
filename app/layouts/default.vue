<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/useAuthStore'

const route = useRoute()
const authStore = useAuthStore()
const isSidebarCollapsed = ref(false)
const isSettingsOpen = ref(false)
const currentTheme = ref('light')

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value
}

const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-bs-theme', currentTheme.value)
}

onMounted(() => {
  const theme = document.documentElement.getAttribute('data-bs-theme') || 'light'
  currentTheme.value = theme
  if (route.path.startsWith('/settings')) {
    isSettingsOpen.value = true
  }
})
</script>

<template>
  <div class="app-layout min-vh-100 d-flex flex-column">
    
    <!-- Top Navigation Header -->
    <header class="app-header border-bottom bg-body sticky-top px-3 py-2.5 d-flex align-items-center justify-content-between z-3 shadow-xs">
      
      <!-- Brand & Sidebar Toggle -->
      <div class="d-flex align-items-center gap-3">
        <button 
          class="btn btn-sm btn-light border-0 rounded-circle d-flex align-items-center justify-content-center sidebar-toggle"
          @click="toggleSidebar"
          title="Toggle Navigation"
        >
          <i class="bi bi-list fs-5"></i>
        </button>

        <NuxtLink to="/" class="d-flex align-items-center gap-2 text-decoration-none text-body">
          <div class="brand-badge rounded-3 d-flex align-items-center justify-content-center text-white">
            <i class="bi bi-shield-check fs-5 amms-accent"></i>
          </div>
          <div class="d-none d-sm-block">
            <h6 class="fw-bold mb-0 text-primary leading-none">AMMS</h6>
            <small class="text-muted-amms fs-7">Civic Registry</small>
          </div>
        </NuxtLink>
      </div>

      <!-- Center Global Search Bar -->
      <div class="d-none d-md-block flex-grow-0 header-search-container mx-3">
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
        <div class="dropdown">
          <button 
            class="btn btn-sm btn-light border-0 rounded-pill d-flex align-items-center gap-2 px-2 py-1"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div class="avatar-circle rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold text-xs">
              {{ authStore.user?.first_name ? authStore.user.first_name[0] : 'A' }}
            </div>
            <span class="d-none d-md-inline small fw-semibold text-body">
              {{ authStore.user?.first_name || 'Admin' }}
            </span>
            <i class="bi bi-chevron-down text-muted text-xs me-1"></i>
          </button>

          <ul class="dropdown-menu dropdown-menu-end shadow-sm rounded-3 border mt-2">
            <li class="px-3 py-2 border-bottom">
              <p class="mb-0 fw-semibold text-sm">{{ authStore.user?.first_name }} {{ authStore.user?.last_name }}</p>
              <small class="text-muted d-block text-truncate">{{ authStore.user?.email || 'admin@amms.local' }}</small>
            </li>
            <li>
              <NuxtLink to="/settings/association" class="dropdown-menu-item dropdown-item d-flex align-items-center gap-2 py-2 text-sm">
                <i class="bi bi-gear text-muted"></i> System Settings
              </NuxtLink>
            </li>
            <li><hr class="dropdown-divider my-1"></li>
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2 py-2 text-sm text-danger" @click="authStore.logout()">
                <i class="bi bi-box-arrow-right"></i> Sign Out
              </button>
            </li>
          </ul>
        </div>

      </div>
    </header>

    <div class="d-flex flex-grow-1 position-relative">
      
      <!-- Collapsible Main Sidebar -->
      <aside 
        class="amms-sidebar d-flex flex-column justify-content-between p-3 border-end transition-all"
        :class="{ 'collapsed': isSidebarCollapsed }"
      >
        <div class="sidebar-nav">
          
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
                <NuxtLink to="/settings/association" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                  <i class="bi bi-building fs-6 text-white-50 flex-shrink-0"></i>
                  <span>Association Profile</span>
                </NuxtLink>
                <NuxtLink to="/settings/roles" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs" active-class="active">
                  <i class="bi bi-shield-lock fs-6 text-white-50 flex-shrink-0"></i>
                  <span>Roles & Permissions</span>
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
        <div class="sidebar-footer pt-2" v-if="!isSidebarCollapsed">
          <ul class="nav nav-pills flex-column gap-1 mb-2">
            <li class="nav-item">
              <NuxtLink to="/audit-logs" class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3" active-class="active">
                <i class="bi bi-journal-text fs-5"></i>
                <span class="fw-medium text-sm">Audit Trail</span>
              </NuxtLink>
            </li>
            <li class="nav-item">
              <button class="nav-link w-100 border-0 bg-transparent text-start d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-danger cursor-pointer" @click="authStore.logout()">
                <i class="bi bi-box-arrow-right fs-5"></i>
                <span class="fw-medium text-sm">Log Out</span>
              </button>
            </li>
          </ul>
          <div class="text-center pt-2 border-top border-white border-opacity-10">
            <small class="text-white-50 text-xs">&copy; AMMS Civic Registry</small>
          </div>
        </div>
      </aside>

      <!-- Main Workspace Page Content -->
      <main class="main-content flex-grow-1 p-3 p-md-4 overflow-auto">
        <slot />
      </main>

    </div>
  </div>
</template>

<style scoped>
.brand-badge {
  width: 32px;
  height: 32px;
  background-color: var(--amms-primary);
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
  width: 240px;
  min-height: calc(100vh - 57px);
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.amms-sidebar.collapsed {
  width: 72px;
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
