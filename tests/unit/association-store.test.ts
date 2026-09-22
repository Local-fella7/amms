import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAssociationStore } from '../../app/stores/useAssociationStore'

describe('useAssociationStore', () => {
  let localStorageMock: Record<string, string> = {}

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = String(value)
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      })
    })
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        apiBase: '/api',
        backendUrl: ''
      }
    }))
  })

  it('initializes with default state when localStorage is empty', () => {
    const store = useAssociationStore()
    expect(store.name).toBe('')
    expect(store.logo).toBe('uploads/logos/logo.jpg')
    expect(store.logoUpdatedAt).toBeNull()
    expect(store.logoLoadError).toBe(false)
    expect(store.logoUrl).toContain('/uploads/logos/logo.jpg')
  })

  it('initializes from localStorage on init()', () => {
    localStorageMock['amms_association_name'] = 'Custom Association'
    localStorageMock['amms_association_logo'] = 'uploads/logos/custom.png'
    localStorageMock['amms_association_logo_ts'] = '1700000000'

    const store = useAssociationStore()
    store.init()

    expect(store.name).toBe('Custom Association')
    expect(store.logo).toBe('uploads/logos/custom.png')
    expect(store.logoUpdatedAt).toBe(1700000000)
    expect(store.logoUrl).toContain('v=1700000000')
  })

  it('updates state and persists to localStorage on setAssociation()', () => {
    const store = useAssociationStore()
    const testTs = 1712345678

    store.setAssociation({
      name: 'New Name',
      logo: 'uploads/logos/logo.jpg',
      logoUpdatedAt: testTs
    })

    expect(store.name).toBe('New Name')
    expect(store.logo).toBe('uploads/logos/logo.jpg')
    expect(store.logoUpdatedAt).toBe(testTs)
    expect(store.logoLoadError).toBe(false)
    expect(store.logoUrl).toContain('uploads/logos/logo.jpg?v=1712345678')

    expect(localStorage.setItem).toHaveBeenCalledWith('amms_association_name', 'New Name')
    expect(localStorage.setItem).toHaveBeenCalledWith('amms_association_logo', 'uploads/logos/logo.jpg')
    expect(localStorage.setItem).toHaveBeenCalledWith('amms_association_logo_ts', '1712345678')
  })

  it('handles logo load error and recovers upon setAssociation()', () => {
    const store = useAssociationStore()
    expect(store.logoUrl).not.toBe('')

    store.setLogoLoadError(true)
    expect(store.logoLoadError).toBe(true)
    expect(store.logoUrl).toBe('')

    store.setAssociation({
      logo: 'uploads/logos/updated.jpg',
      logoUpdatedAt: 1720000000
    })
    expect(store.logoLoadError).toBe(false)
    expect(store.logoUrl).toContain('uploads/logos/updated.jpg?v=1720000000')
  })
})
