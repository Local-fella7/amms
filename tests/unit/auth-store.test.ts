import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../app/stores/useAuthStore'

describe('useAuthStore', () => {
  let cookieMock = { value: null as string | null }

  beforeEach(() => {
    setActivePinia(createPinia())
    cookieMock = { value: null }
    vi.stubGlobal('useCookie', () => cookieMock)
    vi.stubGlobal('navigateTo', vi.fn())
  })

  it('initializes with unauthenticated state', () => {
    const store = useAuthStore()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('sets token, user, and cookie on setToken', () => {
    const store = useAuthStore()
    const user = { id: 1, first_name: 'Admin', email: 'admin@amms.local' }
    store.setToken('sample-jwt-token-123', user)

    expect(store.token).toBe('sample-jwt-token-123')
    expect(store.user).toEqual(user)
    expect(store.isAuthenticated).toBe(true)
    expect(cookieMock.value).toBe('sample-jwt-token-123')
  })

  it('clears credentials and navigates on logout', () => {
    const store = useAuthStore()
    store.setToken('sample-jwt-token-123', { id: 1 })
    expect(store.isAuthenticated).toBe(true)

    const navigateMock = vi.fn()
    vi.stubGlobal('navigateTo', navigateMock)

    store.logout()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(cookieMock.value).toBeNull()
    expect(navigateMock).toHaveBeenCalledWith('/login')
    expect((globalThis as unknown as { push: { info: ReturnType<typeof vi.fn> } }).push.info)
      .toHaveBeenCalledWith('Logged out successfully')
  })
})
