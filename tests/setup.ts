import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// ─── Mock Nuxt auto-imports used by composables/components ──────────────────
vi.stubGlobal('useNuxtApp',   () => ({ $pinia: {} }))
vi.stubGlobal('navigateTo',   vi.fn())
vi.stubGlobal('useCookie',    () => ({ value: null }))
vi.stubGlobal('useRouter',    () => ({ push: vi.fn(), replace: vi.fn() }))
vi.stubGlobal('useRoute',     () => ({ params: {}, query: {} }))
vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('$fetch',       vi.fn())
vi.stubGlobal('useRuntimeConfig', () => ({ public: {} }))

// Mock NuxtLink globally for all component tests
config.global.stubs = {
  NuxtLink: {
    template: '<a><slot /></a>',
    props: ['to']
  }
}
