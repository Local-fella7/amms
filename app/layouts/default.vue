<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/useAuthStore'
import type { Association } from '~/types'

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { execute: fetchAssociation, fetchWithAuth } = useApi<Association | Association[] | { data: Association | Association[] }>()

const isSidebarCollapsed = ref(false)
const isMobileNavOpen = ref(false)
const isProfileMenuOpen = ref(false)
const isSettingsModalOpen = ref(false)
const currentTheme = ref('light')

watch(() => route.fullPath, () => {
  isMobileNavOpen.value = false
  isSearchDropdownOpen.value = false
})

const associationName = ref('')
const logoPath = ref<string | null>(null)
const logoLoadError = ref(false)

// Global Search State
const globalSearchQuery = ref('')
const isSearchDropdownOpen = ref(false)
const isSearching = ref(false)
const matchedMembers = ref<any[]>([])
const matchedPayments = ref<any[]>([])
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const performGlobalSearch = async () => {
  const q = globalSearchQuery.value.trim().toLowerCase()
  if (!q) {
    matchedMembers.value = []
    matchedPayments.value = []
    isSearchDropdownOpen.value = false
    return
  }

  isSearching.value = true
  isSearchDropdownOpen.value = true

  try {
    const [membersRes, paymentsRes] = await Promise.allSettled([
      fetchWithAuth<any>('/api/members'),
      fetchWithAuth<any>('/api/fee-payments')
    ])

    const rawMembers: any[] = membersRes.status === 'fulfilled'
      ? (Array.isArray(membersRes.value) ? membersRes.value : (membersRes.value?.data || []))
      : []

    const rawPayments: any[] = paymentsRes.status === 'fulfilled'
      ? (Array.isArray(paymentsRes.value) ? paymentsRes.value : (paymentsRes.value?.data || []))
      : []

    matchedMembers.value = rawMembers.filter(m => {
      const fullName = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase()
      const phone = (m.phone || '').toLowerCase()
      const email = (m.email || '').toLowerCase()
      return fullName.includes(q) || phone.includes(q) || email.includes(q)
    }).slice(0, 5)

    matchedPayments.value = rawPayments.filter(p => {
      const receipt = (p.receipt_number || '').toLowerCase()
      const memberName = p.member ? `${p.member.first_name || ''} ${p.member.last_name || ''}`.toLowerCase() : ''
      return receipt.includes(q) || memberName.includes(q)
    }).slice(0, 5)
  } catch (err) {
    console.error('Global search fetch error:', err)
  } finally {
    isSearching.value = false
  }
}

const onSearchInput = () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  if (!globalSearchQuery.value.trim()) {
    isSearchDropdownOpen.value = false
    matchedMembers.value = []
    matchedPayments.value = []
    return
  }
  searchDebounceTimer = setTimeout(() => {
    performGlobalSearch()
  }, 220)
}

const handleSearchEnter = async () => {
  if (!globalSearchQuery.value.trim()) return
  const q = globalSearchQuery.value.trim()
  isSearchDropdownOpen.value = false
  await navigateTo({ path: '/members', query: { search: q } })
}

const selectMember = async (member: any) => {
  isSearchDropdownOpen.value = false
  const q = `${member.first_name || ''} ${member.last_name || ''}`.trim()
  globalSearchQuery.value = q
  await navigateTo({ path: '/members', query: { search: q } })
}

const selectPayment = async (payment: any) => {
  isSearchDropdownOpen.value = false
  const q = payment.receipt_number || (payment.member ? `${payment.member.first_name || ''} ${payment.member.last_name || ''}`.trim() : '') || String(payment.id)
  globalSearchQuery.value = q
  await navigateTo({ path: '/fee-payments', query: { search: q } })
}

const onSearchFocus = () => {
  if (globalSearchQuery.value.trim()) {
    isSearchDropdownOpen.value = true
  }
}

const clearSearch = () => {
  globalSearchQuery.value = ''
  isSearchDropdownOpen.value = false
  matchedMembers.value = []
  matchedPayments.value = []
}

const backendBase = computed(() => {
  const api = (config.public?.apiBase as string) || ''
  return api.replace(/\/api\/?$/, '')
})

const logoUrl = computed(() => {
  if (logoLoadError.value || !logoPath.value) return ''
  const cleanPath = logoPath.value.replace(/^\/+/, '')
  const base = backendBase.value ? backendBase.value.replace(/\/+$/, '') : ''
  return base ? `${base}/${cleanPath}` : `/${cleanPath}`
})

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
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

const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null
  if (target && !target.closest('.header-search-container')) {
    isSearchDropdownOpen.value = false
  }
  if (target && !target.closest('.dropdown')) {
    isProfileMenuOpen.value = false
  }
}

onMounted(() => {
  const savedTheme = import.meta.client ? localStorage.getItem('amms_theme') : null
  const theme = savedTheme || document.documentElement.getAttribute('data-bs-theme') || 'light'
  currentTheme.value = theme
  document.documentElement.setAttribute('data-bs-theme', theme)
  loadAssociation()
  if (import.meta.client) {
    document.addEventListener('click', handleDocumentClick)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('click', handleDocumentClick)
  }
})
</script>

<template>
  <div class="app-layout d-flex position-relative" style="height: 100vh; width: 100vw; overflow: hidden;">

    <!-- Mobile Drawer Backdrop Overlay (d-lg-none) -->
    <div 
      v-if="isMobileNavOpen" 
      class="mobile-backdrop position-fixed top-0 start-0 w-100 h-100 d-lg-none"
      style="background: rgba(0, 0, 0, 0.45); z-index: 1040; backdrop-filter: blur(2px);"
      @click="isMobileNavOpen = false"
    ></div>

    <!-- 1. Enterprise Sidebar (Static on Desktop >=992px, Offcanvas Drawer on Mobile/Tablet <992px) -->
    <aside 
      class="amms-sidebar d-flex flex-column justify-content-between border-end transition-all h-100 flex-shrink-0"
      :class="{ 
        'collapsed': isSidebarCollapsed,
        'mobile-open': isMobileNavOpen
      }"
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
            <NuxtLink to="/notification-members" class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3" active-class="active">
              <i class="bi bi-send-fill fs-5"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Broadcasts</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink to="/reports" class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3" active-class="active">
              <i class="bi bi-file-earmark-pdf-fill fs-5"></i>
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Reports Center</span>
            </NuxtLink>
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
              <span v-if="!isSidebarCollapsed" class="fw-medium text-sm">Sign Out</span>
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
      <header class="workspace-header border-bottom bg-body px-3 px-md-4 py-2.5 d-flex align-items-center justify-content-between z-3 shadow-2xs flex-shrink-0" style="height: 57px;">
        
        <!-- Left Section: Mobile Hamburger Toggle + Global Search Bar -->
        <div class="d-flex align-items-center gap-2">
          <!-- Mobile Hamburger Toggle (Visible on <992px) -->
          <button 
            type="button" 
            class="btn btn-sm btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center d-lg-none flex-shrink-0"
            style="width: 36px; height: 36px;"
            @click="isMobileNavOpen = !isMobileNavOpen"
            title="Open navigation menu"
            aria-label="Toggle navigation menu"
          >
            <i class="bi bi-list fs-5"></i>
          </button>

          <!-- Global Search Bar with Live Results Dropdown -->
          <div class="header-search-container position-relative d-none d-sm-block">
            <div class="input-group input-group-sm rounded-pill border overflow-hidden bg-body">
              <span class="input-group-text bg-transparent border-0 text-muted ps-3">
                <i class="bi" :class="isSearching ? 'bi-hourglass-split spin text-primary' : 'bi-search'"></i>
              </span>
              <input 
                v-model="globalSearchQuery"
                type="search" 
                class="form-control border-0 bg-transparent ps-1 text-xs shadow-none" 
                placeholder="Search members or receipts..."
                @input="onSearchInput"
                @focus="onSearchFocus"
                @keydown.enter="handleSearchEnter"
                @keydown.esc="isSearchDropdownOpen = false"
              />
              <button 
                v-if="globalSearchQuery" 
                type="button" 
                class="btn btn-sm btn-link text-muted border-0 pe-2.5 py-0 text-decoration-none"
                @click="clearSearch"
                title="Clear search"
              >
                <i class="bi bi-x-circle-fill text-xs"></i>
              </button>
            </div>

            <!-- Live Search Dropdown Menu -->
            <div 
              v-if="isSearchDropdownOpen && globalSearchQuery.trim()" 
              class="dropdown-menu show shadow-lg rounded-3 border p-0 mt-1.5 position-absolute start-0 w-100 overflow-hidden"
              style="min-width: 320px; max-width: 420px; z-index: 1075;"
            >
              <!-- Loading spinner -->
              <div v-if="isSearching" class="p-3 text-center text-muted text-xs">
                <span class="spinner-border spinner-border-sm me-1.5 text-primary" role="status"></span>
                Searching registry...
              </div>

              <template v-else>
                <!-- Empty State -->
                <div v-if="matchedMembers.length === 0 && matchedPayments.length === 0" class="p-3 text-center text-muted text-xs">
                  No matching members or receipts found for "<strong>{{ globalSearchQuery }}</strong>"
                </div>

                <!-- Matched Members Section -->
                <div v-if="matchedMembers.length > 0">
                  <div class="px-3 py-1.5 bg-body-tertiary border-bottom d-flex align-items-center justify-content-between">
                    <span class="text-2xs fw-bold text-uppercase text-secondary-amms font-monospace">Members ({{ matchedMembers.length }})</span>
                    <small class="text-2xs text-muted">Click to view</small>
                  </div>
                  <ul class="list-unstyled mb-0 py-1">
                    <li 
                      v-for="m in matchedMembers" 
                      :key="m.id" 
                      class="dropdown-item px-3 py-2 cursor-pointer d-flex align-items-center justify-content-between"
                      @click="selectMember(m)"
                    >
                      <div class="d-flex align-items-center gap-2 overflow-hidden">
                        <div class="search-avatar rounded-circle d-flex align-items-center justify-content-center text-white fw-bold text-2xs flex-shrink-0" style="width: 26px; height: 26px; background-color: #43766C;">
                          {{ m.first_name ? m.first_name[0] : 'M' }}
                        </div>
                        <div class="overflow-hidden">
                          <p class="mb-0 text-xs fw-semibold text-body text-truncate">{{ m.first_name }} {{ m.last_name }}</p>
                          <small class="text-2xs text-muted text-truncate d-block">{{ m.phone || m.email || 'No contact' }}</small>
                        </div>
                      </div>
                      <i class="bi bi-arrow-right-short text-muted fs-5"></i>
                    </li>
                  </ul>
                </div>

                <!-- Matched Fee Payments Section -->
                <div v-if="matchedPayments.length > 0" class="border-top">
                  <div class="px-3 py-1.5 bg-body-tertiary border-bottom d-flex align-items-center justify-content-between">
                    <span class="text-2xs fw-bold text-uppercase text-secondary-amms font-monospace">Fee Receipts ({{ matchedPayments.length }})</span>
                    <small class="text-2xs text-muted">Click to view</small>
                  </div>
                  <ul class="list-unstyled mb-0 py-1">
                    <li 
                      v-for="p in matchedPayments" 
                      :key="p.id" 
                      class="dropdown-item px-3 py-2 cursor-pointer d-flex align-items-center justify-content-between"
                      @click="selectPayment(p)"
                    >
                      <div class="overflow-hidden">
                        <p class="mb-0 text-xs fw-semibold text-body font-monospace text-truncate">
                          <i class="bi bi-receipt me-1 text-primary"></i>{{ p.receipt_number || ('PAY-' + p.id) }}
                        </p>
                        <small class="text-2xs text-muted d-block text-truncate">
                          {{ p.member ? (p.member.first_name + ' ' + p.member.last_name) : 'Member payment' }}
                        </small>
                      </div>
                      <span class="badge rounded-pill bg-light text-body border text-2xs fw-bold ms-2 flex-shrink-0">
                        {{ Number(p.amount).toLocaleString() }}
                      </span>
                    </li>
                  </ul>
                </div>

                <!-- Search Footer: Press Enter -->
                <div class="px-3 py-1.5 bg-body-tertiary border-top text-center">
                  <button 
                    type="button" 
                    class="btn btn-link btn-sm p-0 text-2xs text-decoration-none text-primary fw-semibold"
                    @click="handleSearchEnter"
                  >
                    Press <kbd class="text-2xs">Enter</kbd> to see all member results &rarr;
                  </button>
                </div>
              </template>
            </div>
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

          <!-- Settings Cog Icon Button -->
          <button 
            type="button" 
            class="btn btn-sm btn-outline-secondary rounded-circle theme-btn d-flex align-items-center justify-content-center"
            @click="isSettingsModalOpen = true"
            title="System Settings"
            aria-label="Open System Settings"
          >
            <i class="bi bi-gear-fill"></i>
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
                <button 
                  type="button"
                  class="dropdown-item d-flex align-items-center gap-2 py-2 text-xs fw-medium border-0 bg-transparent w-100 text-start" 
                  @click="isProfileMenuOpen = false; isSettingsModalOpen = true"
                >
                  <i class="bi bi-gear text-primary"></i> System Settings
                </button>
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

    <!-- Settings Navigation Modal -->
    <SettingsModal :show="isSettingsModalOpen" @close="isSettingsModalOpen = false" />
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
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Mobile & Tablet (< 992px) Offcanvas Drawer */
@media (max-width: 991.98px) {
  .amms-sidebar {
    position: fixed !important;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1050;
    width: 260px !important;
    transform: translateX(-100%);
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.35);
  }

  .amms-sidebar.mobile-open {
    transform: translateX(0) !important;
  }
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

.text-2xs {
  font-size: 0.7rem;
}

.text-xs {
  font-size: 0.775rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
