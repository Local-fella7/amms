import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../app/stores/useAuthStore'
import { useApi } from '../../app/composables/useApi'

describe('useApi Composable', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock = vi.fn()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { apiBase: '/api' }
    }))
  })

  describe('fetchWithAuth', () => {
    it('calls $fetch with resolved URL without Authorization header when unauthenticated', async () => {
      const { fetchWithAuth } = useApi()
      fetchMock.mockResolvedValueOnce({ success: true })

      await fetchWithAuth('/api/members', { method: 'GET' })

      expect(fetchMock).toHaveBeenCalledWith('/api/members', {
        method: 'GET',
        headers: {}
      })
    })

    it('injects Bearer token into Authorization header when user is authenticated', async () => {
      const authStore = useAuthStore()
      authStore.token = 'mock-jwt-token'

      const { fetchWithAuth } = useApi()
      fetchMock.mockResolvedValueOnce({ success: true })

      await fetchWithAuth('/api/members', {
        method: 'POST',
        headers: { 'X-Custom': 'header-value' }
      })

      expect(fetchMock).toHaveBeenCalledWith('/api/members', {
        method: 'POST',
        headers: {
          'X-Custom': 'header-value',
          Authorization: 'Bearer mock-jwt-token'
        }
      })
    })
  })

  describe('execute', () => {
    it('sets loading state and unwraps response.data when present', async () => {
      const { execute, data, loading, error } = useApi<{ id: number; name: string }>()
      const onSuccessSpy = vi.fn()

      const result = await execute(
        async () => ({ data: { id: 10, name: 'Alice' } }),
        { onSuccess: onSuccessSpy }
      )

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(data.value).toEqual({ id: 10, name: 'Alice' })
      expect(onSuccessSpy).toHaveBeenCalledWith({ data: { id: 10, name: 'Alice' } })
      expect(result).toEqual({ data: { id: 10, name: 'Alice' } })
    })

    it('stores raw response when response does not contain a data property', async () => {
      const { execute, data } = useApi<string[]>()

      await execute(async () => ['item1', 'item2'])

      expect(data.value).toEqual(['item1', 'item2'])
    })

    it('handles failure, sets error state, triggers onError, and rethrows', async () => {
      const { execute, data, loading, error } = useApi()
      const onErrorSpy = vi.fn()
      const testError = new Error('Server connection lost')

      await expect(
        execute(
          async () => {
            throw testError
          },
          { onError: onErrorSpy }
        )
      ).rejects.toThrow('Server connection lost')

      expect(loading.value).toBe(false)
      expect(data.value).toBeNull()
      expect(error.value).toBe('Server connection lost')
      expect(onErrorSpy).toHaveBeenCalledWith(testError)
    })
  })

  describe('mutate', () => {
    it('manages isMutating state and pushes success notification on successful mutation', async () => {
      const { mutate, isMutating, error } = useApi()
      const onSuccessSpy = vi.fn()
      const successPayload = { updated: true }

      const outcome = await mutate(
        async () => successPayload,
        {
          successMessage: 'Member saved successfully',
          onSuccess: onSuccessSpy
        }
      )

      expect(outcome).toBe(true)
      expect(isMutating.value).toBe(false)
      expect(error.value).toBeNull()
      expect(onSuccessSpy).toHaveBeenCalledWith(successPayload)
      expect((globalThis as unknown as { push: { success: ReturnType<typeof vi.fn> } }).push.success)
        .toHaveBeenCalledWith('Member saved successfully')
    })

    it('catches failure, displays error notification, and returns false without throwing', async () => {
      const { mutate, isMutating, error } = useApi()
      const testError = new Error('Failed to update')

      const outcome = await mutate(
        async () => {
          throw testError
        },
        {
          errorMessage: 'Custom failure message'
        }
      )

      expect(outcome).toBe(false)
      expect(isMutating.value).toBe(false)
      expect(error.value).toBe('Custom failure message')
      expect((globalThis as unknown as { push: { error: ReturnType<typeof vi.fn> } }).push.error)
        .toHaveBeenCalledWith('Custom failure message')
    })

    it('uses extracted error message when no custom errorMessage is provided', async () => {
      const { mutate, error } = useApi()
      const testError = new Error('Validation failed on phone')

      const outcome = await mutate(async () => {
        throw testError
      })

      expect(outcome).toBe(false)
      expect(error.value).toBe('Validation failed on phone')
      expect((globalThis as unknown as { push: { error: ReturnType<typeof vi.fn> } }).push.error)
        .toHaveBeenCalledWith('Validation failed on phone')
    })
  })
})
