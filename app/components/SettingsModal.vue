<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

interface SettingEntry {
  id: string
  title: string
  description: string
  path: string
  icon: string
}

interface SettingCategory {
  id: string
  label: string
  icon: string
  items: SettingEntry[]
}

const categories: SettingCategory[] = [
  {
    id: 'organization',
    label: 'Organization',
    icon: 'bi-building',
    items: [
      {
        id: 'association',
        title: 'Association Profile',
        description: 'Organization identity, registry details, logo & contacts',
        path: '/settings/association',
        icon: 'bi-building'
      },
      {
        id: 'users',
        title: 'System Users',
        description: 'Staff accounts, status, and authentication credentials',
        path: '/settings/users',
        icon: 'bi-person-badge'
      },
      {
        id: 'roles',
        title: 'Roles & Permissions',
        description: 'Access control policies and permission assignments',
        path: '/settings/roles',
        icon: 'bi-shield-lock'
      }
    ]
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: 'bi-send',
    items: [
      {
        id: 'broadcast-templates',
        title: 'Broadcasts Templates',
        description: 'Message campaigns, layouts, and dispatch history',
        path: '/notifications',
        icon: 'bi-send-check'
      },
      {
        id: 'notification-templates',
        title: 'SMS / Email Templates',
        description: 'Notification blueprints with dynamic tags',
        path: '/settings/notification-templates',
        icon: 'bi-file-text'
      }
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'bi-cash-stack',
    items: [
      {
        id: 'fees',
        title: 'Fee Schedules',
        description: 'Annual dues, collection cycles, and rate brackets',
        path: '/settings/fees',
        icon: 'bi-receipt'
      },
      {
        id: 'payment-modes',
        title: 'Payment Modes',
        description: 'Cash, bank transfer, and mobile gateway definitions',
        path: '/settings/payment-modes',
        icon: 'bi-credit-card'
      }
    ]
  },
  {
    id: 'registry',
    label: 'Registry',
    icon: 'bi-diagram-3',
    items: [
      {
        id: 'locations',
        title: 'Locations & Regions',
        description: 'Districts, regional branches, and administrative wards',
        path: '/settings/locations',
        icon: 'bi-geo-alt'
      },
      {
        id: 'age-groups',
        title: 'Age Groups',
        description: 'Member demographic brackets and classification rules',
        path: '/settings/age-groups',
        icon: 'bi-people'
      },
      {
        id: 'feature-groups',
        title: 'Feature Groups',
        description: 'Logical functional categories for system capabilities',
        path: '/settings/feature-groups',
        icon: 'bi-folder'
      },
      {
        id: 'features',
        title: 'System Features',
        description: 'Feature toggles and endpoint permission controls',
        path: '/settings/features',
        icon: 'bi-key'
      }
    ]
  }
]

const activeCategory = ref(categories[0].id)

const activeItems = computed(() =>
  categories.find(c => c.id === activeCategory.value)?.items ?? []
)

const navigateToPage = async (path: string) => {
  emit('close')
  await navigateTo(path)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) emit('close')
}

onMounted(() => {
  if (import.meta.client) window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="sm-fade">
      <div
        v-if="show"
        class="sm-backdrop"
        @click="emit('close')"
      />
    </Transition>

    <!-- Panel -->
    <Transition name="sm-slide">
      <div
        v-if="show"
        class="sm-shell"
        role="dialog"
        aria-modal="true"
        aria-label="System Settings"
      >
        <!-- ── Left sidebar ── -->
        <aside class="sm-sidebar">
          <div class="sm-sidebar-head">
            <i class="bi bi-gear-fill sm-brand-icon" />
            <span class="sm-brand-label">Settings</span>
          </div>

          <nav class="sm-nav">
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              class="sm-nav-item"
              :class="{ 'is-active': activeCategory === cat.id }"
              @click="activeCategory = cat.id"
            >
              <i :class="`bi ${cat.icon} sm-nav-icon`" />
              <span class="sm-nav-label">{{ cat.label }}</span>
            </button>
          </nav>
        </aside>

        <!-- ── Right content ── -->
        <section class="sm-content">
          <!-- Content header -->
          <div class="sm-content-head">
            <div>
              <h6 class="sm-content-title">
                {{ categories.find(c => c.id === activeCategory)?.label }}
              </h6>
              <p class="sm-content-sub">
                {{ activeItems.length }} {{ activeItems.length === 1 ? 'module' : 'modules' }}
              </p>
            </div>
            <button
              type="button"
              class="sm-close-btn"
              aria-label="Close"
              @click="emit('close')"
            >
              <i class="bi bi-x-lg" />
            </button>
          </div>

          <!-- Item list -->
          <ul class="sm-list">
            <li
              v-for="item in activeItems"
              :key="item.id"
              class="sm-list-item"
              role="button"
              tabindex="0"
              @click="navigateToPage(item.path)"
              @keydown.enter="navigateToPage(item.path)"
            >
              <span class="sm-item-icon-wrap">
                <i :class="`bi ${item.icon}`" />
              </span>
              <span class="sm-item-body">
                <span class="sm-item-title">{{ item.title }}</span>
                <span class="sm-item-desc">{{ item.description }}</span>
              </span>
              <i class="bi bi-chevron-right sm-item-arrow" />
            </li>
          </ul>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ── */
.sm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1060;
  background: rgba(10, 16, 28, 0.45);
  backdrop-filter: blur(4px);
}

/* ── Shell ── */
.sm-shell {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1065;
  display: flex;
  width: min(820px, 94vw);
  height: min(520px, 88vh);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--bs-border-color);
}

/* ── Left Sidebar ── */
.sm-sidebar {
  width: 200px;
  flex-shrink: 0;
  background-color: #1B2A4A;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.sm-sidebar-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 18px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sm-brand-icon {
  font-size: 1rem;
  color: #B19470;
  opacity: 0.95;
}

.sm-brand-label {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #F8FAE5;
}

.sm-nav {
  display: flex;
  flex-direction: column;
  padding: 10px 8px;
  gap: 2px;
  flex: 1;
}

.sm-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  text-align: left;
}

.sm-nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
}

.sm-nav-item.is-active {
  background: rgba(177, 148, 112, 0.2);
}

.sm-nav-icon {
  font-size: 0.9rem;
  color: rgba(248, 250, 229, 0.45);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.sm-nav-item.is-active .sm-nav-icon {
  color: #B19470;
}

.sm-nav-item:hover .sm-nav-icon {
  color: rgba(248, 250, 229, 0.8);
}

.sm-nav-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(248, 250, 229, 0.55);
  transition: color 0.15s ease;
}

.sm-nav-item.is-active .sm-nav-label {
  color: #B19470;
  font-weight: 600;
}

.sm-nav-item:hover .sm-nav-label {
  color: rgba(248, 250, 229, 0.9);
  font-weight: 600;
}

/* ── Right Content ── */
.sm-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bs-body-bg);
  overflow: hidden;
}

.sm-content-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--bs-border-color);
  flex-shrink: 0;
}

.sm-content-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--bs-body-color);
  letter-spacing: -0.01em;
}

.sm-content-sub {
  font-size: 0.72rem;
  color: var(--bs-secondary-color);
  margin: 0;
}

.sm-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--bs-border-color);
  background: transparent;
  color: var(--bs-secondary-color);
  cursor: pointer;
  font-size: 0.7rem;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.sm-close-btn:hover {
  background: var(--bs-tertiary-bg);
  color: var(--bs-body-color);
  border-color: var(--bs-secondary-color);
}

/* ── Item List ── */
.sm-list {
  list-style: none;
  margin: 0;
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
}

.sm-list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 24px;
  cursor: pointer;
  transition: background 0.12s ease;
  outline: none;
}

.sm-list-item:hover {
  background: var(--bs-tertiary-bg);
}

.sm-list-item:focus-visible {
  background: var(--bs-tertiary-bg);
  outline: 2px solid #43766C;
  outline-offset: -2px;
}

/* Divider between items */
.sm-list-item + .sm-list-item {
  border-top: 1px solid var(--bs-border-color);
}

.sm-item-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(67, 118, 108, 0.08);
  color: #43766C;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}

.sm-list-item:hover .sm-item-icon-wrap {
  background: #43766C;
  color: #F8FAE5;
}

.sm-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.sm-item-title {
  font-size: 0.845rem;
  font-weight: 600;
  color: var(--bs-body-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.12s ease;
}

.sm-list-item:hover .sm-item-title {
  color: #43766C;
}

.sm-item-desc {
  font-size: 0.72rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-item-arrow {
  font-size: 0.7rem;
  color: var(--bs-border-color);
  flex-shrink: 0;
  transition: color 0.12s ease, transform 0.12s ease;
}

.sm-list-item:hover .sm-item-arrow {
  color: #43766C;
  transform: translateX(2px);
}

/* ── Transitions ── */
.sm-fade-enter-active,
.sm-fade-leave-active {
  transition: opacity 0.2s ease;
}
.sm-fade-enter-from,
.sm-fade-leave-to {
  opacity: 0;
}

.sm-slide-enter-active,
.sm-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.sm-slide-enter-from,
.sm-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 14px));
}
</style>
