import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MemberAvatar from '../../app/components/MemberAvatar.vue'

describe('MemberAvatar.vue', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        backendUrl: '',
        apiBase: '/api'
      }
    }))
  })

  describe('initials fallback', () => {
    it('displays "MB" when member is null or undefined', () => {
      const wrapper = mount(MemberAvatar, {
        props: { member: null }
      })
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toBe('MB')
    })

    it('computes uppercase initials from first and last name', () => {
      const wrapper = mount(MemberAvatar, {
        props: {
          member: { first_name: 'fatima', last_name: 'omar' }
        }
      })
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toBe('FO')
    })

    it('handles single name or missing last name', () => {
      const wrapper = mount(MemberAvatar, {
        props: {
          member: { first_name: 'khalid' }
        }
      })
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toBe('K')
    })

    it('falls back to "MB" when names are empty strings', () => {
      const wrapper = mount(MemberAvatar, {
        props: {
          member: { first_name: '', last_name: '' }
        }
      })
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toBe('MB')
    })
  })

  describe('photo rendering and URL formatting', () => {
    it('renders <img> when photo property is provided', () => {
      const wrapper = mount(MemberAvatar, {
        props: {
          member: { first_name: 'Ali', photo: 'uploads/members/ali.jpg' }
        }
      })
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('/uploads/members/ali.jpg')
      expect(img.attributes('alt')).toBe('Ali')
    })

    it('supports alternative photo fields (picture, photo_url, avatar)', () => {
      const wrapperPicture = mount(MemberAvatar, {
        props: { member: { picture: 'https://example.com/pic.jpg' } }
      })
      expect(wrapperPicture.find('img').attributes('src')).toBe('https://example.com/pic.jpg')

      const wrapperPhotoUrl = mount(MemberAvatar, {
        props: { member: { photo_url: 'https://example.com/photo_url.jpg' } }
      })
      expect(wrapperPhotoUrl.find('img').attributes('src')).toBe('https://example.com/photo_url.jpg')

      const wrapperAvatar = mount(MemberAvatar, {
        props: { member: { avatar: 'https://example.com/avatar.jpg' } }
      })
      expect(wrapperAvatar.find('img').attributes('src')).toBe('https://example.com/avatar.jpg')
    })

    it('preserves data: and blob: URLs without prepending base', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const wrapperData = mount(MemberAvatar, {
        props: { member: { photo: dataUri } }
      })
      expect(wrapperData.find('img').attributes('src')).toBe(dataUri)

      const blobUri = 'blob:http://localhost:3000/12345-6789'
      const wrapperBlob = mount(MemberAvatar, {
        props: { member: { photo: blobUri } }
      })
      expect(wrapperBlob.find('img').attributes('src')).toBe(blobUri)
    })

    it('prepends backendUrl when configured in public runtime config', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          backendUrl: 'https://backend.amms.org/'
        }
      }))

      const wrapper = mount(MemberAvatar, {
        props: {
          member: { photo: 'storage/photos/member-1.jpg' }
        }
      })
      expect(wrapper.find('img').attributes('src')).toBe('https://backend.amms.org/storage/photos/member-1.jpg')
    })

    it('derives backendUrl from absolute apiBase by stripping /api', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          apiBase: 'https://api.amms.org/api'
        }
      }))

      const wrapper = mount(MemberAvatar, {
        props: {
          member: { photo: '/storage/avatar.jpg' }
        }
      })
      expect(wrapper.find('img').attributes('src')).toBe('https://api.amms.org/storage/avatar.jpg')
    })

    it('attaches cache-busting timestamp param when updated_at is present', () => {
      const wrapper = mount(MemberAvatar, {
        props: {
          member: {
            photo: '/uploads/photo.jpg',
            updated_at: '2026-09-22 10:00:00'
          }
        }
      })
      expect(wrapper.find('img').attributes('src')).toBe('/uploads/photo.jpg?v=2026-09-22%2010%3A00%3A00')
    })

    it('sanitizes private LAN IP in photo path and resolves via backend base', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          apiBase: '/backend/api'
        }
      }))

      const wrapper = mount(MemberAvatar, {
        props: {
          member: {
            photo: 'http://192.168.100.100/amms/public/uploads/members/7.webp',
            updated_at: '2026-09-21 13:12:30'
          }
        }
      })
      const src = wrapper.find('img').attributes('src')
      expect(src).toBe('/backend/uploads/members/7.webp?v=2026-09-21%2013%3A12%3A30')
      expect(src).not.toContain('192.168.100.100')
    })

    it('derives backend base from relative apiBase /backend/api', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          apiBase: '/backend/api'
        }
      }))

      const wrapper = mount(MemberAvatar, {
        props: {
          member: { photo: 'uploads/members/4.webp' }
        }
      })
      expect(wrapper.find('img').attributes('src')).toBe('/backend/uploads/members/4.webp')
    })

    it('attaches cache-busting param with & when url already contains ?', () => {
      const wrapper = mount(MemberAvatar, {
        props: {
          member: {
            photo: 'https://s3.amazonaws.com/bucket/photo.jpg?auth=token',
            updated_at: '2026'
          }
        }
      })
      expect(wrapper.find('img').attributes('src')).toBe('https://s3.amazonaws.com/bucket/photo.jpg?auth=token&v=2026')
    })
  })

  describe('error handling and recovery', () => {
    it('switches to initials fallback when image triggers error event', async () => {
      const wrapper = mount(MemberAvatar, {
        props: {
          member: {
            id: 1,
            first_name: 'Zahra',
            last_name: 'Hassan',
            photo: '/missing.jpg'
          }
        }
      })

      expect(wrapper.find('img').exists()).toBe(true)

      // Trigger image error
      await wrapper.find('img').trigger('error')

      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toBe('ZH')
    })

    it('resets photo error when member prop is updated', async () => {
      const wrapper = mount(MemberAvatar, {
        props: {
          member: {
            id: 1,
            first_name: 'Zahra',
            photo: '/bad-photo.jpg'
          }
        }
      })

      // Trigger error
      await wrapper.find('img').trigger('error')
      expect(wrapper.find('img').exists()).toBe(false)

      // Update member with a new photo
      await wrapper.setProps({
        member: {
          id: 1,
          first_name: 'Zahra',
          photo: '/new-photo.jpg',
          updated_at: '2026-09-22T08:30:00Z'
        }
      })

      // Photo error is reset and img element is restored
      expect(wrapper.find('img').exists()).toBe(true)
      expect(wrapper.find('img').attributes('src')).toContain('/new-photo.jpg')
    })
  })
})
