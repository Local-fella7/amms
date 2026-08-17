import { ref } from 'vue'
import { useAuthStore } from '~/stores/useAuthStore'

export function useReportPdf() {
  const authStore = useAuthStore()
  const isGenerating = ref(false)
  const reportError = ref<string | null>(null)

  const downloadPdf = async (url: string, defaultFilename = 'report.pdf') => {
    isGenerating.value = true
    reportError.value = null
    try {
      const token = authStore.token
      const blob = await $fetch<Blob>(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob' as any
      })
      
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', defaultFilename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
      return true
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to download PDF report'
      reportError.value = msg
      console.error('PDF download error:', err)
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  const getPdfBlobUrl = async (url: string): Promise<string> => {
    isGenerating.value = true
    reportError.value = null
    try {
      const token = authStore.token
      const blob = await $fetch<Blob>(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob' as any
      })
      return window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to preview PDF report'
      reportError.value = msg
      console.error('PDF preview error:', err)
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  const openPdfInNewTab = async (url: string) => {
    isGenerating.value = true
    reportError.value = null
    try {
      const token = authStore.token
      // Remove download=1 from URL query if present, so backend sets inline Content-Disposition
      const cleanUrl = url.replace(/([?&])download=1(&?)/, (match, p1, p2) => p2 ? p1 : '')
      const blob = await $fetch<Blob>(cleanUrl, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob' as any
      })
      
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      window.open(blobUrl, '_blank')
      return true
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to open PDF report'
      reportError.value = msg
      console.error('PDF open error:', err)
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  return {
    isGenerating,
    reportError,
    downloadPdf,
    getPdfBlobUrl,
    openPdfInNewTab
  }
}
