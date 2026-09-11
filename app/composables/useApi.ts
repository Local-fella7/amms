import { ref } from 'vue'
import { useAuthStore } from '~/stores/useAuthStore'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>() {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)
  const authStore = useAuthStore()

  const fetchWithAuth = (url: string, opts: any = {}) => {
    const headers = { ...opts.headers }
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }
    return $fetch(url, { ...opts, headers })
  }

  const execute = async (
    requestFn: (apiFetch: typeof $fetch) => Promise<any>,
    options?: { onSuccess?: (res: any) => void; onError?: (err: any) => void }
  ) => {
    loading.value = true
    error.value = null
    try {
      const response = await requestFn(fetchWithAuth as any)
      data.value = response?.data !== undefined ? response.data : response
      if (options?.onSuccess) options.onSuccess(response)
      return response
    } catch (err: any) {
      const message = err?.data?.message || err?.response?._data?.message || err?.message || 'An unexpected error occurred'
      error.value = message
      if (options?.onError) options.onError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Helper for mutation actions (POST, PUT, DELETE). 
   * Wraps execute, catches errors, and pushes notivue notifications automatically.
   * Returns a boolean indicating success.
   */
  const mutate = async (
    requestFn: (apiFetch: typeof $fetch) => Promise<any>,
    options?: { successMessage?: string, errorMessage?: string, onSuccess?: (res: any) => void }
  ): Promise<boolean> => {
    isMutating.value = true
    error.value = null
    try {
      const response = await requestFn(fetchWithAuth as any)
      if (options?.successMessage) push.success(options.successMessage)
      if (options?.onSuccess) options.onSuccess(response)
      return true
    } catch (err: any) {
      const message = err?.data?.message || err?.response?._data?.message || err?.message || options?.errorMessage || 'An unexpected error occurred'
      error.value = message
      push.error(message)
      return false
    } finally {
      isMutating.value = false
    }
  }

  return {
    data,
    isMutating,
    loading,
    error,
    execute,
    mutate,
    fetchWithAuth
  }
}


