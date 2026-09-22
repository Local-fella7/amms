import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { optimizeImageFile, resolveAssetUrl } from '../../app/utils/image'

describe('optimizeImageFile', () => {
  it('returns small files (<= 1MB) directly without processing', async () => {
    const smallContent = new Uint8Array(500 * 1024) // 500 KB
    const smallFile = new File([smallContent], 'avatar.jpg', { type: 'image/jpeg' })

    const result = await optimizeImageFile(smallFile)
    expect(result).toBe(smallFile)
  })

  describe('large files (> 1MB)', () => {
    let originalFileReader: typeof FileReader
    let originalImage: typeof Image
    let originalCreateElement: typeof document.createElement

    beforeEach(() => {
      originalFileReader = globalThis.FileReader
      originalImage = globalThis.Image
      originalCreateElement = document.createElement.bind(document)
    })

    afterEach(() => {
      globalThis.FileReader = originalFileReader
      globalThis.Image = originalImage
      document.createElement = originalCreateElement
      vi.restoreAllMocks()
    })

    const setupMocks = (options: {
      imgWidth: number
      imgHeight: number
      hasContext?: boolean
      hasBlob?: boolean
      triggerReaderError?: boolean
      triggerImgError?: boolean
    }) => {
      const {
        imgWidth,
        imgHeight,
        hasContext = true,
        hasBlob = true,
        triggerReaderError = false,
        triggerImgError = false
      } = options

      // Mock FileReader
      class MockFileReader {
        onload: ((e: { target: { result: string } }) => void) | null = null
        onerror: (() => void) | null = null
        readAsDataURL() {
          setTimeout(() => {
            if (triggerReaderError) {
              this.onerror?.()
            } else {
              this.onload?.({ target: { result: 'data:image/jpeg;base64,mockdata' } })
            }
          }, 0)
        }
      }
      globalThis.FileReader = MockFileReader as unknown as typeof FileReader

      // Mock Image
      class MockImage {
        width = imgWidth
        height = imgHeight
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        private _src = ''

        get src() {
          return this._src
        }
        set src(val: string) {
          this._src = val
          setTimeout(() => {
            if (triggerImgError) {
              this.onerror?.()
            } else {
              this.onload?.()
            }
          }, 0)
        }
      }
      globalThis.Image = MockImage as unknown as typeof Image

      // Mock Canvas
      const drawImageSpy = vi.fn()
      const mockCtx = hasContext
        ? {
            drawImage: drawImageSpy
          }
        : null

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockCtx,
            toBlob: (cb: (b: Blob | null) => void, mime: string, _q: number) => {
              if (hasBlob) {
                cb(new Blob(['processed-image-data'], { type: mime }))
              } else {
                cb(null)
              }
            }
          } as unknown as HTMLCanvasElement
        }
        return originalCreateElement(tagName)
      }) as unknown as typeof document.createElement

      return { drawImageSpy }
    }

    it('downscales wide landscape images (width > height)', async () => {
      setupMocks({ imgWidth: 2400, imgHeight: 1200 })
      const largeContent = new Uint8Array(1.5 * 1024 * 1024)
      const largeFile = new File([largeContent], 'landscape.jpg', { type: 'image/jpeg' })

      const result = await optimizeImageFile(largeFile, 1200)
      expect(result).not.toBe(largeFile)
      expect(result.name).toBe('landscape.jpg')
      expect(result.type).toBe('image/jpeg')
    })

    it('downscales tall portrait images (height > width)', async () => {
      setupMocks({ imgWidth: 1000, imgHeight: 2000 })
      const largeContent = new Uint8Array(1.5 * 1024 * 1024)
      const largeFile = new File([largeContent], 'portrait.png', { type: 'image/png' })

      const result = await optimizeImageFile(largeFile, 1000)
      expect(result).not.toBe(largeFile)
      expect(result.name).toBe('portrait.png')
      expect(result.type).toBe('image/png')
    })

    it('recompresses images within maxDimension without scaling', async () => {
      setupMocks({ imgWidth: 800, imgHeight: 600 })
      const largeContent = new Uint8Array(1.2 * 1024 * 1024)
      const largeFile = new File([largeContent], 'dense.jpg', { type: 'image/jpeg' })

      const result = await optimizeImageFile(largeFile, 1200)
      expect(result).not.toBe(largeFile)
      expect(result.name).toBe('dense.jpg')
    })

    it('converts non-PNG files to JPEG name and type', async () => {
      setupMocks({ imgWidth: 1600, imgHeight: 1200 })
      const largeContent = new Uint8Array(1.5 * 1024 * 1024)
      const largeFile = new File([largeContent], 'photo.webp', { type: 'image/webp' })

      const result = await optimizeImageFile(largeFile, 1200)
      expect(result.name).toBe('photo.jpg')
      expect(result.type).toBe('image/jpeg')
    })

    it('returns original file if canvas context is unavailable', async () => {
      setupMocks({ imgWidth: 2000, imgHeight: 1500, hasContext: false })
      const largeContent = new Uint8Array(1.5 * 1024 * 1024)
      const largeFile = new File([largeContent], 'photo.jpg', { type: 'image/jpeg' })

      const result = await optimizeImageFile(largeFile)
      expect(result).toBe(largeFile)
    })

    it('returns original file if canvas.toBlob returns null', async () => {
      setupMocks({ imgWidth: 2000, imgHeight: 1500, hasBlob: false })
      const largeContent = new Uint8Array(1.5 * 1024 * 1024)
      const largeFile = new File([largeContent], 'photo.jpg', { type: 'image/jpeg' })

      const result = await optimizeImageFile(largeFile)
      expect(result).toBe(largeFile)
    })

    it('returns original file if FileReader triggers error', async () => {
      setupMocks({ imgWidth: 2000, imgHeight: 1500, triggerReaderError: true })
      const largeContent = new Uint8Array(1.5 * 1024 * 1024)
      const largeFile = new File([largeContent], 'corrupt.jpg', { type: 'image/jpeg' })

      const result = await optimizeImageFile(largeFile)
      expect(result).toBe(largeFile)
    })

    it('returns original file if Image triggers error', async () => {
      setupMocks({ imgWidth: 2000, imgHeight: 1500, triggerImgError: true })
      const largeContent = new Uint8Array(1.5 * 1024 * 1024)
      const largeFile = new File([largeContent], 'corrupt.jpg', { type: 'image/jpeg' })

      const result = await optimizeImageFile(largeFile)
      expect(result).toBe(largeFile)
    })
  })

  describe('resolveAssetUrl', () => {
    beforeEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns empty string for null, undefined, or empty path', () => {
      expect(resolveAssetUrl(null)).toBe('')
      expect(resolveAssetUrl(undefined)).toBe('')
      expect(resolveAssetUrl('')).toBe('')
      expect(resolveAssetUrl('   ')).toBe('')
    })

    it('preserves data: and blob: URLs untouched', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgo='
      const blobUri = 'blob:https://asa.or.tz/123-abc'
      expect(resolveAssetUrl(dataUri)).toBe(dataUri)
      expect(resolveAssetUrl(blobUri)).toBe(blobUri)
    })

    it('sanitizes private LAN IP URLs containing /uploads/', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          apiBase: '/backend/api'
        }
      }))

      const rawLanUrl = 'http://192.168.100.100/amms/public/uploads/members/7.webp'
      const resolved = resolveAssetUrl(rawLanUrl)
      expect(resolved).toBe('/backend/uploads/members/7.webp')
      expect(resolved).not.toContain('192.168.100.100')
      expect(resolved).not.toContain('amms/public')
    })

    it('appends cache buster using updatedAt and timestamp', () => {
      expect(resolveAssetUrl('uploads/logo.jpg', { updatedAt: '2026-09-22 10:00:00' }))
        .toContain('?v=2026-09-22%2010%3A00%3A00')

      expect(resolveAssetUrl('/backend/logo.jpg?foo=bar', { timestamp: 12345 }))
        .toContain('&v=12345')
    })

    it('strips "amms/public/" if present in relative path', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          apiBase: '/backend/api'
        }
      }))
      expect(resolveAssetUrl('amms/public/uploads/members/5.webp'))
        .toBe('/backend/uploads/members/5.webp')
    })

    it('upgrades http: to https: when window.location.protocol is https:', () => {
      const origLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', hostname: 'asa.or.tz' },
        writable: true,
        configurable: true
      })

      const result = resolveAssetUrl('http://cdn.example.com/logo.png')
      expect(result).toBe('https://cdn.example.com/logo.png')

      Object.defineProperty(window, 'location', {
        value: origLocation,
        writable: true,
        configurable: true
      })
    })
  })
})

