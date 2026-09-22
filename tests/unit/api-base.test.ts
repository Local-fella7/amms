import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useApiBase, apiUrl } from '../../app/composables/useApiBase'

describe('useApiBase & apiUrl', () => {
  describe('apiUrl', () => {
    it('returns already-absolute HTTP and HTTPS URLs untouched', () => {
      expect(apiUrl('https://external-api.com/v1/data', '/api')).toBe('https://external-api.com/v1/data')
      expect(apiUrl('http://localhost:8000/api/members', '/api')).toBe('http://localhost:8000/api/members')
    })

    it('replaces /api prefix with base URL', () => {
      expect(apiUrl('/api/members', '/api')).toBe('/api/members')
      expect(apiUrl('/api/members', '/backend/api')).toBe('/backend/api/members')
      expect(apiUrl('/api/fees/1', 'https://api.example.com')).toBe('https://api.example.com/fees/1')
    })

    it('handles paths without leading slash', () => {
      expect(apiUrl('api/members', '/api')).toBe('/api/members')
      expect(apiUrl('members', '/api')).toBe('/api/members')
      expect(apiUrl('members', '/backend/api')).toBe('/backend/api/members')
    })

    it('handles root /api endpoint', () => {
      expect(apiUrl('/api', '/backend/api')).toBe('/backend/api')
      expect(apiUrl('/api/', '/backend/api')).toBe('/backend/api/')
    })

    it('handles root path /', () => {
      expect(apiUrl('/', '/backend/api')).toBe('/backend/api/')
    })
  })

  describe('useApiBase', () => {
    beforeEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns /api by default if no apiBase is configured', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {}
      }))
      expect(useApiBase()).toBe('/api')
    })

    it('strips trailing slashes from configured apiBase', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          apiBase: '/custom/api///'
        }
      }))
      expect(useApiBase()).toBe('/custom/api')
    })

    it('returns custom relative apiBase in any mode', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          apiBase: '/backend/api'
        }
      }))
      expect(useApiBase()).toBe('/backend/api')
    })
  })
})
