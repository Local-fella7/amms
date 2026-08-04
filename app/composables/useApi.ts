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

  return {
    data,
    loading,
    error,
    execute,
    fetchWithAuth
  }
}

