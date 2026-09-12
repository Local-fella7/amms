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

  const fetchWithAuth = <R = unknown>(url: string, opts: Record<string, unknown> = {}) => {
    const headers: Record<string, string> = { ...((opts.headers as Record<string, string>) || {}) }
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }
    return $fetch<R>(url, { ...opts, headers })
  }

  const execute = async <R = T>(
    requestFn: (apiFetch: typeof $fetch) => Promise<R>,
    options?: { onSuccess?: (res: R) => void; onError?: (err: unknown) => void }
  ) => {
    loading.value = true
    error.value = null
    try {
      const response = await requestFn(fetchWithAuth as unknown as typeof $fetch)
      data.value = (response as { data?: T })?.data !== undefined ? (response as { data: T }).data : (response as unknown as T)
      if (options?.onSuccess) options.onSuccess(response)
      return response
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'An unexpected error occurred')
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
  const mutate = async <R = unknown>(
    requestFn: (apiFetch: typeof $fetch) => Promise<R>,
    options?: { successMessage?: string, errorMessage?: string, onSuccess?: (res: R) => void }
  ): Promise<boolean> => {
    isMutating.value = true
    error.value = null
    try {
      const response = await requestFn(fetchWithAuth as unknown as typeof $fetch)
      if (options?.successMessage) push.success(options.successMessage)
      if (options?.onSuccess) options.onSuccess(response)
      return true
    } catch (err: unknown) {
      const message = options?.errorMessage || extractErrorMessage(err, 'An unexpected error occurred')
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


