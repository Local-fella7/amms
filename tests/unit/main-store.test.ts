import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMainStore } from '../../app/stores/useMainStore'

describe('useMainStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default state', () => {
    const store = useMainStore()
    expect(store.initialized).toBe(true)
  })

  it('allows state updates', () => {
    const store = useMainStore()
    store.initialized = false
    expect(store.initialized).toBe(false)
  })
})
