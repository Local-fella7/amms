/**
 * Resize and compress an image file before upload.
 * Ensures uploaded photos never exceed backend upload size limits (e.g. PHP 2MB upload_max_filesize).
 */
export async function optimizeImageFile(file: File, maxDimension = 1200, quality = 0.85): Promise<File> {
  // If file is already small (under 1MB), return as is
  if (file.size <= 1024 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^.]+$/, mimeType === 'image/png' ? '.png' : '.jpg')
            const optimized = new File([blob], cleanName, {
              type: mimeType,
              lastModified: Date.now()
            })
            resolve(optimized)
          },
          mimeType,
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

/**
 * Safely resolve photo, logo, and uploaded asset URLs for browser display.
 * Prevents Mixed Content security blocks (HTTP on HTTPS), strips internal LAN IPs,
 * and ensures assets map to the correct backend uploads directory.
 */
export function resolveAssetUrl(
  path?: string | null,
  options?: { updatedAt?: string; timestamp?: number | string }
): string {
  if (!path) return ''

  const cleanTrimmed = path.trim()
  if (!cleanTrimmed) return ''

  // Data URLs and blob URLs (e.g. fresh local file selections) pass through untouched
  if (cleanTrimmed.startsWith('data:') || cleanTrimmed.startsWith('blob:')) {
    return cleanTrimmed
  }

  const isClient = typeof window !== 'undefined'
  const isHttps = isClient && window.location?.protocol === 'https:'

  let clean = cleanTrimmed

  // Detect URLs containing internal/private IPs (e.g., 192.168.x.x, 10.x.x.x, 127.0.0.1)
  // or old dev server paths like http://192.168.100.100/amms/public/uploads/...
  const hasPrivateIp = /(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|127\.0\.0\.1|localhost)/i.test(clean)
  if (hasPrivateIp) {
    const uploadsIndex = clean.indexOf('/uploads/')
    if (uploadsIndex !== -1) {
      clean = clean.substring(uploadsIndex + 1) // "uploads/members/7.webp"
    } else if (isHttps && isClient && !['localhost', '127.0.0.1'].includes(window.location?.hostname || '')) {
      // Insecure LAN IP without /uploads/ on public HTTPS domain cannot be reached
      return ''
    }
  }

  // If path is already a valid absolute HTTP/HTTPS URL
  if (/^https?:\/\//i.test(clean)) {
    // If the page is on HTTPS, upgrade http: to https: to avoid Mixed Content
    if (isHttps && clean.startsWith('http://')) {
      clean = clean.replace(/^http:\/\//i, 'https://')
    }
    return appendCacheBuster(clean, options)
  }

  // Strip leading slashes
  clean = clean.replace(/^\/+/, '')

  // If path was saved as "amms/public/uploads/...", strip the "amms/public/" prefix
  clean = clean.replace(/^amms\/public\//i, '')

  // Determine the backend base URL
  let base = ''
  try {
    const config = useRuntimeConfig()
    const configuredBackend = (config?.public?.backendUrl as string) || ''
    const configuredApi = (config?.public?.apiBase as string) || ''

    if (configuredBackend) {
      const isPrivateBackend = /(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|127\.0\.0\.1|localhost)/.test(configuredBackend)
      const isInsecureHttp = isHttps && configuredBackend.startsWith('http://')
      if (!(isHttps && isPrivateBackend) && !isInsecureHttp) {
        base = configuredBackend.replace(/\/+$/, '')
      }
    }

    if (!base && configuredApi) {
      if (/^https?:\/\//i.test(configuredApi)) {
        base = configuredApi.replace(/\/api\/?$/, '')
      } else if (configuredApi.startsWith('/')) {
        const stripped = configuredApi.replace(/\/api\/?$/, '')
        base = stripped || ''
      }
    }
  } catch {
    // Fallback if runtimeConfig is unavailable
  }

  // Fallback for public production host (like asa.or.tz) where backend is at /backend
  if (!base && isClient && window.location?.hostname?.includes('asa.or.tz')) {
    base = '/backend'
  }

  // Avoid duplicate backend segment if path already starts with backend/
  if (base.endsWith('/backend') && clean.startsWith('backend/')) {
    clean = clean.replace(/^backend\//i, '')
  }

  let finalUrl = base ? `${base}/${clean}` : `/${clean}`

  // Ensure leading slash for relative paths
  if (!finalUrl.startsWith('http') && !finalUrl.startsWith('/')) {
    finalUrl = `/${finalUrl}`
  }

  return appendCacheBuster(finalUrl, options)
}

function appendCacheBuster(url: string, options?: { updatedAt?: string; timestamp?: number | string }): string {
  const version = options?.updatedAt || options?.timestamp
  if (!version) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(String(version))}`
}

